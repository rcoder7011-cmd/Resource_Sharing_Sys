/**
 * Centralized Error-Handling Middleware
 * Provides uniform error responses without exposing sensitive credentials or stack traces in production.
 * Handles Mongoose CastErrors (invalid ObjectIds), malformed JSON, payload limits, and unexpected exceptions.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'An unexpected server error occurred';

  // 1. Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format for parameter "${err.path || 'id'}". Expected 24-character hexadecimal ObjectId.`;
  }

  // 2. Body-parser payload too large
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request payload exceeds maximum allowed size (1MB).';
  }

  // 3. Body-parser malformed JSON syntax
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON syntax in request body.';
  }

  // 4. CORS authorization error
  if (err.message && err.message.includes('CORS policy')) {
    statusCode = 403;
  }

  // 5. Sanitize error message to prevent accidental credential leakage
  if (typeof message === 'string') {
    message = message
      .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URI]')
      .replace(/jwt secret|secret key/gi, '[REDACTED_SECRET]');
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      // Stack trace provided ONLY in non-production environments
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
