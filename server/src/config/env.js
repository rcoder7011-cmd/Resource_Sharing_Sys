const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Validate backend environment configuration at startup
 * Emits clear, secret-free diagnostic warnings or fatal errors.
 */
const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // 1. Port Validation
  const port = process.env.PORT || 5000;
  if (isNaN(Number(port))) {
    errors.push('PORT must be a valid numeric integer');
  }

  // 2. MongoDB URI Validation
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.trim() === '') {
    if (isProduction) {
      errors.push('MONGODB_URI is required in production environment');
    } else {
      warnings.push('MONGODB_URI is not configured. Server starting in offline database mode.');
    }
  } else if (mongoUri.includes('<PASSWORD>')) {
    if (isProduction) {
      errors.push('MONGODB_URI still contains placeholder <PASSWORD>');
    } else {
      warnings.push('MONGODB_URI contains <PASSWORD> placeholder.');
    }
  }

  // 3. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    if (isProduction) {
      errors.push('JWT_SECRET is mandatory in production');
    } else {
      warnings.push('JWT_SECRET is not configured; using fallback development key.');
    }
  } else if (isProduction && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long in production for cryptographic safety');
  }

  // 4. CORS Allowed Origin Validation
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl && isProduction) {
    warnings.push('CLIENT_URL not configured in production; defaulting to http://localhost:5173');
  }

  // Safe warnings output (never outputs credentials or secret values)
  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`⚠️  [Config Warning] ${w}`));
  }

  // Fatal configuration errors (halts startup only in production)
  if (errors.length > 0) {
    errors.forEach((e) => console.error(`❌ [Config Error] ${e}`));
    if (isProduction) {
      throw new Error(`Startup halted due to ${errors.length} fatal configuration error(s).`);
    }
  }

  return {
    PORT: Number(port),
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production_32chars',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
    MONGODB_URI: mongoUri || '',
    ENABLE_CUSTOM_DNS: process.env.ENABLE_CUSTOM_DNS,
    CUSTOM_DNS_SERVERS: process.env.CUSTOM_DNS_SERVERS,
  };
};

module.exports = {
  validateEnv,
};

