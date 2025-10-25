// Simple WebSocket test client
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');

  // Start monitoring
  ws.send(JSON.stringify({ command: 'start_monitoring' }));
  console.log('📡 Sent start_monitoring command');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', JSON.stringify(message, null, 2));
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Disconnected from WebSocket server');
});

// Keep alive for 30 seconds
setTimeout(() => {
  console.log('⏱️ Test timeout - stopping monitoring');
  ws.send(JSON.stringify({ command: 'stop_monitoring' }));

  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 1000);
}, 30000);

console.log('🧪 WebSocket test client started');
console.log('💡 Place a card on the reader to test...');
