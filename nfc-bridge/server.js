const express = require('express');
const cors = require('cors');
const pcsclite = require('pcsclite');

const app = express();
const PORT = 3001;

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
  });

  // Set as current reader if none selected
  if (!currentReader) {
    currentReader = reader;
  }
});

pcsc.on('error', (err) => {
  console.error('❌ PC/SC Error:', err.message);
});

// Helper function to read card UID
function readCardUID(reader) {
  return new Promise((resolve, reject) => {
    // Check if reader is available
    if (!reader) {
      return reject(new Error('No reader available'));
    }

    reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
      if (err) {
        // Check for specific error codes
        const errorCode = err.message || '';
        
        // Card removed error (0x80100069)
        if (errorCode.includes('0x80100069') || errorCode.includes('fjernet')) {
          return reject(new Error('CARD_REMOVED'));
        }
        
        // Card not present
        if (errorCode.includes('0x8010000C') || errorCode.includes('No smartcard')) {
          return reject(new Error('NO_CARD'));
        }
        
        return reject(new Error('Failed to connect to card: ' + err.message));
      }

      // APDU command to get UID (works with most ISO 14443A cards)
      const getUID = Buffer.from([
        0xFF, 0xCA, 0x00, 0x00, 0x00  // Get Data command for UID
      ]);

      reader.transmit(getUID, 255, protocol, (err, data) => {
        if (err) {
          reader.disconnect(reader.SCARD_LEAVE_CARD, () => {});
          
          const errorCode = err.message || '';
          if (errorCode.includes('0x80100069') || errorCode.includes('fjernet')) {
            return reject(new Error('CARD_REMOVED'));
          }
          
          return reject(new Error('Failed to read UID: ' + err.message));
        }

        // Check response
        if (data.length < 2) {
          reader.disconnect(reader.SCARD_LEAVE_CARD, () => {});
          return reject(new Error('Invalid response from card'));
        }

        // Last 2 bytes are status word (should be 90 00 for success)
        const sw1 = data[data.length - 2];
        const sw2 = data[data.length - 1];

        if (sw1 !== 0x90 || sw2 !== 0x00) {
          reader.disconnect(reader.SCARD_LEAVE_CARD, () => {});
          return reject(new Error(`Card returned error: ${sw1.toString(16)} ${sw2.toString(16)}`));
        }

        // UID is everything except last 2 bytes (status word)
        const uid = data.slice(0, data.length - 2);
        const uidHex = Array.from(uid)
          .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(':');

        reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
          if (err) console.error('Error disconnecting:', err);
        });

        resolve({
          uid: uidHex,
          raw: uid,
          length: uid.length
        });
      });
    });
  });
}

// Routes

// Get list of available readers
app.get('/api/readers', (req, res) => {
  res.json({
    readers: readers.map(r => r.name),
    count: readers.length
  });
});

// Get server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    readersConnected: readers.length,
    currentReader: currentReader ? currentReader.name : null
  });
});

// Scan for card
app.post('/api/scan', async (req, res) => {
  if (!currentReader) {
    return res.status(503).json({
      success: false,
      error: 'No card reader available'
    });
  }

  try {
    const cardData = await readCardUID(currentReader);
    
    res.json({
      success: true,
      cardId: cardData.uid,
      length: cardData.length,
      reader: currentReader.name
    });
  } catch (error) {
    console.error('Scan error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
