const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');

// Ensure server/.env is loaded reliably if db.js is invoked directly
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Configure Node.js DNS servers for SRV resolution when running on environments
 * with local c-ares DNS resolution constraints (e.g., Windows development), or when
 * explicitly enabled via ENABLE_CUSTOM_DNS=true or CUSTOM_DNS_SERVERS=8.8.8.8,1.1.1.1.
 * In standard cloud production Linux environments, this is disabled by default to respect
 * the container/host network resolver.
 */
const configureDNS = () => {
  // If explicitly disabled
  if (process.env.ENABLE_CUSTOM_DNS === 'false') {
    return;
  }

  // Enable if explicitly requested, or by default on Windows platforms
  const shouldEnable =
    process.env.ENABLE_CUSTOM_DNS === 'true' ||
    Boolean(process.env.CUSTOM_DNS_SERVERS) ||
    process.platform === 'win32';

  if (!shouldEnable) {
    return;
  }

  try {
    const servers = process.env.CUSTOM_DNS_SERVERS
      ? process.env.CUSTOM_DNS_SERVERS.split(',').map((s) => s.trim())
      : ['8.8.8.8', '1.1.1.1'];
    dns.setServers(servers);
  } catch (err) {
    console.warn('⚠️  [DNS Warning] Could not set custom DNS servers:', err.message);
  }
};

// Apply DNS configuration before connection attempts
configureDNS();

// Persistent connection lifecycle monitoring
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  [Database Notice] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ [Database] MongoDB reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  // Never expose credentials in error messages
  const sanitized = (err?.message || '').replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[REDACTED_URI]');
  console.error('❌ [Database Error] MongoDB connection error:', sanitized);
});

/**
 * Connect to MongoDB Atlas using Mongoose
 * The connection URI is read exclusively from process.env.MONGODB_URI.
 * Credentials and passwords are never logged or exposed.
 */
const connectDB = async () => {
  configureDNS();
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('<PASSWORD>')) {
    console.warn(
      '⚠️  [Database Notice] MONGODB_URI is not configured or still contains <PASSWORD> placeholder.\n' +
      '   Server started without database connection. Update server/.env with valid credentials when ready.'
    );
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'ResourceSharingDb',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    console.log(`✅ [Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    // Sanitized error logging to prevent any inadvertent credential exposure
    const safeError = (error.message || '').replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[REDACTED_URI]');
    console.error('❌ [Database Error] Failed to connect to MongoDB Atlas:', safeError);
    return null;
  }
};

/**
 * Returns human-readable connection status
 */
const getDBStatus = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const state = mongoose.connection.readyState;
  return stateMap[state] || 'unknown';
};

/**
 * Check if database is currently ready and connected
 */
const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectDB,
  getDBStatus,
  isDBConnected,
  configureDNS,
};
