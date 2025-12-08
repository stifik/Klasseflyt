require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const pcsclite = require('pcsclite');

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;
const SCAN_TIMEOUT = parseInt(process.env.SCAN_TIMEOUT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// PC/SC Context
const pcsc = pcsclite();
let readers = [];
let currentReader = null;
let isMonitoring = false;
let monitoringClients = new Set();

// Broadcast to all connected WebSocket clients
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Initialize PC/SC
pcsc.on('reader', (reader) => {
  console.log('📱 New reader detected:', reader.name);

  // Check if reader with same name already exists
  const existingReaderIndex = readers.findIndex(r => r.name === reader.name);
  if (existingReaderIndex !== -1) {
    // Replace old reference with new one
    console.log('🔄 Updating existing reader reference:', reader.name);
    readers[existingReaderIndex] = reader;
    
    // Update currentReader if it was this reader
    if (currentReader && currentReader.name === reader.name) {
      currentReader = reader;
      console.log('🔄 Updated currentReader reference');
    }
  } else {
    readers.push(reader);
    broadcast({
      type: 'reader_connected',
      reader: reader.name,
      timestamp: new Date().toISOString()
    });
  }

  reader.on('error', (err) => {
    console.error('❌ Reader error:', err.message);
    broadcast({
      type: 'error',
      error: 'READER_ERROR',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  });

  reader.on('status', (status) => {
    const changes = reader.state ^ status.state;

    if (changes) {
      if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
        console.log('📤 Card removed');
        broadcast({
          type: 'card_removed',
          reader: reader.name,
          timestamp: new Date().toISOString()
        });
      } else if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
        console.log('📥 Card inserted');

        // Automatically read card when inserted (if monitoring is active)
        // Use name comparison instead of reference comparison to handle reconnects
        const isCurrentReader = currentReader && currentReader.name === reader.name;
        if (isMonitoring && isCurrentReader) {
          console.log('📖 Auto-reading card from:', reader.name);
          readAndBroadcastCard(reader);
        } else if (isMonitoring && !currentReader) {
          // If no current reader is set but we're monitoring, use this reader
          console.log('📖 No current reader, using:', reader.name);
          currentReader = reader;
          readAndBroadcastCard(reader);
        } else {
          console.log('⏸️ Card detected but not reading (monitoring:', isMonitoring, ', isCurrentReader:', isCurrentReader, ')');
        }
      }
    }
  });

  reader.on('end', () => {
    console.log('Reader removed:', reader.name);
    readers = readers.filter(r => r.name !== reader.name);

    broadcast({
      type: 'reader_disconnected',
      reader: reader.name,
      timestamp: new Date().toISOString()
    });

    // If current reader was removed, select another one
    if (currentReader && currentReader.name === reader.name) {
      currentReader = readers.length > 0 ? readers[0] : null;
      if (currentReader) {
        console.log('📱 Switched to reader:', currentReader.name);
        broadcast({
          type: 'reader_changed',
          reader: currentReader.name,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('⚠️ No readers available');
        broadcast({
          type: 'no_readers',
          timestamp: new Date().toISOString()
        });
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
  broadcast({
    type: 'error',
    error: 'PCSC_ERROR',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Read card and broadcast result
async function readAndBroadcastCard(reader) {
  try {
    const cardData = await readCardUID(reader);

    console.log('✅ Card read:', cardData.uid);
    broadcast({
      type: 'card_detected',
      uid: cardData.uid,
      cardId: cardData.uid,
      length: cardData.length,
      reader: reader.name,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorCode = error.message;

    // Only log and broadcast unexpected errors
    if (errorCode !== 'NO_CARD' && errorCode !== 'CARD_REMOVED') {
      console.error('❌ Read error:', errorCode);
      broadcast({
        type: 'error',
        error: errorCode,
        message: getErrorMessage(errorCode),
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Helper function to read card UID with timeout
function readCardUID(reader, timeout = SCAN_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (!reader) {
      return reject(new Error('NO_READER'));
    }

    let isConnected = false;
    let timeoutHandle = null;
    let isResolved = false;

    timeoutHandle = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.warn('⏱️ Scan timeout reached');
        safeDisconnect(() => reject(new Error('TIMEOUT')));
      }
    }, timeout);

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
      if (isResolved) return;

      if (err) {
        isResolved = true;
        const errorCode = err.message || '';

        if (errorCode.includes('0x80100069') || errorCode.includes('fjernet')) {
          return safeDisconnect(() => reject(new Error('CARD_REMOVED')));
        }

        if (errorCode.includes('0x80100017') || errorCode.includes('ikke tilgjengelig')) {
          return safeDisconnect(() => reject(new Error('NO_CARD')));
        }

        if (errorCode.includes('0x8010000C') || errorCode.includes('0x80100003') ||
            errorCode.includes('0x0000001f') || errorCode.includes('No smartcard') ||
            errorCode.includes('referansen var ugyldig') || errorCode.includes('virker ikke')) {
          return safeDisconnect(() => reject(new Error('NO_CARD')));
        }

        return safeDisconnect(() => reject(new Error('CONNECT_ERROR')));
      }

      isConnected = true;

      const getUID = Buffer.from([
        0xFF, 0xCA, 0x00, 0x00, 0x00
      ]);

      const pcscProtocol = (typeof protocol === 'number' && protocol > 0) ? protocol : 2;

      // Check if reader still exists before transmitting
      if (!reader) {
        isResolved = true;
        return safeDisconnect(() => reject(new Error('READER_DISCONNECTED')));
      }

      reader.transmit(getUID, 40, pcscProtocol, (err, data) => {
        if (isResolved) return;

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

        if (isResolved) return;
        isResolved = true;

        if (data.length < 2) {
          return safeDisconnect(() => reject(new Error('INVALID_RESPONSE')));
        }

        const sw1 = data[data.length - 2];
        const sw2 = data[data.length - 1];

        if (sw1 !== 0x90 || sw2 !== 0x00) {
          return safeDisconnect(() => reject(new Error('CARD_ERROR')));
        }

        const uid = data.slice(0, data.length - 2);
        const uidHex = Array.from(uid)
          .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(':');

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
    'CARD_ERROR': 'Kortet returnerte en feil',
    'READER_DISCONNECTED': 'Kortleseren ble frakoblet under lesing'
  };

  return errorMessages[errorCode] || errorCode;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');

  // Send current status
  ws.send(JSON.stringify({
    type: 'status',
    readersConnected: readers.length,
    currentReader: currentReader ? currentReader.name : null,
    isMonitoring: isMonitoring,
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.command === 'start_monitoring') {
        monitoringClients.add(ws);
        isMonitoring = true;
        console.log('👁️ Started monitoring for cards');

        ws.send(JSON.stringify({
          type: 'monitoring_started',
          timestamp: new Date().toISOString()
        }));
      } else if (data.command === 'stop_monitoring') {
        monitoringClients.delete(ws);
        if (monitoringClients.size === 0) {
          isMonitoring = false;
          console.log('🛑 Stopped monitoring for cards');
        }

        ws.send(JSON.stringify({
          type: 'monitoring_stopped',
          timestamp: new Date().toISOString()
        }));
      } else if (data.command === 'scan_once') {
        // Manual single scan
        if (currentReader) {
          readAndBroadcastCard(currentReader);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'NO_READER',
            message: getErrorMessage('NO_READER'),
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    monitoringClients.delete(ws);
    if (monitoringClients.size === 0) {
      isMonitoring = false;
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Routes (kept for backward compatibility)

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
      websocketSupported: true,
      isMonitoring: isMonitoring,
      connectedClients: wss.clients.size,
      version: '2.0.0'
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

// Scan for card (legacy API - kept for backward compatibility)
app.post('/api/scan', async (req, res) => {
  if (!currentReader) {
    return res.status(503).json({
      success: false,
      error: 'NO_READER',
      message: getErrorMessage('NO_READER')
    });
  }

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
    readers: readers.length,
    websocket: true
  });
});

// Start server with automatic port fallback
function startServer(port) {
  server.listen(port, () => {
    console.log(`🚀 NFC Bridge Server v2.0 running on http://localhost:${port}`);
    console.log(`🔌 WebSocket server running on ws://localhost:${port}`);
    console.log(`📡 Waiting for card readers...`);
    console.log(`💡 Make sure ACS ACR1255U-J1 is connected via USB`);
    console.log(`\n✨ New features:`);
    console.log(`   - Event-based card detection (no more polling!)`);
    console.log(`   - WebSocket support for real-time updates`);
    console.log(`   - Automatic card reading when inserted`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.log(`⚠️  Port ${port} is already in use, trying ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

// Start the server
startServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down NFC Bridge Server...');

  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });

  wss.close(() => {
    console.log('🔌 WebSocket server closed');
  });

  pcsc.close();
  server.close(() => {
    console.log('🛑 HTTP server closed');
    process.exit(0);
  });
});
