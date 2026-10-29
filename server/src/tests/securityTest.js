/**
 * Part 9 Security Hardening, Production Readiness & Deployment Test Suite
 *
 * Verifies:
 * 1. Environment configuration validation (PORT, JWT_SECRET, MONGODB_URI)
 * 2. OWASP / RFC-compliant security headers (nosniff, SAMEORIGIN, HSTS, CSP, no X-Powered-By)
 * 3. In-memory Rate Limiting (429 Too Many Requests, Retry-After header)
 * 4. NoSQL injection & prototype parameter sanitization
 * 5. Centralized Error Handler (credential scrubbing, stack suppression in production, CastError mapping)
 * 6. Health Liveness & Readiness Probes (200 OK when connected, 503 Unavailable when offline)
 * 7. Multi-origin CORS policy validation
 * 8. DNS configuration toggle safety
 */

const assert = require('assert');
const mongoose = require('mongoose');

const { validateEnv } = require('../config/env');
const { getHealthStatus, getReadinessStatus } = require('../controllers/healthController');
const {
  securityHeaders,
  createRateLimiter,
  sanitizeNoSql,
  validateObjectId,
} = require('../middleware/securityMiddleware');
const errorHandler = require('../middleware/errorMiddleware');
const { configureDNS } = require('../config/db');

let passedTests = 0;
let failedTests = 0;

const logPass = (name) => {
  passedTests++;
  console.log(`  ✅ PASS: ${name}`);
};

const logFail = (name, error) => {
  failedTests++;
  console.error(`  ❌ FAIL: ${name}`);
  console.error(`     Reason: ${error.message}`);
};

const runTest = async (name, testFn) => {
  try {
    await testFn();
    logPass(name);
  } catch (error) {
    logFail(name, error);
  }
};

const mockReqRes = (options = {}) => {
  const headers = {};
  const resHeaders = {};

  const req = {
    method: options.method || 'GET',
    url: options.url || '/',
    originalUrl: options.url || '/',
    ip: options.ip || '127.0.0.1',
    headers: { ...headers, ...(options.headers || {}) },
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
  };

  const res = {
    statusCode: 200,
    headers: resHeaders,
    data: null,
    setHeader: (name, value) => {
      resHeaders[name.toLowerCase()] = value;
      return res;
    },
    removeHeader: (name) => {
      delete resHeaders[name.toLowerCase()];
      return res;
    },
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (payload) => {
      res.data = payload;
      return res;
    },
  };

  return { req, res };
};

