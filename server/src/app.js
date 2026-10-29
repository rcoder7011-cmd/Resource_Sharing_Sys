const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/notFoundMiddleware');
const errorHandler = require('./middleware/errorMiddleware');
const {
  securityHeaders,
  apiRateLimiter,
  sanitizeNoSql,
} = require('./middleware/securityMiddleware');

const app = express();

// 1. Security Headers (HSTS, CSP, nosniff, SAMEORIGIN, no X-Powered-By)
app.use(securityHeaders);

// 2. Body Parsing with Strict 1MB Payload Size Limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3. NoSQL Injection & Prototype Sanitization
app.use(sanitizeNoSql);

// 4. Configurable & Restrictive CORS Supporting Multiple Origins
const parseAllowedOrigins = (originString) => {
  if (!originString || originString.trim() === '*' || originString.trim() === '') {
    return ['http://localhost:5173'];
  }
  return originString
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests with no origin (e.g. server-to-server, curl, tests)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');

      // Allow wildcard or matching configured origins
      if (
        process.env.CLIENT_URL === '*' ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      const corsError = new Error(`CORS policy blocked access from origin: ${origin}`);
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Preflight cache 24h
  })
);

// 5. Global API Rate Limiting
app.use('/api', apiRateLimiter);

// 6. Mount main API routes
app.use('/api', apiRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Resource Sharing Platform API',
    version: '1.0.0',
    status: 'operational',
    healthCheck: '/api/health',
    readinessCheck: '/api/health/ready',
  });
});

// 404 handling for unknown routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
