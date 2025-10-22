require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pcsclite = require('pcsclite');

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;
const SCAN_TIMEOUT = parseInt(process.env.SCAN_TIMEOUT) || 5000; // 5 seconds default

// Middleware
app.use(cors());
app.use(express.json());

// PC/SC Context
const pcsc = pcsclite();
let readers = [];
let currentReader = null;

// Initialize PC/SC
pcsc.on('reader', (reader) => {
  console.log('📱 New reader detected:', reader.name);
  
  if (!readers.find(r => r.name === reader.name)) {
    readers.push(reader);
  }

  reader.on('error', (err) => {
    console.error('❌ Reader error:', err.message);
  });

  reader.on('status', (status) => {
    const changes = reader.state ^ status.state;
    
    if (changes) {
      if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
        console.log('📤 Card removed');
        reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
          if (err) console.error('Error disconnecting:', err);
        });
      } else if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
        console.log('📥 Card inserted');
      }
    }
  });

  reader.on('end', () => {
    console.log('Reader removed:', reader.name);
    readers = readers.filter(r => r.name !== reader.name);
    
    // If current reader was removed, select another one
    if (currentReader && currentReader.name === reader.name) {
      currentReader = readers.length > 0 ? readers[0] : null;
      if (currentReader) {
        console.log('📱 Switched to reader:', currentReader.name);
      } else {
        console.log('⚠️ No readers available');
      }
    }
  });

  // Set as current reader if none selected
  if (!currentReader) {
    currentReader = reader;
    console.log('✅ Current reader set to:', reader.name);
  }
});

pcsc.on('error', (err) => {
  console.error('❌ PC/SC Error:', err.message);
});

// Helper function to read card UID with timeout
function readCardUID(reader, timeout = SCAN_TIMEOUT) {
  return new Promise((resolve, reject) => {
    // Check if reader is available
    if (!reader) {
      return reject(new Error('NO_READER'));
    }

    let isConnected = false;
    let timeoutHandle = null;
    let isResolved = false;
    
    // Set timeout
    timeoutHandle = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.warn('⏱️ Scan timeout reached');
        safeDisconnect(() => reject(new Error('TIMEOUT')));
      }
    }, timeout);
    
    // Helper to ensure we always disconnect and clear timeout
    const safeDisconnect = (callback) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      
      if (isConnected) {
        reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
          isConnected = false;
          if (err) console.error('⚠️ Disconnect error:', err.message);
          if (callback) callback();
        });
      } else if (callback) {
        callback();
      }
    };

    reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
      if (isResolved) return; // Already timed out
      
      if (err) {
        isResolved = true;
        // Check for specific error codes
        const errorCode = err.message || '';
        
        // Card removed error (0x80100069)
        if (errorCode.includes('0x80100069') || errorCode.includes('fjernet')) {
          return safeDisconnect(() => reject(new Error('CARD_REMOVED')));
        }
        
        // Reader busy/not available (0x80100017)
        if (errorCode.includes('0x80100017') || errorCode.includes('ikke tilgjengelig')) {
          return safeDisconnect(() => reject(new Error('NO_CARD')));
        }
        
        // Card not present, invalid handle, or device not responding (0x8010000C, 0x80100003, 0x0000001f)
        if (errorCode.includes('0x8010000C') || errorCode.includes('0x80100003') || 
            errorCode.includes('0x0000001f') || errorCode.includes('No smartcard') || 
            errorCode.includes('referansen var ugyldig') || errorCode.includes('virker ikke')) {
          return safeDisconnect(() => reject(new Error('NO_CARD')));
        }
        
        return safeDisconnect(() => reject(new Error('CONNECT_ERROR')));
      }

      // Mark as connected - we MUST disconnect later
      isConnected = true;

      // APDU command to get UID (works with most ISO 14443A cards)
      const getUID = Buffer.from([
        0xFF, 0xCA, 0x00, 0x00, 0x00  // Get Data command for UID
      ]);

      // Ensure protocol is a number (pcsclite SCARD_PROTOCOL_T1 = 2)
      const pcscProtocol = (typeof protocol === 'number' && protocol > 0) ? protocol : 2;
      
      reader.transmit(getUID, 40, pcscProtocol, (err, data) => {
        if (isResolved) return; // Already timed out
        
        // ALWAYS disconnect, even on error
        if (err) {
          isResolved = true;
          const errorCode = err.message || '';
          
          let errorType = 'TRANSMIT_ERROR';
          if (errorCode.includes('0x80100069') || errorCode.includes('fjernet')) {
            errorType = 'CARD_REMOVED';
          } else if (errorCode.includes('0x80100003') || errorCode.includes('0x8010000C') || 
                     errorCode.includes('0x0000001f') || errorCode.includes('referansen var ugyldig') ||
                     errorCode.includes('virker ikke')) {
            errorType = 'NO_CARD';
          }
          
          return safeDisconnect(() => reject(new Error(errorType)));
        }

        if (isResolved) return; // Already timed out
        isResolved = true;
        
        // Check response
        if (data.length < 2) {
          return safeDisconnect(() => reject(new Error('INVALID_RESPONSE')));
        }

        // Last 2 bytes are status word (should be 90 00 for success)
        const sw1 = data[data.length - 2];
        const sw2 = data[data.length - 1];

        if (sw1 !== 0x90 || sw2 !== 0x00) {
          return safeDisconnect(() => reject(new Error('CARD_ERROR')));
        }

        // UID is everything except last 2 bytes (status word)
        const uid = data.slice(0, data.length - 2);
        const uidHex = Array.from(uid)
          .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(':');

        // Disconnect and resolve with card data
        safeDisconnect(() => resolve({ uid: uidHex, length: uid.length }));
      });
    });
  });
}

