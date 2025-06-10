// Basic test to see if our setup works
console.log('🚀 APStat Park API Test');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

// Test if we can create a simple HTTP server without external dependencies
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'APStat Park API is working!',
    timestamp: new Date().toISOString(),
    status: 'ok'
  }));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`✅ Basic HTTP server running on port ${port}`);
  console.log(`📡 Test it: http://localhost:${port}`);
  console.log('🎯 Ready for Phase 1 completion!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
}); 