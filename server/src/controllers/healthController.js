const { getDBStatus, isDBConnected } = require('../config/db');

/**
 * Health check controller (Liveness probe)
 * Verifies that the Express process is active and responsive.
 */
const getHealthStatus = (req, res) => {
  const dbStatus = getDBStatus();

  return res.status(200).json({
    status: 'ok',
    message: 'Resource Sharing Platform API is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      connected: dbStatus === 'connected',
    },
  });
};

/**
 * Readiness check controller (Readiness probe)
 * Verifies that the application is fully ready to accept incoming traffic
 * and that MongoDB database connectivity is live.
 * Returns:
 *   - 200 OK if MongoDB connection is open and active (readyState === 1)
 *   - 503 Service Unavailable if database is offline or connecting
 */
const getReadinessStatus = (req, res) => {
  const connected = isDBConnected();
  const dbStatus = getDBStatus();

  if (!connected) {
    return res.status(503).json({
      status: 'unready',
      message: 'Service unavailable: MongoDB Atlas connection is not ready',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        connected: false,
      },
    });
  }

  return res.status(200).json({
    status: 'ready',
    message: 'Resource Sharing Platform is fully initialized and connected to database',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      connected: true,
    },
  });
};

module.exports = {
  getHealthStatus,
  getReadinessStatus,
};
