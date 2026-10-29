/**
 * Check-in, Check-out & Condition Verification Test Suite
 * Resource Sharing Platform — Part 6
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const User = require('../models/User');
const {
  checkInBooking,
  checkOutBooking,
  reportBookingIssue,
  getBookingCondition,
  approveBooking,
  cancelBooking,
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

async function runConditionTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 6 Condition & Handover Test Suite');
  console.log('====================================================\n');

  // Test identities
  const ownerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Dr. Jane Smith (Custodian)',
    email: 'jsmith@university.edu',
    role: 'user',
  };

  const borrowerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Alex Johnson (Borrower)',
    email: 'ajohnson@university.edu',
    role: 'user',
  };

  const thirdPartyUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Stranger User',
    email: 'stranger@university.edu',
    role: 'user',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Lab Administrator',
    email: 'admin@university.edu',
    role: 'admin',
  };

  // Test resources
  const singleUnitResource = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Precision Spectral Analyzer',
    category: 'Testing Equipment',
    resourceType: 'equipment',
    location: { campus: 'North Campus', building: 'Physics Hall', room: '101' },
    availabilityStatus: 'available',
    condition: 'excellent',
    quantity: 1,
    owner: ownerUser._id,
  };

  // --- Test Suite 1: Booking Model Part 6 Schema Validation ---
  console.log('--- Test Suite 1: Booking Model Part 6 Schema Validation ---');

  const now = new Date();
  const futureStart = new Date(Date.now() + 3600000);
  const futureEnd = new Date(Date.now() + 7200000);

  // Status 'checked_in' is accepted in enum
  const checkedInBookingDoc = new Booking({
    resource: singleUnitResource._id,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Optical diffraction research session',
    status: 'checked_in',
    checkIn: {
      checkedInAt: now,
      condition: 'good',
      notes: 'Initial test run clean, slight dust on lens cover',
      photos: ['https://example.com/photos/checkin1.jpg'],
    },
  });

  const checkedInErr = checkedInBookingDoc.validateSync();
  assert(!checkedInErr, "Booking schema accepts 'checked_in' status and valid checkIn subdocument");
  assert(checkedInBookingDoc.checkIn.condition === 'good', 'checkIn condition recorded as "good"');
  assert(checkedInBookingDoc.checkIn.photos.length === 1, 'checkIn photos array parsed correctly');

  // Completed booking with checkOut and conditionComparison
  const completedBookingDoc = new Booking({
    resource: singleUnitResource._id,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Complete usage and handover testing',
    status: 'completed',
    checkIn: {
      checkedInAt: new Date(Date.now() - 3600000),
      condition: 'excellent',
      notes: 'Checked out in pristine state',
    },
    checkOut: {
      checkedOutAt: now,
      condition: 'fair',
      notes: 'Surface scratch on side casing',
    },
    conditionComparison: {
      isWorsened: true,
      difference: 'degraded',
    },
  });

  const completedErr = completedBookingDoc.validateSync();
  assert(!completedErr, "Booking schema accepts 'completed' with checkOut and conditionComparison");
  assert(completedBookingDoc.conditionComparison.isWorsened === true, 'isWorsened flag validates boolean');

  // Invalid checkIn condition enum rejected
  const invalidCondDoc = new Booking({
    resource: singleUnitResource._id,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Valid purpose testing invalid condition',
    status: 'checked_in',
    checkIn: {
      checkedInAt: now,
      condition: 'brand_new_custom', // invalid enum
    },
  });
  const invalidCondErr = invalidCondDoc.validateSync();
  assert(invalidCondErr && invalidCondErr.errors['checkIn.condition'], 'Invalid checkIn condition enum rejected by Mongoose schema');

  // Invalid checkOut condition enum rejected
  const invalidOutCondDoc = new Booking({
    resource: singleUnitResource._id,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Valid purpose testing invalid checkout condition',
    status: 'completed',
    checkOut: {
      checkedOutAt: now,
      condition: 'destroyed', // not in enum ['excellent', 'good', 'fair', 'damaged']
    },
  });
  const invalidOutCondErr = invalidOutCondDoc.validateSync();
  assert(invalidOutCondErr && invalidOutCondErr.errors['checkOut.condition'], 'Invalid checkOut condition enum rejected by Mongoose schema');

  // Issue report subdocument validation
  const issueBookingDoc = new Booking({
    resource: singleUnitResource._id,
    requester: borrowerUser._id,
    owner: ownerUser._id,
    startAt: futureStart,
    endAt: futureEnd,
    purpose: 'Valid purpose with issue reported',
    status: 'completed',
    issueReport: {
      hasIssue: true,
      reportedBy: ownerUser._id,
      description: 'Power calibration dial loose and requires maintenance',
      reportedAt: now,
      status: 'open',
    },
  });
  const issueDocErr = issueBookingDoc.validateSync();
  assert(!issueDocErr, 'issueReport subdocument conforms to schema');
  assert(issueBookingDoc.issueReport.hasIssue === true, 'issueReport.hasIssue evaluates true');

  // --- Test Suite 2: Controller Offline Guard (503 Service Unavailable) ---
  console.log('\n--- Test Suite 2: Controller Offline Guard (503 Service Unavailable) ---');

  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const dummyId = new mongoose.Types.ObjectId().toString();

  const { req: offInReq, res: offInRes } = createMockReqRes({
    method: 'POST',
    url: `/api/bookings/${dummyId}/check-in`,
    params: { id: dummyId },
    user: borrowerUser,
  });
  await checkInBooking(offInReq, offInRes, () => {});
  assert(offInRes.statusCode === 503, 'POST /api/bookings/:id/check-in returns 503 when database is offline');

  const { req: offOutReq, res: offOutRes } = createMockReqRes({
    method: 'POST',
    url: `/api/bookings/${dummyId}/check-out`,
    params: { id: dummyId },
    user: borrowerUser,
  });
  await checkOutBooking(offOutReq, offOutRes, () => {});
  assert(offOutRes.statusCode === 503, 'POST /api/bookings/:id/check-out returns 503 when database is offline');

  const { req: offIssueReq, res: offIssueRes } = createMockReqRes({
    method: 'POST',
    url: `/api/bookings/${dummyId}/report-issue`,
    params: { id: dummyId },
    user: borrowerUser,
  });
  await reportBookingIssue(offIssueReq, offIssueRes, () => {});
  assert(offIssueRes.statusCode === 503, 'POST /api/bookings/:id/report-issue returns 503 when database is offline');

  const { req: offCondReq, res: offCondRes } = createMockReqRes({
    method: 'GET',
    url: `/api/bookings/${dummyId}/condition`,
    params: { id: dummyId },
    user: borrowerUser,
  });
  await getBookingCondition(offCondReq, offCondRes, () => {});
  assert(offCondRes.statusCode === 503, 'GET /api/bookings/:id/condition returns 503 when database is offline');

  // Restore simulated connected readyState (1)
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // --- In-Memory Repository Setup for Controller End-to-End Tests ---
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

  // Helper to store fixture bookings
  const createFixtureBooking = (overrides = {}) => {
    const _id = new mongoose.Types.ObjectId();
    const doc = {
      _id,
      id: _id.toString(),
      resource: singleUnitResource._id,
      requester: borrowerUser._id,
      owner: ownerUser._id,
      startAt: new Date(Date.now() - 1800000), // started 30 min ago
      endAt: new Date(Date.now() + 3600000),   // ends in 1 hour
      quantity: 1,
      purpose: 'Lab session for Part 6 verification',
      status: 'approved',
      checkIn: {},
      checkOut: {},
      conditionComparison: {},
      issueReport: {},
      save: function () {
        bookingRepo.set(this._id.toString(), { ...this });
        return Promise.resolve(this);
      },
      populate: function () {
        return Promise.resolve(this);
      },
      ...overrides,
    };
    bookingRepo.set(_id.toString(), doc);
    return doc;
  };

  // --- Test Suite 3: Check-in / Pickup Controller Tests ---
  console.log('\n--- Test Suite 3: Check-in / Pickup Controller Tests ---');

  // Successful borrower check-in on approved booking
  {
    const booking = createFixtureBooking({ status: 'approved' });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: borrowerUser,
      body: {
        condition: 'good',
        notes: 'Equipment received in good working condition',
        photos: ['https://example.com/p1.jpg'],
      },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 200, 'Borrower check-in succeeds with 200 OK');
    assert(res.jsonResponse.data.status === 'checked_in', 'Booking status transitioned to "checked_in"');
    assert(res.jsonResponse.data.checkIn.condition === 'good', 'checkIn condition recorded as "good"');
    assert(res.jsonResponse.data.checkIn.notes === 'Equipment received in good working condition', 'checkIn notes recorded');
    assert(res.jsonResponse.data.checkIn.checkedInAt, 'checkIn timestamp recorded');
  }

  // Duplicate check-in rejected
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
    });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'good' },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Duplicate check-in rejected with 400 Bad Request');
    assert(
      (res.jsonResponse.message || res.jsonResponse.error || '').includes('already checked in'),
      'Returns descriptive error on duplicate check-in'
    );
  }

  // Check-in on unapproved (pending) booking rejected
  {
    const booking = createFixtureBooking({ status: 'pending' });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'good' },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Check-in on pending booking rejected with 400');
  }

  // Check-in on rejected or cancelled booking rejected
  {
    const booking = createFixtureBooking({ status: 'rejected' });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'good' },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Check-in on rejected booking rejected with 400');
  }

  // Check-in after booking end time expired rejected
  {
    const booking = createFixtureBooking({
      status: 'approved',
      startAt: new Date(Date.now() - 7200000), // 2 hrs ago
      endAt: new Date(Date.now() - 3600000),   // ended 1 hr ago
    });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'good' },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Check-in on expired booking period rejected with 400');
    assert(
      (res.jsonResponse.message || res.jsonResponse.error || '').includes('expired'),
      'Mentions booking reservation window expired'
    );
  }

  // Check-in attempted by non-borrower (custodian or stranger) rejected with 403
  {
    const booking = createFixtureBooking({ status: 'approved' });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: ownerUser, // resource owner attempting to check in instead of borrower
      body: { condition: 'good' },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 403, 'Check-in by resource owner / non-borrower rejected with 403 Forbidden');
  }

  // Check-in with invalid condition enum value rejected with 400
  {
    const booking = createFixtureBooking({ status: 'approved' });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-in`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'pristine_non_standard' },
    });

    await checkInBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Check-in with invalid condition value rejected with 400');
  }

  // --- Test Suite 4: Check-out / Return & Condition Comparison ---
  console.log('\n--- Test Suite 4: Check-out / Return & Condition Comparison ---');

  // Successful check-out with maintained condition (good -> good)
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: {
        checkedInAt: new Date(Date.now() - 1800000),
        condition: 'good',
        notes: 'Pickup notes',
      },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-out`,
      params: { id: booking.id },
      user: borrowerUser,
      body: {
        condition: 'good',
        notes: 'Returned promptly, cleaned and powered down',
      },
    });

    await checkOutBooking(req, res, () => {});
    assert(res.statusCode === 200, 'Borrower check-out succeeds with 200 OK');
    assert(res.jsonResponse.data.status === 'completed', 'Status transitioned to "completed"');
    assert(res.jsonResponse.data.checkOut.condition === 'good', 'checkOut condition recorded as "good"');
    assert(res.jsonResponse.data.conditionComparison.isWorsened === false, 'Maintained condition: isWorsened is false');
    assert(res.jsonResponse.data.conditionComparison.difference === 'consistent', 'Maintained condition: difference is "consistent"');
  }

  // Check-out with degraded condition (excellent -> fair)
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: {
        checkedInAt: new Date(Date.now() - 1800000),
        condition: 'excellent',
        notes: 'Pristine pickup',
      },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-out`,
      params: { id: booking.id },
      user: borrowerUser,
      body: {
        condition: 'fair',
        notes: 'Minor scratch occurred during experiment table transit',
      },
    });

    await checkOutBooking(req, res, () => {});
    assert(res.statusCode === 200, 'Check-out with condition degradation succeeds with 200 OK');
    assert(res.jsonResponse.data.conditionComparison.isWorsened === true, 'Degraded condition: isWorsened evaluates strictly true');
    assert(res.jsonResponse.data.conditionComparison.difference === 'degraded', 'Degraded condition: difference is "degraded"');
  }

  // Check-out with improved condition (fair -> good)
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: {
        checkedInAt: new Date(Date.now() - 1800000),
        condition: 'fair',
        notes: 'Dirty filter at pickup',
      },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-out`,
      params: { id: booking.id },
      user: borrowerUser,
      body: {
        condition: 'good',
        notes: 'Replaced disposable dust filter and cleaned unit',
      },
    });

    await checkOutBooking(req, res, () => {});
    assert(res.statusCode === 200, 'Check-out with condition improvement succeeds with 200 OK');
    assert(res.jsonResponse.data.conditionComparison.isWorsened === false, 'Improved condition: isWorsened is false');
    assert(res.jsonResponse.data.conditionComparison.difference === 'improved', 'Improved condition: difference is "improved"');
  }

  // Check-out on booking that has NOT been checked in rejected with 400
  {
    const booking = createFixtureBooking({ status: 'approved' }); // approved but not checked_in
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-out`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'good' },
    });

    await checkOutBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Check-out without prior check-in rejected with 400');
  }

  // Duplicate check-out rejected with 400
  {
    const booking = createFixtureBooking({
      status: 'completed',
      checkOut: { checkedOutAt: new Date(), condition: 'good' },
    });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-out`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { condition: 'good' },
    });

    await checkOutBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Duplicate check-out rejected with 400 Bad Request');
  }

  // Check-out attempted by non-borrower rejected with 403
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
    });
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/check-out`,
      params: { id: booking.id },
      user: thirdPartyUser,
      body: { condition: 'good' },
    });

    await checkOutBooking(req, res, () => {});
    assert(res.statusCode === 403, 'Check-out by unauthorized party rejected with 403');
  }

  // --- Test Suite 5: Issue Reporting Controller Tests ---
  console.log('\n--- Test Suite 5: Issue Reporting Controller Tests ---');

  // Borrower reports issue on active checked_in booking
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/report-issue`,
      params: { id: booking.id },
      user: borrowerUser,
      body: {
        description: 'Notice slight vibration in motor rotor assembly when spinning up',
      },
    });

    await reportBookingIssue(req, res, () => {});
    assert(res.statusCode === 200, 'Borrower issue report succeeds with 200 OK');
    assert(res.jsonResponse.data.issueReport.hasIssue === true, 'issueReport.hasIssue set to true');
    assert(res.jsonResponse.data.issueReport.reportedBy.toString() === borrowerUser._id.toString(), 'reportedBy correctly records borrower ID');
    assert(res.jsonResponse.data.issueReport.status === 'open', 'Initial issue status is "open"');
  }

  // Custodian reports issue on completed booking
  {
    const booking = createFixtureBooking({
      status: 'completed',
      checkIn: { checkedInAt: new Date(Date.now() - 3600000), condition: 'good' },
      checkOut: { checkedOutAt: new Date(), condition: 'good' },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/report-issue`,
      params: { id: booking.id },
      user: ownerUser, // Custodian
      body: {
        description: 'Post-return inspection revealed missing HDMI-to-DVI adapter cable',
      },
    });

    await reportBookingIssue(req, res, () => {});
    assert(res.statusCode === 200, 'Custodian issue report succeeds with 200 OK');
    assert(res.jsonResponse.data.issueReport.hasIssue === true, 'issueReport.hasIssue set to true');
    assert(res.jsonResponse.data.issueReport.reportedBy.toString() === ownerUser._id.toString(), 'reportedBy records custodian ID');
  }

  // Issue report with description < 5 characters rejected
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/report-issue`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { description: 'Bad' },
    });

    await reportBookingIssue(req, res, () => {});
    assert(res.statusCode === 400, 'Issue report with description < 5 chars rejected with 400');
  }

  // Duplicate issue report on same booking rejected
  {
    const booking = createFixtureBooking({
      status: 'completed',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
      checkOut: { checkedOutAt: new Date(), condition: 'good' },
      issueReport: {
        hasIssue: true,
        description: 'First issue report already recorded',
        reportedAt: new Date(),
      },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/report-issue`,
      params: { id: booking.id },
      user: ownerUser,
      body: { description: 'Second issue report attempt' },
    });

    await reportBookingIssue(req, res, () => {});
    assert(res.statusCode === 400, 'Duplicate issue report rejected with 400 Bad Request');
  }

  // Issue report on booking before handover occurs (e.g. pending or approved) rejected
  {
    const booking = createFixtureBooking({ status: 'approved' }); // Not checked in yet
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/report-issue`,
      params: { id: booking.id },
      user: borrowerUser,
      body: { description: 'Premature issue report before handover' },
    });

    await reportBookingIssue(req, res, () => {});
    assert(res.statusCode === 400, 'Issue report before resource pickup / handover rejected with 400');
  }

  // Unauthorized stranger cannot report issue
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
    });

    const { req, res } = createMockReqRes({
      method: 'POST',
      url: `/api/bookings/${booking.id}/report-issue`,
      params: { id: booking.id },
      user: thirdPartyUser,
      body: { description: 'Unauthorized report by non-stakeholder' },
    });

    await reportBookingIssue(req, res, () => {});
    assert(res.statusCode === 403, 'Issue report by unauthorized user rejected with 403');
  }

  // --- Test Suite 6: Condition Query & Handover Audit Endpoint ---
  console.log('\n--- Test Suite 6: Condition Query & Handover Audit Endpoint ---');

  // Authorized borrower retrieves condition
  {
    const booking = createFixtureBooking({
      status: 'completed',
      checkIn: { checkedInAt: new Date(Date.now() - 3600000), condition: 'excellent', notes: 'Great' },
      checkOut: { checkedOutAt: new Date(), condition: 'good', notes: 'Good' },
      conditionComparison: { isWorsened: true, difference: 'degraded' },
      issueReport: { hasIssue: false },
    });

    const { req, res } = createMockReqRes({
      method: 'GET',
      url: `/api/bookings/${booking.id}/condition`,
      params: { id: booking.id },
      user: borrowerUser,
    });

    await getBookingCondition(req, res, () => {});
    assert(res.statusCode === 200, 'Borrower retrieves condition audit record with 200 OK');
    assert(res.jsonResponse.data.checkIn.condition === 'excellent', 'Returns checkIn condition');
    assert(res.jsonResponse.data.checkOut.condition === 'good', 'Returns checkOut condition');
    assert(res.jsonResponse.data.conditionComparison.isWorsened === true, 'Returns conditionComparison');
  }

  // Custodian retrieves condition
  {
    const booking = createFixtureBooking({
      status: 'completed',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
      checkOut: { checkedOutAt: new Date(), condition: 'good' },
      conditionComparison: { isWorsened: false, difference: 'consistent' },
    });

    const { req, res } = createMockReqRes({
      method: 'GET',
      url: `/api/bookings/${booking.id}/condition`,
      params: { id: booking.id },
      user: ownerUser,
    });

    await getBookingCondition(req, res, () => {});
    assert(res.statusCode === 200, 'Custodian retrieves condition audit record with 200 OK');
  }

  // Admin retrieves condition
  {
    const booking = createFixtureBooking({
      status: 'completed',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
      checkOut: { checkedOutAt: new Date(), condition: 'good' },
    });

    const { req, res } = createMockReqRes({
      method: 'GET',
      url: `/api/bookings/${booking.id}/condition`,
      params: { id: booking.id },
      user: adminUser,
    });

    await getBookingCondition(req, res, () => {});
    assert(res.statusCode === 200, 'Admin retrieves condition audit record with 200 OK');
  }

  // Unauthorized user rejected on condition query
  {
    const booking = createFixtureBooking({ status: 'completed' });
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: `/api/bookings/${booking.id}/condition`,
      params: { id: booking.id },
      user: thirdPartyUser,
    });

    await getBookingCondition(req, res, () => {});
    assert(res.statusCode === 403, 'Third-party user denied condition audit access with 403');
  }

  // --- Test Suite 7: Handover State Protection & Capacity Safety ---
  console.log('\n--- Test Suite 7: Handover State Protection & Capacity Safety ---');

  // Borrower CANNOT cancel a booking while it is in 'checked_in' state
  {
    const booking = createFixtureBooking({
      status: 'checked_in',
      checkIn: { checkedInAt: new Date(), condition: 'good' },
    });

    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${booking.id}/cancel`,
      params: { id: booking.id },
      user: borrowerUser,
    });

    await cancelBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Cancelling active checked-in booking rejected with 400');
    assert(
      (res.jsonResponse.message || res.jsonResponse.error || '').includes(
        'check-out/return instead'
      ),
      'Error instructs borrower to complete return'
    );
  }

  // Capacity overlap check: Checked-in booking occupies inventory just like approved
  {
    // Stub Booking.find for overlap check simulation
    Booking.find = function (query = {}) {
      const results = Array.from(bookingRepo.values()).filter((b) => {
        if (query.resource && b.resource.toString() !== query.resource.toString()) return false;
        if (query.status && query.status.$in) {
          if (!query.status.$in.includes(b.status)) return false;
        }
        return true;
      });

      const chainable = {
        populate: () => chainable,
        sort: () => chainable,
        then: (cb) => Promise.resolve(results).then(cb),
      };
      return chainable;
    };

    // Store a checked_in booking that holds the only unit of singleUnitResource
    createFixtureBooking({
      resource: singleUnitResource._id,
      status: 'checked_in',
      startAt: new Date(Date.now() - 1800000),
      endAt: new Date(Date.now() + 3600000),
      quantity: 1,
    });

    // A pending booking attempting to get approved in the same slot
    const pendingToApprove = createFixtureBooking({
      resource: singleUnitResource._id,
      status: 'pending',
      startAt: new Date(Date.now() - 900000),
      endAt: new Date(Date.now() + 1800000),
      quantity: 1,
    });

    // Stub Resource.findById for single unit
    Resource.findById = () => Promise.resolve({ ...singleUnitResource });

    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${pendingToApprove.id}/approve`,
      params: { id: pendingToApprove.id },
      user: ownerUser,
    });

    await approveBooking(req, res, () => {});
    assert(res.statusCode === 409, 'Approval blocked with 409 Conflict when active checked-in booking occupies capacity');
  }

  // --- Summary ---
  console.log('\n====================================================');
  console.log(`📊 Part 6 Condition & Handover Test Results:`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runConditionTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