// Helper function to map error codes to user-friendly messages
function getErrorMessage(errorCode) {
  const errorMessages = {
    'NO_READER': 'Ingen kortleser tilgjengelig',
    'NO_CARD': 'Intet kort påvist',
    'CARD_REMOVED': 'Intet kort påvist',
    'TIMEOUT': 'Tidsavbrudd - kortet svarte ikke',
    'CONNECT_ERROR': 'Kunne ikke koble til kort',
    'TRANSMIT_ERROR': 'Feil ved kommunikasjon med kort',
    'INVALID_RESPONSE': 'Ugyldig svar fra kort',
    'CARD_ERROR': 'Kortet returnerte en feil'
  };
  
  return errorMessages[errorCode] || errorCode;
}

// Routes

// Get list of available readers
app.get('/api/readers', (req, res) => {
  try {
    res.json({
      readers: readers.map(r => r.name),
      count: readers.length,
      currentReader: currentReader ? currentReader.name : null
    });
  } catch (error) {
    console.error('Error getting readers:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Kunne ikke hente kortlesere'
    });
  }
});

// Get server status
app.get('/api/status', (req, res) => {
  try {
    res.json({
      status: 'ok',
      readersConnected: readers.length,
      currentReader: currentReader ? currentReader.name : null,
      pollingSupported: true,
      version: '1.1.0'
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Kunne ikke hente server status'
    });
  }
});

// Scan for card
app.post('/api/scan', async (req, res) => {
  // Check if reader is available
  if (!currentReader) {
    return res.status(503).json({
      success: false,
      error: 'NO_READER',
      message: getErrorMessage('NO_READER')
    });
  }

  // Note: We removed the isScanning lock to allow polling/continuous scanning
  // The PC/SC library handles concurrent access internally
  
  try {
    const cardData = await readCardUID(currentReader);
    
    res.json({
      success: true,
      uid: cardData.uid,
      cardId: cardData.uid,
      length: cardData.length,
      reader: currentReader.name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorCode = error.message;
    
    // Only log unexpected errors (not normal "no card" situations)
    if (errorCode !== 'NO_CARD' && errorCode !== 'CARD_REMOVED') {
      console.error('❌ Scan error:', error.message);
    }
    
    const statusCode = errorCode === 'NO_CARD' ? 404 : 
                       errorCode === 'CARD_REMOVED' ? 404 :
                       errorCode === 'TIMEOUT' ? 408 : 
                       errorCode === 'NO_READER' ? 503 : 400;
    
    res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: getErrorMessage(errorCode)
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  const hasReader = readers.length > 0;
  res.json({ 
    status: hasReader ? 'ok' : 'no_readers',
    healthy: true,
    readers: readers.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NFC Bridge Server running on http://localhost:${PORT}`);
  console.log(`📡 Waiting for card readers...`);
  console.log(`💡 Make sure ACS ACR1255U-J1 is connected via USB`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down NFC Bridge Server...');
  pcsc.close();
  process.exit(0);
});
