/**
 * Booking & Reservation System Test Suite
 * Resource Sharing Platform — Part 5
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const User = require('../models/User');
const {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  getBookingById,
  cancelBooking,
  approveBooking,
  rejectBooking,
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

async function runBookingTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 5 Booking & Reservation Test Suite');
  console.log('====================================================\n');

  // Test identities
  const ownerUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Dr. Jane Smith (Custodian)',
    email: 'jsmith@university.edu',
    role: 'user',
  };

  const requesterUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Alex Johnson (Student/Researcher)',
    email: 'ajohnson@university.edu',
    role: 'user',
  };

  const secondRequesterUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Sam Lee (Postdoc)',
    email: 'slee@university.edu',
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
    name: 'Facility Director',
    email: 'director@university.edu',
    role: 'admin',
  };

  // Test resource documents
  const singleUnitResource = {
    _id: new mongoose.Types.ObjectId(),
    title: 'High-Resolution Scanning Electron Microscope (SEM)',
    category: 'Testing Equipment',
    resourceType: 'equipment',
    location: { campus: 'North Science Campus', building: 'Materials Hall', room: 'B-14' },
    availabilityStatus: 'available',
    quantity: 1,
    owner: ownerUser._id,
  };

  const multiUnitResource = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Dell Precision High-Performance Workstation Node',
    category: 'Computers',
    resourceType: 'equipment',
    location: { campus: 'Main Academic Campus', building: 'Turing Hall', room: 'Lab 302' },
    availabilityStatus: 'available',
    quantity: 3,
    owner: ownerUser._id,
  };

  const maintenanceResource = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Precision CNC Milling Machine',
    category: 'Workshop Tools',
    resourceType: 'equipment',
    location: { campus: 'Main Academic Campus', building: 'Engineering Lab', room: '104' },
    availabilityStatus: 'maintenance',
    quantity: 1,
    owner: ownerUser._id,
  };

  // --- Test Suite 1: Booking Schema & Model Validation ---
  console.log('--- Test Suite 1: Booking Schema & Model Validation ---');

  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowPlusTwoHours = new Date(tomorrow.getTime() + 7200000);

  const validBookingDoc = new Booking({
    resource: singleUnitResource._id,
    requester: requesterUser._id,
    owner: ownerUser._id,
    startAt: tomorrow,
    endAt: tomorrowPlusTwoHours,
    quantity: 1,
    purpose: 'Crystallography analysis for thesis research chapter 4',
    status: 'pending',
  });

  const validErr = validBookingDoc.validateSync();
  assert(!validErr, 'Valid booking document passes Mongoose schema validation');
  assert(validBookingDoc.status === 'pending', 'Default status is strictly "pending"');
  assert(validBookingDoc.durationMinutes === 120, 'Virtual "durationMinutes" correctly calculates 120 minutes');
  assert(validBookingDoc.isPast === false, 'Virtual "isPast" correctly reports false for future booking');

  // Purpose < 5 chars rejected
  const shortPurposeBooking = new Booking({
    resource: singleUnitResource._id,
    requester: requesterUser._id,
    owner: ownerUser._id,
    startAt: tomorrow,
    endAt: tomorrowPlusTwoHours,
    purpose: 'Test',
  });
  const shortPurposeErr = shortPurposeBooking.validateSync();
  assert(shortPurposeErr && shortPurposeErr.errors.purpose, 'Booking with purpose < 5 chars is rejected');

  // End time <= start time rejected
  const invertedDatesBooking = new Booking({
    resource: singleUnitResource._id,
    requester: requesterUser._id,
    owner: ownerUser._id,
    startAt: tomorrowPlusTwoHours,
    endAt: tomorrow,
    purpose: 'Experimenting with inverted date intervals',
  });
  const invertedErr = invertedDatesBooking.validateSync();
  assert(invertedErr && invertedErr.errors.endAt, 'Booking with end time before start time is rejected by schema validator');

  // Invalid status enum rejected
  const invalidStatusBooking = new Booking({
    resource: singleUnitResource._id,
    requester: requesterUser._id,
    owner: ownerUser._id,
    startAt: tomorrow,
    endAt: tomorrowPlusTwoHours,
    purpose: 'Testing status enums in schema',
    status: 'hacked_status',
  });
  const invalidStatusErr = invalidStatusBooking.validateSync();
  assert(invalidStatusErr && invalidStatusErr.errors.status, 'Booking with invalid status enum is rejected');

  // --- Test Suite 2: Controller Offline Guard (503 Service Unavailable) ---
  console.log('\n--- Test Suite 2: Controller Offline Guard (503 Service Unavailable) ---');

  // When connection state is disconnected (0)
  const origReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const { req: offReq, res: offRes } = createMockReqRes({
    method: 'GET',
    url: '/api/bookings/mine',
    user: requesterUser,
  });
  await getMyBookings(offReq, offRes, () => {});
  assert(offRes.statusCode === 503, 'GET /api/bookings/mine returns 503 when database is offline');

  const { req: offPostReq, res: offPostRes } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: requesterUser,
    body: { resourceId: singleUnitResource._id.toString() },
  });
  await createBooking(offPostReq, offPostRes, () => {});
  assert(offPostRes.statusCode === 503, 'POST /api/bookings returns 503 when database is offline');

  // Restore simulated connected readyState (1)
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // --- In-Memory Repository Setup for Controller End-to-End Tests ---
  const resourceRepo = new Map([
    [singleUnitResource._id.toString(), { ...singleUnitResource }],
    [multiUnitResource._id.toString(), { ...multiUnitResource }],
    [maintenanceResource._id.toString(), { ...maintenanceResource }],
  ]);

  const bookingRepo = new Map();

  // Stub Resource.findById
  Resource.findById = function (id) {
    const found = resourceRepo.get(id ? id.toString() : '');
    return Promise.resolve(found ? { ...found } : null);
  };

  // Stub Booking.create
  Booking.create = function (docData) {
    const _id = new mongoose.Types.ObjectId();
    const created = {
      _id,
      id: _id.toString(),
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date(),
      populate: function () {
        return Promise.resolve(this);
      },
      save: function () {
        bookingRepo.set(this._id.toString(), { ...this });
        return Promise.resolve(this);
      },
    };
    bookingRepo.set(_id.toString(), created);
    return Promise.resolve(created);
  };

  // Stub Booking.findById
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

  // Stub Booking.find
  Booking.find = function (query = {}) {
    let results = Array.from(bookingRepo.values());

    if (query.requester) {
      results = results.filter((b) => b.requester.toString() === query.requester.toString());
    }
    if (query.owner) {
      results = results.filter((b) => b.owner.toString() === query.owner.toString());
    }
    if (query.resource) {
      results = results.filter((b) => b.resource.toString() === query.resource.toString());
    }
    if (query.status) {
      if (typeof query.status === 'object' && query.status.$in) {
        results = results.filter((b) => query.status.$in.includes(b.status));
      } else {
        results = results.filter((b) => b.status === query.status);
      }
    }
    if (query._id && query._id.$ne) {
      results = results.filter((b) => b._id.toString() !== query._id.$ne.toString());
    }
    if (query.startAt && query.startAt.$lt && query.endAt && query.endAt.$gt) {
      // Overlap: existing.startAt < requested.endAt && existing.endAt > requested.startAt
      const reqEnd = new Date(query.startAt.$lt);
      const reqStart = new Date(query.endAt.$gt);
      results = results.filter((b) => new Date(b.startAt) < reqEnd && new Date(b.endAt) > reqStart);
    }

    const chainable = {
      populate: () => chainable,
      sort: () => chainable,
      then: (cb) => Promise.resolve(results).then(cb),
    };
    return chainable;
  };

  // --- Test Suite 3: Booking Request Creation & Validation ---
  console.log('\n--- Test Suite 3: Booking Request Creation & Validation ---');

  // Missing resource ID
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: { purpose: 'Valid purpose for request' },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects missing resource ID with 400');
  }

  // Missing startAt / endAt
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        purpose: 'Valid purpose for request',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects missing dates with 400');
  }

  // Past start time
  {
    const pastStart = new Date(Date.now() - 3600000);
    const pastEnd = new Date(Date.now() + 3600000);
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: pastStart.toISOString(),
        endAt: pastEnd.toISOString(),
        purpose: 'Attempting to book in the past',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects start time in past with 400');
  }

  // End time before start time
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: tomorrowPlusTwoHours.toISOString(),
        endAt: tomorrow.toISOString(),
        purpose: 'End time before start time',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects end time <= start time with 400');
  }

  // Duration < 15 minutes
  {
    const shortEnd = new Date(tomorrow.getTime() + 5 * 60000); // 5 mins
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: tomorrow.toISOString(),
        endAt: shortEnd.toISOString(),
        purpose: 'Too short duration request',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects duration < 15 minutes with 400');
  }

  // Self-booking prohibition
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: ownerUser, // Custodian owns singleUnitResource
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: tomorrow.toISOString(),
        endAt: tomorrowPlusTwoHours.toISOString(),
        purpose: 'Custodian trying to book their own resource',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings strictly prevents self-booking with 400');
  }

  // Unavailable / Maintenance resource booking rejection
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: maintenanceResource._id.toString(),
        startAt: tomorrow.toISOString(),
        endAt: tomorrowPlusTwoHours.toISOString(),
        purpose: 'Requesting equipment in maintenance',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects booking on maintenance resource with 400');
  }

  // Quantity exceeds total capacity
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: tomorrow.toISOString(),
        endAt: tomorrowPlusTwoHours.toISOString(),
        quantity: 5, // Single unit has only 1
        purpose: 'Requesting 5 units of a 1-unit machine',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 400, 'POST /api/bookings rejects quantity exceeding total capacity with 400');
  }

  // Valid booking submission
  let createdBookingId = null;
  {
    const { req, res } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: tomorrow.toISOString(),
        endAt: tomorrowPlusTwoHours.toISOString(),
        quantity: 1,
        purpose: 'High-vacuum surface analysis for doctoral dissertation',
      },
    });
    await createBooking(req, res, () => {});
    assert(res.statusCode === 201, 'POST /api/bookings creates booking with 201 Created');
    assert(res.jsonResponse?.success === true, 'Response indicates success: true');
    assert(res.jsonResponse?.data?.status === 'pending', 'Created booking has initial status: "pending"');
    assert(
      res.jsonResponse?.data?.owner?.toString() === ownerUser._id.toString(),
      'Booking owner is automatically derived from resource owner'
    );
    createdBookingId = res.jsonResponse?.data?._id?.toString();
  }

  // --- Test Suite 4: Requester Endpoints (/mine, /:id, /cancel) ---
  console.log('\n--- Test Suite 4: Requester Endpoints (/mine, /:id, /cancel) ---');

  // GET /api/bookings/mine
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/bookings/mine',
      user: requesterUser,
    });
    await getMyBookings(req, res, () => {});
    assert(res.statusCode === 200, 'GET /api/bookings/mine returns 200 OK');
    assert(res.jsonResponse?.data?.length === 1, 'Requester sees their 1 submitted booking');
  }

  // GET /api/bookings/:id (Requester access)
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: `/api/bookings/${createdBookingId}`,
      params: { id: createdBookingId },
      user: requesterUser,
    });
    await getBookingById(req, res, () => {});
    assert(res.statusCode === 200, 'GET /api/bookings/:id returns 200 for requester');
    assert(res.jsonResponse?.data?._id.toString() === createdBookingId, 'Returns matching booking object');
  }

  // GET /api/bookings/:id (Forbidden for third party)
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: `/api/bookings/${createdBookingId}`,
      params: { id: createdBookingId },
      user: thirdPartyUser,
    });
    await getBookingById(req, res, () => {});
    assert(res.statusCode === 403, 'GET /api/bookings/:id rejects unauthorized third party with 403 Forbidden');
  }

  // PATCH /api/bookings/:id/cancel by unauthorized non-requester
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/cancel`,
      params: { id: createdBookingId },
      user: thirdPartyUser,
    });
    await cancelBooking(req, res, () => {});
    assert(res.statusCode === 403, 'PATCH /api/bookings/:id/cancel rejects non-requester with 403 Forbidden');
  }

  // --- Test Suite 5: Owner Endpoints (/owner, /reject, /approve) ---
  console.log('\n--- Test Suite 5: Owner Endpoints (/owner, /reject, /approve) ---');

  // GET /api/bookings/owner
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/bookings/owner',
      user: ownerUser,
    });
    await getOwnerBookings(req, res, () => {});
    assert(res.statusCode === 200, 'GET /api/bookings/owner returns 200 OK');
    assert(res.jsonResponse?.data?.length === 1, 'Owner sees incoming booking request');
  }

  // Non-owner cannot approve
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/approve`,
      params: { id: createdBookingId },
      user: requesterUser, // Requester cannot approve their own booking
    });
    await approveBooking(req, res, () => {});
    assert(res.statusCode === 403, 'PATCH /api/bookings/:id/approve rejects non-owner with 403 Forbidden');
  }

  // Non-owner cannot reject
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/reject`,
      params: { id: createdBookingId },
      user: thirdPartyUser,
    });
    await rejectBooking(req, res, () => {});
    assert(res.statusCode === 403, 'PATCH /api/bookings/:id/reject rejects non-owner with 403 Forbidden');
  }

  // Owner successfully approves booking
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/approve`,
      params: { id: createdBookingId },
      user: ownerUser,
    });
    await approveBooking(req, res, () => {});
    assert(res.statusCode === 200, 'PATCH /api/bookings/:id/approve succeeds with 200 OK');
    assert(res.jsonResponse?.data?.status === 'approved', 'Booking status transitioned to "approved"');
    assert(Boolean(res.jsonResponse?.data?.reviewedAt), 'Approval timestamp "reviewedAt" was set');
  }

  // Cannot approve already approved booking
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/approve`,
      params: { id: createdBookingId },
      user: ownerUser,
    });
    await approveBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Cannot approve an already approved booking (returns 400)');
  }

  // Requester cancels an approved booking
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/cancel`,
      params: { id: createdBookingId },
      user: requesterUser,
    });
    await cancelBooking(req, res, () => {});
    assert(res.statusCode === 200, 'Requester can cancel their booking with 200 OK');
    assert(res.jsonResponse?.data?.status === 'cancelled', 'Status transitioned to "cancelled"');
    assert(Boolean(res.jsonResponse?.data?.cancelledAt), 'Cancellation timestamp "cancelledAt" was set');
  }

  // Cannot cancel already cancelled booking
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${createdBookingId}/cancel`,
      params: { id: createdBookingId },
      user: requesterUser,
    });
    await cancelBooking(req, res, () => {});
    assert(res.statusCode === 400, 'Cannot cancel an already cancelled booking (returns 400)');
  }

  // Rejection with owner response test
  let rejectedBookingId = null;
  {
    const { req: createReq, res: createRes } = createMockReqRes({
      method: 'POST',
      url: '/api/bookings',
      user: requesterUser,
      body: {
        resourceId: singleUnitResource._id.toString(),
        startAt: new Date(tomorrow.getTime() + 86400000).toISOString(),
        endAt: new Date(tomorrow.getTime() + 90000000).toISOString(),
        quantity: 1,
        purpose: 'Second session experiment for laser optics test',
      },
    });
    await createBooking(createReq, createRes, () => {});
    rejectedBookingId = createRes.jsonResponse?.data?._id?.toString();

    const { req: rejReq, res: rejRes } = createMockReqRes({
      method: 'PATCH',
      url: `/api/bookings/${rejectedBookingId}/reject`,
      params: { id: rejectedBookingId },
      user: ownerUser,
      body: { reason: 'Laser optics calibration scheduled for that afternoon' },
    });
    await rejectBooking(rejReq, rejRes, () => {});
    assert(rejRes.statusCode === 200, 'Owner can reject booking request with 200 OK');
    assert(rejRes.jsonResponse?.data?.status === 'rejected', 'Status updated to "rejected"');
    assert(
      rejRes.jsonResponse?.data?.ownerResponse === 'Laser optics calibration scheduled for that afternoon',
      'Owner rejection reason recorded in booking document'
    );
  }

  // --- Test Suite 6: Overlapping Time Windows & Capacity Enforcement ---
  console.log('\n--- Test Suite 6: Overlap Detection & Multi-Capacity Enforcement ---');

  // Define clear time intervals for testing:
  // Slot A: tomorrow 10:00 to 12:00
  // Slot B (Overlaps A): tomorrow 11:00 to 13:00 (A.start < B.end && A.end > B.start)
  // Slot C (Adjacent to A): tomorrow 12:00 to 14:00 (A ends exactly at 12:00, C starts at 12:00 -> NO OVERLAP)
  // Slot D (Distinct): tomorrow 15:00 to 17:00 (NO OVERLAP)
  const slotA_start = new Date(tomorrow.getTime());
  slotA_start.setHours(10, 0, 0, 0);
  const slotA_end = new Date(tomorrow.getTime());
  slotA_end.setHours(12, 0, 0, 0);

  const slotB_start = new Date(tomorrow.getTime());
  slotB_start.setHours(11, 0, 0, 0);
  const slotB_end = new Date(tomorrow.getTime());
  slotB_end.setHours(13, 0, 0, 0);

  const slotC_start = new Date(tomorrow.getTime());
  slotC_start.setHours(12, 0, 0, 0);
  const slotC_end = new Date(tomorrow.getTime());
  slotC_end.setHours(14, 0, 0, 0);

  // 1. Single-unit resource double-booking rejection:
  // Create & approve Booking A
  const { req: reqA, res: resA } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: requesterUser,
    body: {
      resourceId: singleUnitResource._id.toString(),
      startAt: slotA_start.toISOString(),
      endAt: slotA_end.toISOString(),
      quantity: 1,
      purpose: 'Slot A reservation for single unit machine',
    },
  });
  await createBooking(reqA, resA, () => {});
  const bookingAId = resA.jsonResponse?.data?._id?.toString();

  const { req: reqApproveA, res: approveResA } = createMockReqRes({
    method: 'PATCH',
    url: `/api/bookings/${bookingAId}/approve`,
    params: { id: bookingAId },
    user: ownerUser,
  });
  await approveBooking(reqApproveA, approveResA, () => {});
  assert(approveResA.statusCode === 200, 'Slot A booking on single-unit resource is approved');

  // Create overlapping Booking B
  const { req: reqB, res: resB } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: secondRequesterUser,
    body: {
      resourceId: singleUnitResource._id.toString(),
      startAt: slotB_start.toISOString(),
      endAt: slotB_end.toISOString(),
      quantity: 1,
      purpose: 'Slot B reservation overlapping Slot A by 1 hour',
    },
  });
  await createBooking(reqB, resB, () => {});
  const bookingBId = resB.jsonResponse?.data?._id?.toString();

  // Attempt to approve overlapping Booking B -> Must be rejected with 409 Conflict
  const { req: reqApproveB, res: approveResB } = createMockReqRes({
    method: 'PATCH',
    url: `/api/bookings/${bookingBId}/approve`,
    params: { id: bookingBId },
    user: ownerUser,
  });
  await approveBooking(reqApproveB, approveResB, () => {});
  assert(
    approveResB.statusCode === 409,
    'Conflicting overlapping booking approval is rejected with 409 Conflict'
  );
  assert(
    approveResB.jsonResponse?.message?.includes('overlapping confirmed bookings exceed total resource capacity'),
    'Conflict message describes capacity limitation'
  );

  // 2. Adjacent booking: Slot C (starts exactly at 12:00, when Slot A ends at 12:00)
  // Must NOT conflict and must be successfully approved!
  const { req: reqC, res: resC } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: secondRequesterUser,
    body: {
      resourceId: singleUnitResource._id.toString(),
      startAt: slotC_start.toISOString(),
      endAt: slotC_end.toISOString(),
      quantity: 1,
      purpose: 'Slot C reservation immediately adjacent to Slot A',
    },
  });
  await createBooking(reqC, resC, () => {});
  const bookingCId = resC.jsonResponse?.data?._id?.toString();

  const { req: reqApproveC, res: approveResC } = createMockReqRes({
    method: 'PATCH',
    url: `/api/bookings/${bookingCId}/approve`,
    params: { id: bookingCId },
    user: ownerUser,
  });
  await approveBooking(reqApproveC, approveResC, () => {});
  assert(
    approveResC.statusCode === 200,
    'Adjacent booking (sharing start/end boundary without overlap) is approved successfully'
  );

  // 3. Multi-unit capacity check:
  // multiUnitResource has quantity = 3
  // Requester 1 books 2 units for Slot A -> Approved (2/3 booked)
  // Requester 2 books 1 unit for Slot A -> Approved (3/3 booked)
  // Requester 3 books 1 unit for Slot A -> Rejected with 409 (4/3 exceeds capacity)
  const { req: reqMultiA, res: multiA } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: requesterUser,
    body: {
      resourceId: multiUnitResource._id.toString(),
      startAt: slotA_start.toISOString(),
      endAt: slotA_end.toISOString(),
      quantity: 2,
      purpose: 'Need 2 workstation nodes for distributed simulation',
    },
  });
  await createBooking(reqMultiA, multiA, () => {});
  const multiAId = multiA.jsonResponse?.data?._id?.toString();

  const { req: reqMultiApproveA, res: multiAApprove } = createMockReqRes({
    method: 'PATCH',
    url: `/api/bookings/${multiAId}/approve`,
    params: { id: multiAId },
    user: ownerUser,
  });
  await approveBooking(reqMultiApproveA, multiAApprove, () => {});
  assert(multiAApprove.statusCode === 200, 'Multi-unit: First booking (2/3 units) is approved');

  // Second requester books remaining 1 unit
  const { req: reqMultiB, res: multiB } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: secondRequesterUser,
    body: {
      resourceId: multiUnitResource._id.toString(),
      startAt: slotA_start.toISOString(),
      endAt: slotA_end.toISOString(),
      quantity: 1,
      purpose: 'Need 1 workstation node for compiling kernel',
    },
  });
  await createBooking(reqMultiB, multiB, () => {});
  const multiBId = multiB.jsonResponse?.data?._id?.toString();

  const { req: reqMultiApproveB, res: multiBApprove } = createMockReqRes({
    method: 'PATCH',
    url: `/api/bookings/${multiBId}/approve`,
    params: { id: multiBId },
    user: ownerUser,
  });
  await approveBooking(reqMultiApproveB, multiBApprove, () => {});
  assert(multiBApprove.statusCode === 200, 'Multi-unit: Second booking filling capacity (3/3 units) is approved');

  // Third requester requests 1 unit in overlapping time -> Capacity exceeded
  const { req: reqMultiC, res: multiC } = createMockReqRes({
    method: 'POST',
    url: '/api/bookings',
    user: thirdPartyUser,
    body: {
      resourceId: multiUnitResource._id.toString(),
      startAt: slotA_start.toISOString(),
      endAt: slotA_end.toISOString(),
      quantity: 1,
      purpose: 'Third requester asking for 1 workstation when all 3 are booked',
    },
  });
  await createBooking(reqMultiC, multiC, () => {});
  const multiCId = multiC.jsonResponse?.data?._id?.toString();

  const { req: reqMultiApproveC, res: multiCApprove } = createMockReqRes({
    method: 'PATCH',
    url: `/api/bookings/${multiCId}/approve`,
    params: { id: multiCId },
    user: ownerUser,
  });
  await approveBooking(reqMultiApproveC, multiCApprove, () => {});
  assert(
    multiCApprove.statusCode === 409,
    'Multi-unit: Third booking exceeding remaining capacity is rejected with 409 Conflict'
  );

  // --- Test Suite 7: Express Router & Architecture Integrity ---
  console.log('\n--- Test Suite 7: Express Router & Architecture Integrity ---');
  Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
  const app = require('../app');
  assert(typeof app === 'function', 'Express application is valid handler function');

  console.log('\n====================================================');
  console.log(`🏁 Part 5 Booking Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runBookingTestSuite().catch((err) => {
  console.error('Fatal error in booking test suite:', err);
  process.exit(1);
});
