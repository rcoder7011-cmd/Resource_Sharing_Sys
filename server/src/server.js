const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const { connectDB } = require('./config/db');
const { validateEnv } = require('./config/env');
const { initSocket, closeSocket } = require('./socket');
const { checkAndSendDeadlineReminders } = require('./services/notificationService');

// Configurable port with default fallback to 5000
const PORT = process.env.PORT || 5000;

/**
 * Initialize and start the HTTP server with Socket.IO
 */
const startServer = async () => {
  // 1. Validate environment configuration at startup
  validateEnv();

  // 2. Connect to MongoDB Atlas (if credentials provided; non-blocking for health check)
  await connectDB();

  // Create unified HTTP server
  const httpServer = http.createServer(app);

  // Attach authenticated Socket.IO engine to existing HTTP server
  initSocket(httpServer);

  // Periodic reminder background scheduler (every 10 minutes)
  const REMINDER_INTERVAL_MS = 10 * 60 * 1000;
  const reminderTimer = setInterval(async () => {
    try {
      await checkAndSendDeadlineReminders({ reminderWindowMinutes: 120 });
    } catch (err) {
      // Non-blocking log
    }
  }, REMINDER_INTERVAL_MS);

  // Prevent background timer from keeping process alive if server closes
  if (reminderTimer.unref) {
    reminderTimer.unref();
  }

  httpServer.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Resource Sharing Platform Backend Running`);
    console.log(`📡 Port:        ${PORT}`);
    console.log(`⚡ Real-Time:   Socket.IO Attached & Authenticated`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🩺 Health API:  http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n🛑 Gracefully shutting down server...');
    clearInterval(reminderTimer);
    closeSocket();
    httpServer.close(() => {
      console.log('✅ HTTP and Socket.IO servers closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return httpServer;
};

// Start the server
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err.message);
    process.exit(1);
  });
}

module.exports = { startServer };
