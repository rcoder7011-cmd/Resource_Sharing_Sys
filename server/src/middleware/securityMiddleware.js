const mongoose = require('mongoose');

/**
 * Native Security Headers Middleware
 * Implements standard OWASP / RFC-compliant security headers (mirroring Helmet):
 * - Removes Express signature
 * - Enforces MIME-type sniffing prevention (nosniff)
 * - Clickjacking defense (SAMEORIGIN)
 * - Content Security Policy (CSP)
 * - Cross-Origin Resource & Opener Policies
 * - Referrer Policy
 * - Strict-Transport-Security (HSTS)
 */
const securityHeaders = (req, res, next) => {
  // 1. Remove identifying server headers
  res.removeHeader('X-Powered-By');

  // 2. Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 4. Disable obsolete X-XSS-Protection (per modern security standards)
  res.setHeader('X-XSS-Protection', '0');

  // 5. Strict-Transport-Security (HSTS: 1 year, include subdomains)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // 6. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 7. Cross-Origin Policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // 8. DNS & Download Restrictions
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // 9. Content Security Policy (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self' ws: wss: https: http:;"
  );

  next();
};

/**
 * Lightweight In-Memory Rate Limiter Factory
 * Protects abuse-prone endpoints (such as login, register, and public API queries)
 * from brute-force and Denial-of-Service (DoS) attacks.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (e.g., 15 * 60 * 1000)
 * @param {number} options.max - Max requests allowed per window per IP
 * @param {string} options.message - Human-readable error message on block
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests from this IP address. Please try again later.',
} = {}) => {
  const store = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // In test environment, allow bypassing rate limits if configured
    if (process.env.NODE_ENV === 'test' && !req.headers['x-enforce-rate-limit']) {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    let record = store.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        error: {
          message,
          statusCode: 429,
          retryAfterSeconds: resetSeconds,
        },
      });
    }

    next();
  };
};

// General API rate limiter: 500 requests per 15 minutes
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many API requests from this client. Please slow down.',
});

// Authentication rate limiter: 25 requests per 15 minutes
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

/**
 * NoSQL Injection & Malformed Key Sanitizer
 * Recursively strips keys starting with `$` or containing `.` from request body, query, and params.
 * Prevents operators like `{ "$gt": "" }` from hijacking MongoDB queries without breaking
 * legitimate strings, emails, or search terms.
 */
const sanitizeNoSql = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

/**
 * Validate MongoDB ObjectId param middleware
 * Returns 400 Bad Request immediately if route param is not a valid 24-hex-char ObjectId.
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (val && !mongoose.Types.ObjectId.isValid(val)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format for parameter "${paramName}". Expected 24-character hexadecimal ObjectId.`,
      });
    }
    next();
  };
};

module.exports = {
  securityHeaders,
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  sanitizeNoSql,
  validateObjectId,
};

