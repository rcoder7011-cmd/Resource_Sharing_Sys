/**
 * Part 12 Proof-Based Handover & Return Verification Test Suite
 * Resource Sharing Platform — CodeHack India 2026
 *
 * Verifies:
 * 1. Schema validations for handover proof, return proof, and issue reports
 * 2. Secure evidence storage service (MIME validation, 5MB limit, magic numbers, path traversal)
 * 3. Authorized borrower handover proof submission
 * 4. Authorized owner handover proof submission
 * 5. Third-party authorization rejection (403 Forbidden)
 * 6. Non-approved booking handover rejection (400 Bad Request)
 * 7. Duplicate handover proof submission rejection (400 Bad Request)
 * 8. Return proof validation (requires checked_in status)
 * 9. Initial vs Return condition comparison & degradation detection
 * 10. Non-accusatory condition difference (no automatic blame assignment)
 * 11. Issue report creation, category validation, and duplicate prevention
 * 12. Tamper-proof server timestamps (client timestamp overrides ignored)
 * 13. Authenticated evidence upload & access control
 * 14. Chronological evidence timeline ordering & actor attribution
 * 15. Database disconnection (503 Service Unavailable) offline guards
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const User = require('../models/User');

const {
  saveEvidenceFile,
  getEvidenceFilePath,
  parseBase64Upload,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} = require('../services/evidenceStorageService');

const {
  checkInBooking,
  submitHandoverProof,
  checkOutBooking,
  reportBookingIssue,
  uploadBookingEvidence,
  getBookingEvidenceFile,
  getBookingTimeline,
  getBookingProofDetails,
  getBookingIssueDetails,
} = require('../controllers/bookingController');

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

function createMockReqRes({
  method = 'GET',
  url = '/',
  query = {},
  params = {},
  headers = {},
  body = {},
  user = null,
} = {}) {
  const req = {
    method,
    url,
    query: { ...query },
    params: { ...params },
    headers: { ...headers },
    body: { ...body },
    user,
    originalUrl: url,
  };

  let statusCode = 200;
  let jsonResponse = null;
  const setHeaders = {};

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
    setHeader(name, value) {
      setHeaders[name] = value;
      return this;
    },
    sendFile(filePath) {
      statusCode = 200;
      jsonResponse = { sentFile: filePath };
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonResponse() {
      return jsonResponse;
    },
    get setHeaders() {
      return setHeaders;
    },
  };

  return { req, res };
}

async function runProofTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 12 Proof-Based Handover Test Suite');
  console.log('====================================================\n');

  // Test identities
  const ownerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Prof. Marcus Vance (Owner)',
    email: 'mvance@university.edu',
    role: 'user',
  };

  const borrowerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Elena Rostova (Borrower)',
    email: 'erostova@university.edu',
    role: 'user',
  };

  const unrelatedUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'External Student',
    email: 'external@university.edu',
    role: 'user',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'System Admin',
    email: 'admin@university.edu',
    role: 'admin',
  };

  const sampleResourceId = new mongoose.Types.ObjectId();

  // --- Test Suite 1: Part 12 Schema Enhancements ---
  console.log('--- Test Suite 1: Part 12 Schema Enhancements ---');

  const now = new Date();
  const futureStart = new Date(Date.now() + 3600000);
  const futureEnd = new Date(Date.now() + 7200000);

  const testHandoverDoc = new Booking({
    resource: sampleResourceId,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Digital Signal Processing Project Lab',
    status: 'checked_in',
    checkIn: {
      checkedInAt: now,
      condition: 'excellent',
      notes: 'All probes and power supplies verified intact',
      photos: ['/api/bookings/evidence/test-photo.jpg'],
      submittedBy: borrowerUser._id,
      reviewedAndConfirmed: true,
    },
  });

  const handoverSchemaErr = testHandoverDoc.validateSync();
  assert(!handoverSchemaErr, 'Booking schema accepts checkIn with submittedBy and reviewedAndConfirmed');
  assert(testHandoverDoc.checkIn.reviewedAndConfirmed === true, 'reviewedAndConfirmed evaluates true');
  assert(testHandoverDoc.checkIn.submittedBy.toString() === borrowerUser._id.toString(), 'submittedBy matches borrower ID');

  const testReturnDoc = new Booking({
    resource: sampleResourceId,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Digital Signal Processing Lab',
    status: 'completed',
    checkIn: {
      checkedInAt: new Date(Date.now() - 3600000),
      condition: 'excellent',
      submittedBy: borrowerUser._id,
      reviewedAndConfirmed: true,
    },
    checkOut: {
      checkedOutAt: now,
      condition: 'good',
      notes: 'Returned cleanly with all cables',
      photos: ['/api/bookings/evidence/return-proof.jpg'],
      submittedBy: ownerUser._id,
      reviewedAndConfirmed: true,
    },
  });

  const returnSchemaErr = testReturnDoc.validateSync();
  assert(!returnSchemaErr, 'Booking schema accepts checkOut with submittedBy and reviewedAndConfirmed');
  assert(testReturnDoc.checkOut.reviewedAndConfirmed === true, 'Return reviewedAndConfirmed is true');

  // Issue report schema with category and photos
  const testIssueDoc = new Booking({
    resource: sampleResourceId,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Robotics sensor test',
    status: 'completed',
    issueReport: {
      hasIssue: true,
      reportedBy: ownerUser._id,
      category: 'condition_degradation',
      description: 'Lens cap missing and minor scuff on front panel',
      photos: ['/api/bookings/evidence/issue1.jpg'],
      reportedAt: now,
      status: 'open',
    },
  });

  const issueSchemaErr = testIssueDoc.validateSync();
  assert(!issueSchemaErr, 'Booking schema accepts issueReport with category and photos array');
  assert(testIssueDoc.issueReport.category === 'condition_degradation', 'issueReport.category recorded properly');
  assert(testIssueDoc.issueReport.photos.length === 1, 'issueReport.photos stored correctly');

  // Invalid issueReport category is rejected
  const invalidIssueDoc = new Booking({
    resource: sampleResourceId,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Test invalid category',
    status: 'completed',
    issueReport: {
      hasIssue: true,
      reportedBy: ownerUser._id,
      category: 'fabricated_non_existent_category',
      description: 'Some description',
      reportedAt: now,
    },
  });
  const invalidCategoryErr = invalidIssueDoc.validateSync();
  assert(
    invalidCategoryErr && invalidCategoryErr.errors['issueReport.category'],
    'Invalid issueReport.category enum value is rejected by schema'
  );

  // --- Test Suite 2: Secure Evidence Storage Service ---
  console.log('\n--- Test Suite 2: Secure Evidence Storage Service ---');

  // 1. Rejects unsupported MIME type
  try {
    saveEvidenceFile('sampleBooking123', Buffer.from('not an image'), 'application/pdf');
    assert(false, 'saveEvidenceFile should reject application/pdf');
  } catch (err) {
    assert(err.message.includes('Unsupported file type'), 'saveEvidenceFile rejects PDF with unsupported MIME error');
  }

  // 2. Rejects files exceeding 5MB
  try {
    const fakeOversizedBuffer = Buffer.alloc(MAX_FILE_SIZE + 1024);
    // Fake PNG header
    fakeOversizedBuffer[0] = 0x89;
    fakeOversizedBuffer[1] = 0x50;
    fakeOversizedBuffer[2] = 0x4e;
    fakeOversizedBuffer[3] = 0x47;
    saveEvidenceFile('sampleBooking123', fakeOversizedBuffer, 'image/png');
    assert(false, 'saveEvidenceFile should reject oversized buffer');
  } catch (err) {
    assert(err.message.includes('exceeds strict 5MB limit'), 'saveEvidenceFile rejects oversized file >5MB');
  }

  // 3. Rejects invalid magic bytes / corrupt buffer
  try {
    saveEvidenceFile('sampleBooking123', Buffer.from('plain text pretending to be png'), 'image/png');
    assert(false, 'saveEvidenceFile should reject invalid magic numbers');
  } catch (err) {
    assert(err.message.includes('does not match reported PNG format'), 'saveEvidenceFile validates magic bytes against spoofing');
  }

  // 4. Successfully saves valid PNG buffer
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const savedFileMeta = saveEvidenceFile('sampleBooking123', validPngHeader, 'image/png');
  assert(savedFileMeta && savedFileMeta.filename, 'saveEvidenceFile returns filename for valid PNG');
  assert(savedFileMeta.filename.endsWith('.png'), 'saved filename has .png extension');
  assert(savedFileMeta.size === validPngHeader.length, 'saved metadata reflects correct byte count');
  assert(savedFileMeta.mimeType === 'image/png', 'saved metadata reflects image/png MIME');

  // 5. Path traversal & security checks in getEvidenceFilePath
  try {
    getEvidenceFilePath('sampleBooking123', '../../etc/passwd');
    assert(false, 'getEvidenceFilePath should reject path traversal');
  } catch (err) {
    assert(err.message.includes('Invalid filename format') || err.message.includes('Access denied'), 'getEvidenceFilePath blocks directory traversal attempt');
  }

  try {
    getEvidenceFilePath('sampleBooking123', '..\\..\\windows\\win.ini');
    assert(false, 'getEvidenceFilePath should reject backslash traversal');
  } catch (err) {
    assert(err.message.includes('Invalid filename format') || err.message.includes('Access denied'), 'getEvidenceFilePath blocks backslash traversal');
  }

  try {
    getEvidenceFilePath('otherBooking999', savedFileMeta.filename);
    assert(false, 'getEvidenceFilePath should reject cross-booking file access');
  } catch (err) {
    assert(err.message.includes('does not belong to this booking context'), 'Cross-booking access blocked');
  }

  const resolved = getEvidenceFilePath('sampleBooking123', savedFileMeta.filename);
  assert(resolved && fs.existsSync(resolved.fullPath), 'getEvidenceFilePath returns absolute path for authorized filename');

  // --- Test Suite 3: Database Disconnection (503) Offline Guards ---
  console.log('\n--- Test Suite 3: Database Disconnection (503) Offline Guards ---');

  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
  const dummyBookingId = new mongoose.Types.ObjectId().toString();

  const { req: offInReq, res: offInRes } = createMockReqRes({
    method: 'POST',
    url: `/api/bookings/${dummyBookingId}/handover-proof`,
    params: { id: dummyBookingId },
    user: borrowerUser,
  });
  await checkInBooking(offInReq, offInRes);
  assert(offInRes.statusCode === 503, 'POST /api/bookings/:id/handover-proof returns 503 when DB offline');

  const { req: offOutReq, res: offOutRes } = createMockReqRes({
    method: 'POST',
    url: `/api/bookings/${dummyBookingId}/return-proof`,
    params: { id: dummyBookingId },
    user: borrowerUser,
  });
  await checkOutBooking(offOutReq, offOutRes);
  assert(offOutRes.statusCode === 503, 'POST /api/bookings/:id/return-proof returns 503 when DB offline');

  const { req: offTimeReq, res: offTimeRes } = createMockReqRes({
    method: 'GET',
    url: `/api/bookings/${dummyBookingId}/timeline`,
    params: { id: dummyBookingId },
    user: borrowerUser,
  });
  await getBookingTimeline(offTimeReq, offTimeRes);
  assert(offTimeRes.statusCode === 503, 'GET /api/bookings/:id/timeline returns 503 when DB offline');

  // Restore simulated online state
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // --- In-Memory Repository Setup for Controller Tests ---
  const bookingRepo = new Map();

  Booking.findById = function (id) {
    const found = bookingRepo.get(id ? id.toString() : '');
    const instance = found
      ? {
          ...found,
          populate: function () {
            return Promise.resolve(this);
          },
          save: function () {
            bookingRepo.set(this._id.toString(), { ...this });
            return Promise.resolve(this);
          },
        }
      : null;

    const query = {
      populate: function () {
        return query;
      },
      then: function (resolve, reject) {
        return Promise.resolve(instance).then(resolve, reject);
      },
      catch: function (reject) {
        return Promise.resolve(instance).catch(reject);
      },
    };
    return query;
  };

  const createFixtureBooking = (overrides = {}) => {
    const _id = new mongoose.Types.ObjectId();
    const doc = {
      _id,
      id: _id.toString(),
      resource: {
        _id: sampleResourceId,
        id: sampleResourceId.toString(),
        title: 'High-Precision Oscilloscope',
        condition: 'good',
        category: 'Lab Equipment',
      },
      requester: {
        _id: borrowerUser._id,
        id: borrowerUser._id.toString(),
        name: borrowerUser.name,
        email: borrowerUser.email,
      },
      owner: {
        _id: ownerUser._id,
        id: ownerUser._id.toString(),
        name: ownerUser.name,
        email: ownerUser.email,
      },
      quantity: 1,
      startAt: new Date(Date.now() + 3600000),
      endAt: new Date(Date.now() + 7200000),
      purpose: 'Harmonic oscillator testing',
      status: 'approved',
      checkIn: null,
      checkOut: null,
      issueReport: null,
      createdAt: new Date(Date.now() - 7200000),
      reviewedAt: new Date(Date.now() - 3600000),
      ...overrides,
    };
    bookingRepo.set(_id.toString(), doc);
    return doc;
  };

  // --- Test Suite 4: Handover Proof Submission & Authorization ---
  console.log('\n--- Test Suite 4: Handover Proof Submission & Authorization ---');

  // 1. Rejects invalid booking ID format
  const { req: invIdReq, res: invIdRes } = createMockReqRes({
    params: { id: 'invalid-non-mongo-id' },
    body: { condition: 'good', reviewedAndConfirmed: true },
    user: borrowerUser,
  });
  await checkInBooking(invIdReq, invIdRes);
  assert(invIdRes.statusCode === 400, 'Handover proof rejects invalid MongoDB ObjectId with 400');

  // 2. Rejects unauthorized third-party user
  const fixture1 = createFixtureBooking({ status: 'approved' });
  const { req: unauthReq, res: unauthRes } = createMockReqRes({
    params: { id: fixture1.id },
    body: { condition: 'excellent', reviewedAndConfirmed: true },
    user: unrelatedUser,
  });
  await checkInBooking(unauthReq, unauthRes);
  assert(unauthRes.statusCode === 403, 'Unrelated third party receives 403 Forbidden on handover submission');

  // 3. Rejects submission on non-approved booking
  const pendingFixture = createFixtureBooking({ status: 'pending' });
  const { req: nonAppReq, res: nonAppRes } = createMockReqRes({
    params: { id: pendingFixture.id },
    body: { condition: 'good', reviewedAndConfirmed: true },
    user: borrowerUser,
  });
  await checkInBooking(nonAppReq, nonAppRes);
  assert(nonAppRes.statusCode === 400, 'Handover proof rejected with 400 when booking is in "pending" status');

  // 4. Authorized borrower submits initial handover proof successfully
  const appFixture = createFixtureBooking({ status: 'approved' });
  const fakeOldTime = new Date('2020-01-01T00:00:00.000Z');
  const { req: bSubReq, res: bSubRes } = createMockReqRes({
    params: { id: appFixture.id },
    body: {
      condition: 'excellent',
      notes: 'Initial condition verified flawless',
      photos: ['/api/bookings/evidence/handover1.png'],
      reviewedAndConfirmed: true,
      checkedInAt: fakeOldTime, // Attempting to tamper with timestamp
    },
    user: borrowerUser,
  });
  await checkInBooking(bSubReq, bSubRes);
  assert(bSubRes.statusCode === 200, 'Authorized borrower successfully submits handover proof (200 OK)');
  const updatedDoc1 = bookingRepo.get(appFixture.id);
  assert(updatedDoc1.status === 'checked_in', 'Booking status transitioned to checked_in');
  assert(updatedDoc1.checkIn.condition === 'excellent', 'Initial condition stored as excellent');
  assert(updatedDoc1.checkIn.submittedBy.toString() === borrowerUser._id.toString(), 'submittedBy records borrower ID');
  assert(updatedDoc1.checkIn.reviewedAndConfirmed === true, 'reviewedAndConfirmed flag recorded as true');

  // 5. Server timestamp cannot be overridden by client
  const recordedTime = new Date(updatedDoc1.checkIn.checkedInAt).getTime();
  const sentFakeTime = fakeOldTime.getTime();
  assert(
    Math.abs(recordedTime - Date.now()) < 5000 && recordedTime !== sentFakeTime,
    'Server timestamp enforced; client-provided past timestamp overridden'
  );

  // 6. Duplicate handover submission is rejected
  const { req: dupInReq, res: dupInRes } = createMockReqRes({
    params: { id: appFixture.id },
    body: { condition: 'good', reviewedAndConfirmed: true },
    user: borrowerUser,
  });
  await checkInBooking(dupInReq, dupInRes);
  assert(dupInRes.statusCode === 400, 'Duplicate handover proof rejected with 400 Bad Request');

  // 7. Authorized custodian/owner can submit handover proof for approved booking
  const ownerHandoverFixture = createFixtureBooking({ status: 'approved' });
  const { req: oSubReq, res: oSubRes } = createMockReqRes({
    params: { id: ownerHandoverFixture.id },
    url: `/api/bookings/${ownerHandoverFixture.id}/handover-proof`,
    body: {
      condition: 'good',
      notes: 'Handed over by lab technician',
      reviewedAndConfirmed: true,
    },
    user: ownerUser,
  });
  await submitHandoverProof(oSubReq, oSubRes);
  assert(oSubRes.statusCode === 200, 'Authorized owner/custodian can submit handover proof (200 OK)');
  const updatedOwnerDoc = bookingRepo.get(ownerHandoverFixture.id);
  assert(updatedOwnerDoc.checkIn.submittedBy.toString() === ownerUser._id.toString(), 'submittedBy records owner ID');

  // --- Test Suite 5: Return Proof & Condition Comparison ---
  console.log('\n--- Test Suite 5: Return Proof & Condition Comparison ---');

  // 1. Return proof rejected if booking is not checked_in
  const approvedOnlyFixture = createFixtureBooking({ status: 'approved' });
  const { req: retNotCheckedReq, res: retNotCheckedRes } = createMockReqRes({
    params: { id: approvedOnlyFixture.id },
    body: { condition: 'good', reviewedAndConfirmed: true },
    user: borrowerUser,
  });
  await checkOutBooking(retNotCheckedReq, retNotCheckedRes);
  assert(retNotCheckedRes.statusCode === 400, 'Return proof rejected with 400 when booking is not checked_in');

  // 2. Return proof rejected for unrelated user
  const checkedInFixture = createFixtureBooking({
    status: 'checked_in',
    checkIn: {
      checkedInAt: new Date(Date.now() - 3600000),
      condition: 'excellent',
      submittedBy: borrowerUser._id,
      reviewedAndConfirmed: true,
    },
  });

  const { req: unauthRetReq, res: unauthRetRes } = createMockReqRes({
    params: { id: checkedInFixture.id },
    body: { condition: 'excellent', reviewedAndConfirmed: true },
    user: unrelatedUser,
  });
  await checkOutBooking(unauthRetReq, unauthRetRes);
  assert(unauthRetRes.statusCode === 403, 'Unrelated user rejected with 403 Forbidden on return proof submission');

  // 3. Authorized borrower submits return proof; condition matched
  const { req: bRetReq, res: bRetRes } = createMockReqRes({
    params: { id: checkedInFixture.id },
    body: {
      condition: 'excellent',
      notes: 'Resource returned clean and functional',
      reviewedAndConfirmed: true,
    },
    user: borrowerUser,
  });
  await checkOutBooking(bRetReq, bRetRes);
  assert(bRetRes.statusCode === 200, 'Borrower successfully submits return proof (200 OK)');
  const completedDoc1 = bookingRepo.get(checkedInFixture.id);
  assert(completedDoc1.status === 'completed', 'Booking transitioned to completed');
  assert(completedDoc1.conditionComparison.isWorsened === false, 'conditionComparison.isWorsened is false when conditions match');
  assert(
    completedDoc1.conditionComparison.difference === 'consistent' || completedDoc1.conditionComparison.difference === 'same',
    'conditionComparison.difference is "consistent" when conditions match'
  );
  assert(completedDoc1.checkOut.submittedBy.toString() === borrowerUser._id.toString(), 'checkOut.submittedBy records borrower ID');

  // 4. Duplicate return proof submission rejected
  const { req: dupOutReq, res: dupOutRes } = createMockReqRes({
    params: { id: checkedInFixture.id },
    body: { condition: 'excellent', reviewedAndConfirmed: true },
    user: borrowerUser,
  });
  await checkOutBooking(dupOutReq, dupOutRes);
  assert(dupOutRes.statusCode === 400, 'Duplicate return proof rejected with 400');

  // 5. Degradation detection without automatic blame assignment
  const degradedFixture = createFixtureBooking({
    status: 'checked_in',
    checkIn: {
      checkedInAt: new Date(Date.now() - 3600000),
      condition: 'excellent',
      submittedBy: borrowerUser._id,
      reviewedAndConfirmed: true,
    },
  });

  const { req: degRetReq, res: degRetRes } = createMockReqRes({
    params: { id: degradedFixture.id },
    body: {
      condition: 'fair',
      notes: 'Fine hairline scratch noted on side bezel after use',
      reviewedAndConfirmed: true,
    },
    user: ownerUser,
  });
  await checkOutBooking(degRetReq, degRetRes);
  assert(degRetRes.statusCode === 200, 'Owner returns resource with degraded condition (200 OK)');
  const completedDegradedDoc = bookingRepo.get(degradedFixture.id);
  assert(completedDegradedDoc.conditionComparison.isWorsened === true, 'conditionComparison.isWorsened is true (excellent -> fair)');
  assert(completedDegradedDoc.conditionComparison.difference === 'degraded', 'conditionComparison.difference is "degraded"');
  // Check no automatic fault or penalty was attached to the booking or user
  assert(completedDegradedDoc.status === 'completed', 'Booking marked completed normally without punitive lockouts');
  assert(!completedDegradedDoc.issueReport, 'issueReport is NOT automatically created; objective comparison preserved');

  // --- Test Suite 6: Issue & Dispute Reporting ---
  console.log('\n--- Test Suite 6: Issue & Dispute Reporting ---');

  // 1. Short description rejected (<5 chars)
  const issueFixture = createFixtureBooking({
    status: 'completed',
    checkIn: { condition: 'excellent', checkedInAt: new Date() },
    checkOut: { condition: 'damaged', checkedOutAt: new Date() },
  });

  const { req: shortDescReq, res: shortDescRes } = createMockReqRes({
    params: { id: issueFixture.id },
    body: { description: 'bad', category: 'physical_damage' },
    user: ownerUser,
  });
  await reportBookingIssue(shortDescReq, shortDescRes);
  assert(shortDescRes.statusCode === 400, 'Issue report rejected with 400 when description is less than 5 characters');

  // 2. Unrelated user rejected from reporting issue
  const { req: unauthIssReq, res: unauthIssRes } = createMockReqRes({
    params: { id: issueFixture.id },
    body: { description: 'Unauthorized third party comment', category: 'other' },
    user: unrelatedUser,
  });
  await reportBookingIssue(unauthIssReq, unauthIssRes);
  assert(unauthIssRes.statusCode === 403, 'Unrelated user rejected with 403 from reporting issue');

  // 3. Authorized owner submits dispute report with category and photos
  const { req: validIssReq, res: validIssRes } = createMockReqRes({
    params: { id: issueFixture.id },
    body: {
      category: 'physical_damage',
      description: 'Power cord was returned severed at adapter junction',
      photos: ['/api/bookings/evidence/damage1.png'],
    },
    user: ownerUser,
  });
  await reportBookingIssue(validIssReq, validIssRes);
  assert(validIssRes.statusCode === 200, 'Owner submits dispute issue report successfully (200 OK)');
  const issueLoggedDoc = bookingRepo.get(issueFixture.id);
  assert(issueLoggedDoc.issueReport.hasIssue === true, 'issueReport.hasIssue is true');
  assert(issueLoggedDoc.issueReport.category === 'physical_damage', 'issueReport.category is physical_damage');
  assert(issueLoggedDoc.issueReport.photos.length === 1, 'issueReport.photos stored');
  assert(issueLoggedDoc.issueReport.status === 'open', 'issueReport.status is open');

  // 4. Duplicate issue report prevented
  const { req: dupIssReq, res: dupIssRes } = createMockReqRes({
    params: { id: issueFixture.id },
    body: { description: 'Second attempt to log issue', category: 'other' },
    user: ownerUser,
  });
  await reportBookingIssue(dupIssReq, dupIssRes);
  assert(dupIssRes.statusCode === 400, 'Duplicate issue submission rejected with 400');

  // --- Test Suite 7: Evidence File Upload & Authenticated Access Control ---
  console.log('\n--- Test Suite 7: Evidence File Upload & Authenticated Access Control ---');

  const uploadFixture = createFixtureBooking({ status: 'approved' });

  // 1. Unrelated user rejected from uploading evidence
  const { req: unauthUpReq, res: unauthUpRes } = createMockReqRes({
    params: { id: uploadFixture.id },
    body: { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mimeType: 'image/png' },
    user: unrelatedUser,
  });
  await uploadBookingEvidence(unauthUpReq, unauthUpRes);
  assert(unauthUpRes.statusCode === 403, 'Evidence upload rejected with 403 for unrelated user');

  // 2. Authorized borrower uploads valid base64 PNG photo
  const validBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const { req: bUpReq, res: bUpRes } = createMockReqRes({
    params: { id: uploadFixture.id },
    body: { image: validBase64Png, mimeType: 'image/png' },
    user: borrowerUser,
  });
  await uploadBookingEvidence(bUpReq, bUpRes);
  assert(bUpRes.statusCode === 201, 'Borrower uploads evidence successfully (201 Created)');
  assert(bUpRes.jsonResponse.data.relativeUrl.includes('/api/bookings/'), 'relativeUrl generated with authenticated route');
  const uploadedFilename = bUpRes.jsonResponse.data.filename;

  // 3. Unrelated user cannot download/access evidence file
  const { req: unauthGetFileReq, res: unauthGetFileRes } = createMockReqRes({
    params: { id: uploadFixture.id, filename: uploadedFilename },
    user: unrelatedUser,
  });
  await getBookingEvidenceFile(unauthGetFileReq, unauthGetFileRes);
  assert(unauthGetFileRes.statusCode === 403, 'Evidence file download rejected with 403 for unauthorized user');

  // 4. Directory traversal attempt in download is rejected
  const { req: travGetReq, res: travGetRes } = createMockReqRes({
    params: { id: uploadFixture.id, filename: '../../../../package.json' },
    user: borrowerUser,
  });
  await getBookingEvidenceFile(travGetReq, travGetRes);
  assert(travGetRes.statusCode === 400 || travGetRes.statusCode === 404, 'Path traversal attempt in evidence download blocked');

  // --- Test Suite 8: Chronological Evidence Timeline ---
  console.log('\n--- Test Suite 8: Chronological Evidence Timeline ---');

  // Create full lifecycle booking: requested -> approved -> checked_in -> completed -> issue
  const timelineFixture = createFixtureBooking({
    status: 'completed',
    createdAt: new Date('2026-10-25T10:00:00Z'),
    reviewedAt: new Date('2026-10-25T11:00:00Z'),
    checkIn: {
      checkedInAt: new Date('2026-10-25T12:00:00Z'),
      condition: 'excellent',
      notes: 'Initial check-in verified',
      photos: ['/api/bookings/evidence/initial.png'],
      submittedBy: borrowerUser._id,
      reviewedAndConfirmed: true,
    },
    checkOut: {
      checkedOutAt: new Date('2026-10-25T16:00:00Z'),
      condition: 'good',
      notes: 'Returned at 4 PM',
      photos: ['/api/bookings/evidence/return.png'],
      submittedBy: ownerUser._id,
      reviewedAndConfirmed: true,
    },
    issueReport: {
      hasIssue: true,
      reportedBy: ownerUser._id,
      category: 'late_return',
      description: 'Equipment was returned 30 minutes past reserved slot',
      reportedAt: new Date('2026-10-25T16:30:00Z'),
      status: 'open',
    },
  });

  // 1. Unrelated user cannot read timeline
  const { req: unauthTimeReq, res: unauthTimeRes } = createMockReqRes({
    params: { id: timelineFixture.id },
    user: unrelatedUser,
  });
  await getBookingTimeline(unauthTimeReq, unauthTimeRes);
  assert(unauthTimeRes.statusCode === 403, 'Timeline access rejected with 403 for unrelated user');

  // 2. Authorized borrower retrieves complete timeline
  const { req: bTimeReq, res: bTimeRes } = createMockReqRes({
    params: { id: timelineFixture.id },
    user: borrowerUser,
  });
  await getBookingTimeline(bTimeReq, bTimeRes);
  assert(bTimeRes.statusCode === 200, 'Borrower retrieves booking evidence timeline (200 OK)');
  const events = bTimeRes.jsonResponse.timeline;
  assert(events && events.length === 5, 'Timeline contains 5 lifecycle events');

  // 3. Verify event types
  assert(events[0].eventType === 'booking_requested', 'Event 1 is booking_requested');
  assert(events[1].eventType === 'booking_approved', 'Event 2 is booking_approved');
  assert(events[2].eventType === 'handover_proof_submitted', 'Event 3 is handover_proof_submitted');
  assert(events[3].eventType === 'return_proof_submitted', 'Event 4 is return_proof_submitted');
  assert(events[4].eventType === 'issue_reported', 'Event 5 is issue_reported');

  // 4. Verify strictly ascending chronological timestamps
  let isStrictlyChronological = true;
  for (let i = 1; i < events.length; i++) {
    const prevTime = new Date(events[i - 1].timestamp).getTime();
    const currTime = new Date(events[i].timestamp).getTime();
    if (currTime < prevTime) {
      isStrictlyChronological = false;
      break;
    }
  }
  assert(isStrictlyChronological, 'All timeline events are strictly ordered chronologically');

  // 5. Verify actor roles are attributed cleanly
  assert(events[2].actorRole === 'borrower', 'Handover proof event actorRole attributed to borrower');
  assert(events[3].actorRole === 'owner', 'Return proof event actorRole attributed to owner');
  assert(events[4].actorRole === 'owner', 'Issue report event actorRole attributed to owner');

  // --- Final Results ---
  console.log('\n====================================================');
  console.log(`Part 12 Test Summary: Passed: ${testsPassed}, Failed: ${testsFailed}`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runProofTestSuite().catch((err) => {
  console.error('Fatal error in proof test suite:', err);
  process.exit(1);
});