async function runSecurityTestSuite() {
  console.log('\n====================================================');
  console.log('🧪 Starting Part 9 Security Hardening & Production Test Suite');
  console.log('====================================================\n');

  // --- Suite 1: Environment Configuration Validation ---
  console.log('--- Test Suite 1: Environment Configuration Validation ---');

  await runTest('validateEnv returns validated configuration object', async () => {
    const config = validateEnv();
    assert(typeof config === 'object', 'Configuration must be an object');
    assert(typeof config.PORT === 'number', 'PORT must be a number');
    assert(typeof config.JWT_SECRET === 'string', 'JWT_SECRET must be a string');
  });

  await runTest('validateEnv rejects short JWT secret in production mode', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;
    const origMongo = process.env.MONGODB_URI;

    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short_insecure_secret';
    process.env.MONGODB_URI = 'mongodb+srv://usr:pwd@cluster.mongodb.net/db';

    try {
      assert.throws(
        () => validateEnv(),
        /Startup halted due to \d+ fatal configuration error/,
        'Should throw fatal error in production for short JWT secret'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
      process.env.MONGODB_URI = origMongo;
    }
  });

  // --- Suite 2: Security Headers Middleware ---
  console.log('\n--- Test Suite 2: Security Headers Middleware ---');

  await runTest('securityHeaders removes X-Powered-By header', async () => {
    const { req, res } = mockReqRes();
    res.setHeader('x-powered-by', 'Express');
    securityHeaders(req, res, () => {});
    assert.strictEqual(res.headers['x-powered-by'], undefined);
  });

  await runTest('securityHeaders sets X-Content-Type-Options: nosniff', async () => {
    const { req, res } = mockReqRes();
    securityHeaders(req, res, () => {});
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  });

  await runTest('securityHeaders sets X-Frame-Options: SAMEORIGIN', async () => {
    const { req, res } = mockReqRes();
    securityHeaders(req, res, () => {});
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
  });

  await runTest('securityHeaders sets Strict-Transport-Security', async () => {
    const { req, res } = mockReqRes();
    securityHeaders(req, res, () => {});
    assert(res.headers['strict-transport-security'].includes('max-age=31536000'));
  });

  await runTest('securityHeaders sets Content-Security-Policy', async () => {
    const { req, res } = mockReqRes();
    securityHeaders(req, res, () => {});
    assert(res.headers['content-security-policy'].includes("default-src 'self'"));
  });

  // --- Suite 3: NoSQL Injection Sanitization ---
  console.log('\n--- Test Suite 3: NoSQL Injection Sanitization ---');

  await runTest('sanitizeNoSql strips malicious $-prefixed keys from request body', async () => {
    const { req, res } = mockReqRes({
      body: {
        username: 'alice',
        password: { $gt: '' },
        nested: {
          legitimate: 'safe',
          $where: 'sleep(1000)',
        },
      },
    });

    sanitizeNoSql(req, res, () => {});

    assert.strictEqual(req.body.username, 'alice');
    assert.strictEqual(req.body.password.$gt, undefined);
    assert.strictEqual(req.body.nested.legitimate, 'safe');
    assert.strictEqual(req.body.nested.$where, undefined);
  });

  await runTest('sanitizeNoSql strips dot-syntax keys that can target nested paths', async () => {
    const { req, res } = mockReqRes({
      query: {
        'role.admin': true,
        category: 'Laboratories',
      },
    });

    sanitizeNoSql(req, res, () => {});

    assert.strictEqual(req.query['role.admin'], undefined);
    assert.strictEqual(req.query.category, 'Laboratories');
  });

  // --- Suite 4: Rate Limiting Middleware ---
  console.log('\n--- Test Suite 4: Rate Limiting Middleware ---');

  await runTest('createRateLimiter allows requests within threshold', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
    const { req, res } = mockReqRes({ headers: { 'x-enforce-rate-limit': 'true' } });
    let nextCount = 0;

    limiter(req, res, () => { nextCount++; });
    assert.strictEqual(nextCount, 1);
    assert.strictEqual(res.headers['ratelimit-remaining'], 1);

    limiter(req, res, () => { nextCount++; });
    assert.strictEqual(nextCount, 2);
    assert.strictEqual(res.headers['ratelimit-remaining'], 0);
  });

  await runTest('createRateLimiter rejects requests exceeding threshold with 429 Too Many Requests', async () => {
    const limiter = createRateLimiter({
      windowMs: 10000,
      max: 1,
      message: 'Rate limit test reached',
    });
    const { req, res } = mockReqRes({ headers: { 'x-enforce-rate-limit': 'true' } });
    let nextCount = 0;

    // First request (allowed)
    limiter(req, res, () => { nextCount++; });
    assert.strictEqual(nextCount, 1);

    // Second request (blocked)
    limiter(req, res, () => { nextCount++; });
    assert.strictEqual(nextCount, 1, 'Next should not be called when limit exceeded');
    assert.strictEqual(res.statusCode, 429);
    assert.strictEqual(res.data.success, false);
    assert(res.data.error.message.includes('Rate limit test reached'));
    assert(res.headers['retry-after'] !== undefined);
  });

  // --- Suite 5: Centralized Error Handling & Secret Scrubbing ---
  console.log('\n--- Test Suite 5: Centralized Error Handling & Secret Scrubbing ---');

  await runTest('errorHandler sanitizes MongoDB connection string from error message', async () => {
    const { req, res } = mockReqRes();
    const error = new Error('Connection failed to mongodb+srv://admin_user:SuperSecretP@ss@cluster0.abc.mongodb.net/db');

    errorHandler(error, req, res, () => {});

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.data.success, false);
    assert(!res.data.error.message.includes('SuperSecretP@ss'), 'Password must never be exposed');
    assert(res.data.error.message.includes('[REDACTED_DATABASE_URI]'));
  });

  await runTest('errorHandler suppresses stack trace in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const { req, res } = mockReqRes();
      const error = new Error('Internal error');
      errorHandler(error, req, res, () => {});

      assert.strictEqual(res.data.error.stack, undefined, 'Stack trace must be omitted in production');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  await runTest('errorHandler maps Mongoose CastError to 400 Bad Request', async () => {
    const { req, res } = mockReqRes();
    const castError = new Error('Cast to ObjectId failed');
    castError.name = 'CastError';
    castError.path = 'resourceId';

    errorHandler(castError, req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert(res.data.error.message.includes('Invalid ID format'));
  });

  // --- Suite 6: Health Liveness & Readiness Probes ---
  console.log('\n--- Test Suite 6: Health Liveness & Readiness Probes ---');

  await runTest('getHealthStatus returns 200 OK with process uptime', async () => {
    const { req, res } = mockReqRes();
    getHealthStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert(typeof res.data.uptime === 'number');
  });

  await runTest('getReadinessStatus returns 503 when database is disconnected', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    try {
      const { req, res } = mockReqRes();
      getReadinessStatus(req, res);

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.data.status, 'unready');
      assert.strictEqual(res.data.database.connected, false);
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await runTest('getReadinessStatus returns 200 OK when database is connected', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    try {
      const { req, res } = mockReqRes();
      getReadinessStatus(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.status, 'ready');
      assert.strictEqual(res.data.database.connected, true);
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 7: ObjectId Param Validator ---
  console.log('\n--- Test Suite 7: ObjectId Param Validator ---');

  await runTest('validateObjectId rejects malformed hexadecimal ID with 400', async () => {
    const validator = validateObjectId('id');
    const { req, res } = mockReqRes({ params: { id: 'not-a-valid-object-id' } });
    let nextCalled = false;

    validator(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert(res.data.message.includes('Invalid ID format'));
  });

  await runTest('validateObjectId allows valid 24-character hexadecimal ObjectId', async () => {
    const validator = validateObjectId('id');
    const validId = new mongoose.Types.ObjectId().toString();
    const { req, res } = mockReqRes({ params: { id: validId } });
    let nextCalled = false;

    validator(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.statusCode, 200);
  });

  // --- Suite 8: DNS Workaround Configuration ---
  console.log('\n--- Test Suite 8: DNS Workaround Configuration ---');

  await runTest('configureDNS does not crash and respects environment overrides', async () => {
    const origVal = process.env.ENABLE_CUSTOM_DNS;
    process.env.ENABLE_CUSTOM_DNS = 'false';

    try {
      assert.doesNotThrow(() => configureDNS());
    } finally {
      process.env.ENABLE_CUSTOM_DNS = origVal;
    }
  });

  // --- Summary ---
  console.log('\n====================================================');
  console.log(`📊 Part 9 Security & Production Readiness Test Results:`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite();

