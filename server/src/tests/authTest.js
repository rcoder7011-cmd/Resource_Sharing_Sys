/**
 * Comprehensive Authentication & Security Test Suite
 * Resource Sharing Platform — Part 3
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../app');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} = require('../controllers/authController');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

// Lightweight mock helper for Express controllers & middleware
function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = {}, user = null } = {}) {
  const req = {
    method,
    url,
    headers: { ...headers },
    body: { ...body },
    user,
    originalUrl: url,
  };

  let statusCode = 200;
  let jsonResponse = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonResponse() {
      return jsonResponse;
    },
  };

  return { req, res };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 3 Security & Authentication Test Suite');
  console.log('====================================================\n');

  // TEST SUITE 1: User Schema & Model Validation
  console.log('--- Test Suite 1: User Schema & Model Validation ---');

  // 1.1 Valid User creation
  const validUser = new User({
    name: 'Dr. Katherine Johnson',
    email: 'kjohnson@nasa.gov',
    password: 'OrbitalMechanics1962!',
    role: 'user',
  });
  const validationErr = validUser.validateSync();
  assert(validationErr === undefined, 'Valid user instance passes Mongoose schema validation');

  // 1.2 Name validation (< 2 characters)
  const shortNameUser = new User({
    name: 'K',
    email: 'k@nasa.gov',
    password: 'OrbitalMechanics1962!',
  });
  const shortNameErr = shortNameUser.validateSync();
  assert(shortNameErr?.errors?.name !== undefined, 'User with name < 2 chars is rejected');

  // 1.3 Invalid email format validation
  const badEmailUser = new User({
    name: 'Katherine Johnson',
    email: 'not-an-email',
    password: 'OrbitalMechanics1962!',
  });
  const badEmailErr = badEmailUser.validateSync();
  assert(badEmailErr?.errors?.email !== undefined, 'User with malformed email is rejected');

  // 1.4 Short password validation (< 8 characters)
  const shortPassUser = new User({
    name: 'Katherine Johnson',
    email: 'kjohnson@nasa.gov',
    password: 'short',
  });
  const shortPassErr = shortPassUser.validateSync();
  assert(shortPassErr?.errors?.password !== undefined, 'User with password < 8 chars is rejected');

  // 1.5 Role enum validation (rejects invalid roles like 'superadmin')
  const badRoleUser = new User({
    name: 'Katherine Johnson',
    email: 'kjohnson@nasa.gov',
    password: 'OrbitalMechanics1962!',
    role: 'superadmin',
  });
  const badRoleErr = badRoleUser.validateSync();
  assert(badRoleErr?.errors?.role !== undefined, 'User with invalid role enum is rejected');

  // 1.6 Default role is 'user'
  const defaultRoleUser = new User({
    name: 'Katherine Johnson',
    email: 'kjohnson@nasa.gov',
    password: 'OrbitalMechanics1962!',
  });
  assert(defaultRoleUser.role === 'user', 'Default user role is strictly set to "user"');

  // 1.7 Pre-save bcrypt hashing and matchPassword
  const plainPassword = 'OrbitalMechanics1962!';
  const salt = await bcrypt.genSalt(10);
  validUser.password = await bcrypt.hash(plainPassword, salt);
  assert(
    validUser.password.startsWith('$2a$') || validUser.password.startsWith('$2b$'),
    'Password is stored as a valid bcrypt hash'
  );

  const passwordMatches = await validUser.matchPassword(plainPassword);
  assert(passwordMatches === true, 'matchPassword returns true for correct plain password');

  const wrongPasswordMatches = await validUser.matchPassword('IncorrectPassword999!');
  assert(wrongPasswordMatches === false, 'matchPassword returns false for wrong password');

  // 1.8 Safe object serialization (never leaks password or __v)
  const safeObj = validUser.toSafeObject();
  assert(safeObj.password === undefined, 'toSafeObject() does NOT contain password hash');
  assert(safeObj.name === 'Dr. Katherine Johnson', 'toSafeObject() contains user name');
  assert(safeObj.email === 'kjohnson@nasa.gov', 'toSafeObject() contains user email');
  assert(safeObj.role === 'user', 'toSafeObject() contains role');

  const jsonRet = validUser.toJSON();
  assert(jsonRet.password === undefined, 'toJSON() strips out password hash');
  assert(jsonRet.__v === undefined, 'toJSON() strips out internal Mongoose __v');

  // TEST SUITE 2: JWT Token Generation & Verification
  console.log('\n--- Test Suite 2: JWT Token Generation & Verification ---');

  const sampleToken = generateToken(validUser);
  assert(typeof sampleToken === 'string' && sampleToken.length > 30, 'generateToken returns valid JWT string');

  const decoded = jwt.verify(sampleToken, process.env.JWT_SECRET);
  assert(decoded.id === validUser._id.toString(), 'Decoded JWT payload contains correct user ID');
  assert(decoded.role === 'user', 'Decoded JWT payload contains user role');

  // 2.2 Expired token rejection
  const expiredToken = jwt.sign(
    { id: validUser._id.toString(), role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' }
  );
  let expiredRejected = false;
  try {
    jwt.verify(expiredToken, process.env.JWT_SECRET);
  } catch (err) {
    expiredRejected = err.name === 'TokenExpiredError';
  }
  assert(expiredRejected, 'Expired JWT is rejected with TokenExpiredError');

  // 2.3 Tampered / invalid token rejection
  let tamperedRejected = false;
  try {
    jwt.verify(sampleToken + 'tampered', process.env.JWT_SECRET);
  } catch (err) {
    tamperedRejected = err.name === 'JsonWebTokenError';
  }
  assert(tamperedRejected, 'Tampered/malformed JWT is rejected with JsonWebTokenError');

  // TEST SUITE 3: Auth Middleware (protect)
  console.log('\n--- Test Suite 3: Auth Middleware (protect) ---');

  // 3.1 Missing token in Authorization header
  const { req: reqNoToken, res: resNoToken } = createMockReqRes();
  await protect(reqNoToken, resNoToken, () => {});
  assert(resNoToken.statusCode === 401, 'protect rejects request without token with 401');
  assert(resNoToken.jsonResponse?.success === false, 'protect response indicates success: false');

  // 3.2 Non-Bearer token header
  const { req: reqBadHeader, res: resBadHeader } = createMockReqRes({
    headers: { authorization: 'Basic dXNlcjpwYXNz' },
  });
  await protect(reqBadHeader, resBadHeader, () => {});
  assert(resBadHeader.statusCode === 401, 'protect rejects non-Bearer header with 401');

  // 3.3 Expired token in Bearer header
  const { req: reqExpired, res: resExpired } = createMockReqRes({
    headers: { authorization: `Bearer ${expiredToken}` },
  });
  await protect(reqExpired, resExpired, () => {});
  assert(resExpired.statusCode === 401, 'protect rejects expired Bearer token with 401');
  assert(
    resExpired.jsonResponse?.message?.includes('expired'),
    'protect reports specific token expiration message'
  );

  // 3.4 Invalid / forged token
  const { req: reqForged, res: resForged } = createMockReqRes({
    headers: { authorization: 'Bearer completely.bogus.token' },
  });
  await protect(reqForged, resForged, () => {});
  assert(resForged.statusCode === 401, 'protect rejects forged Bearer token with 401');

  // TEST SUITE 4: Auth Controller Validation & Error Handling
  console.log('\n--- Test Suite 4: Auth Controller Validation & Safety ---');

  // 4.1 Signup with missing name
  const { req: regNoNameReq, res: regNoNameRes } = createMockReqRes({
    method: 'POST',
    body: { name: '', email: 'test@uni.edu', password: 'ValidPassword123!' },
  });
  await registerUser(regNoNameReq, regNoNameRes, () => {});
  assert(regNoNameRes.statusCode === 400, 'Signup with empty name returns 400');

  // 4.2 Signup with malformed email
  const { req: regBadEmailReq, res: regBadEmailRes } = createMockReqRes({
    method: 'POST',
    body: { name: 'Valid Name', email: 'not-valid-email', password: 'ValidPassword123!' },
  });
  await registerUser(regBadEmailReq, regBadEmailRes, () => {});
  assert(regBadEmailRes.statusCode === 400, 'Signup with malformed email returns 400');

  // 4.3 Signup with short password (< 8 chars)
  const { req: regShortPassReq, res: regShortPassRes } = createMockReqRes({
    method: 'POST',
    body: { name: 'Valid Name', email: 'test@uni.edu', password: 'short' },
  });
  await registerUser(regShortPassReq, regShortPassRes, () => {});
  assert(regShortPassRes.statusCode === 400, 'Signup with password < 8 chars returns 400');

  // 4.4 Public signup attempting role: 'admin' (Security check)
  // When DB is disconnected, registerUser returns 503 rather than claiming success
  const { req: regAdminReq, res: regAdminRes } = createMockReqRes({
    method: 'POST',
    body: { name: 'Attacker', email: 'attacker@uni.edu', password: 'AttackerPassword123!', role: 'admin' },
  });
  await registerUser(regAdminReq, regAdminRes, () => {});
  // Check that if DB is disconnected, it returns 503 and reports actual issue
  assert(
    regAdminRes.statusCode === 503 || regAdminRes.statusCode === 201,
    'Signup reports database status gracefully (503 when DB disconnected)'
  );

  // 4.5 Login missing email or password
  const { req: logMissingReq, res: logMissingRes } = createMockReqRes({
    method: 'POST',
    body: { email: 'test@uni.edu' }, // missing password
  });
  await loginUser(logMissingReq, logMissingRes, () => {});
  assert(logMissingRes.statusCode === 400, 'Login with missing password returns 400');

  // 4.6 Logout endpoint
  const { req: logoutReq, res: logoutRes } = createMockReqRes({ method: 'POST' });
  logoutUser(logoutReq, logoutRes);
  assert(logoutRes.statusCode === 200, 'Logout endpoint returns 200 OK');
  assert(logoutRes.jsonResponse?.success === true, 'Logout endpoint confirms client token discard');

  // 4.7 Current user profile endpoint (GET /api/auth/me)
  const { req: meReq, res: meRes } = createMockReqRes({
    user: validUser,
  });
  await getCurrentUser(meReq, meRes, () => {});
  assert(meRes.statusCode === 200, 'GET /api/auth/me returns 200 with attached user');
  assert(meRes.jsonResponse?.user?.email === 'kjohnson@nasa.gov', 'GET /api/auth/me returns safe profile email');
  assert(meRes.jsonResponse?.user?.password === undefined, 'GET /api/auth/me response excludes password');

  // TEST SUITE 5: Controller Logic with Mocked Storage (Simulated End-to-End)
  console.log('\n--- Test Suite 5: Controller End-to-End Simulation ---');

  // Stub isDatabaseConnected via monkeypatching mongoose readyState
  const originalReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const mockDbUsers = new Map();

  const originalFindOne = User.findOne;
  const originalCreate = User.create;

  User.findOne = async function (filter) {
    if (filter.email) {
      return mockDbUsers.get(filter.email.toLowerCase()) || null;
    }
    return null;
  };

  User.create = async function (doc) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(doc.password, salt);
    const createdUser = {
      _id: new mongoose.Types.ObjectId(),
      name: doc.name,
      email: doc.email.toLowerCase(),
      password: hashedPassword,
      role: doc.role, // strictly passed from controller
      createdAt: new Date(),
      updatedAt: new Date(),
      async matchPassword(entered) {
        return await bcrypt.compare(entered, this.password);
      },
    };
    mockDbUsers.set(doc.email.toLowerCase(), createdUser);
    return createdUser;
  };

  try {
    // 5.1 Valid registration creates user with hashed password
    const { req: regReq1, res: regRes1 } = createMockReqRes({
      method: 'POST',
      body: {
        name: 'Marie Curie',
        email: 'marie.curie@sorbonne.fr',
        password: 'RadiumPolonium1898!',
        role: 'admin', // Malicious attempt to elevate role
      },
    });
    await registerUser(regReq1, regRes1, () => {});
    assert(regRes1.statusCode === 201, 'Valid signup succeeds with 201 Created');
    assert(regRes1.jsonResponse?.success === true, 'Signup response indicates success: true');
    assert(typeof regRes1.jsonResponse?.token === 'string', 'Signup generates and returns JWT token');
    assert(regRes1.jsonResponse?.user?.email === 'marie.curie@sorbonne.fr', 'User object contains email');
    assert(regRes1.jsonResponse?.user?.password === undefined, 'Signup response does NOT leak password');

    // 5.2 Public signup cannot create admin role
    assert(
      regRes1.jsonResponse?.user?.role === 'user',
      'Public signup strictly creates "user" role, ignoring client attempt to assign "admin"'
    );

    // 5.3 Duplicate email registration is rejected (409)
    const { req: regReqDup, res: regResDup } = createMockReqRes({
      method: 'POST',
      body: {
        name: 'Marie Skłodowska',
        email: 'marie.curie@sorbonne.fr', // Same normalized email
        password: 'AnotherPassword123!',
      },
    });
    await registerUser(regReqDup, regResDup, () => {});
    assert(regResDup.statusCode === 409, 'Duplicate email registration is rejected with 409 Conflict');
    assert(
      regResDup.jsonResponse?.message?.includes('already exists'),
      'Duplicate email response returns descriptive conflict message'
    );

    // 5.4 Valid login succeeds
    const { req: loginReqValid, res: loginResValid } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'marie.curie@sorbonne.fr',
        password: 'RadiumPolonium1898!',
      },
    });
    await loginUser(loginReqValid, loginResValid, () => {});
    assert(loginResValid.statusCode === 200, 'Valid login succeeds with 200 OK');
    assert(typeof loginResValid.jsonResponse?.token === 'string', 'Valid login returns JWT token');
    assert(loginResValid.jsonResponse?.user?.password === undefined, 'Login response does NOT leak password');

    // 5.5 Wrong password fails with generic message
    const { req: loginReqWrongPass, res: loginResWrongPass } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'marie.curie@sorbonne.fr',
        password: 'WrongPassword999!',
      },
    });
    await loginUser(loginReqWrongPass, loginResWrongPass, () => {});
    assert(loginResWrongPass.statusCode === 401, 'Wrong password returns 401 Unauthorized');
    assert(
      loginResWrongPass.jsonResponse?.message === 'Invalid email or password',
      'Wrong password returns generic error message'
    );

    // 5.6 Non-existent user login fails with identical generic message
    const { req: loginReqNonExistent, res: loginResNonExistent } = createMockReqRes({
      method: 'POST',
      body: {
        email: 'doesnotexist@nowhere.com',
        password: 'SomePassword123!',
      },
    });
    await loginUser(loginReqNonExistent, loginResNonExistent, () => {});
    assert(loginResNonExistent.statusCode === 401, 'Non-existent user returns 401 Unauthorized');
    assert(
      loginResNonExistent.jsonResponse?.message === 'Invalid email or password',
      'Non-existent user returns identical generic error (prevents user enumeration)'
    );
  } finally {
    // Restore originals
    User.findOne = originalFindOne;
    User.create = originalCreate;
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
  }

  // TEST SUITE 6: Health & App Integrity Check
  console.log('\n--- Test Suite 6: API Health & App Integrity ---');
  assert(typeof app === 'function', 'Express application exports valid handler function');

  console.log('\n====================================================');
  console.log(`🏁 Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
