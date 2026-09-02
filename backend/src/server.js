require('dotenv').config();

const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/database');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO with HTTP Server
initSocket(server);

async function startServer() {
  console.log('==================================================');
  console.log('Starting SocialDesk Backend Server...');
  console.log('==================================================');

  // Verify MySQL connection
  const isDbConnected = await testConnection();

  if (!isDbConnected) {
    console.warn(
      '⚠️ WARNING: Database connection failed. Please ensure MySQL Community Server is running and configuration in .env is correct.'
    );
  }

  // Start HTTP & Socket.IO server
  server.listen(PORT, () => {
    console.log(`🚀 SocialDesk Server is running on http://localhost:${PORT}`);
    console.log(`⚡ Real-time Socket.IO initialized on ws://localhost:${PORT}`);
    console.log(`🏥 Health check available at http://localhost:${PORT}/api/health`);
    console.log('==================================================');
  });
}

startServer();
