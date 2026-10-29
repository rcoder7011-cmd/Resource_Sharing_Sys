/**
 * Real-Time Notifications Using Socket.IO Test Suite
 * Resource Sharing Platform — Part 7
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let ClientIO;
try {
  ClientIO = require('socket.io-client').io;
} catch {
  ClientIO = require('../../../client/node_modules/socket.io-client').io;
}

const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const User = require('../models/User');

const {
  initSocket,
  getIO,
  emitToUser,
  closeSocket,
} = require('../socket');
const {
  createAndSendNotification,
  checkAndSendDeadlineReminders,
} = require('../services/notificationService');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  triggerDeadlineReminders,
} = require('../controllers/notificationController');
const {
  createBooking,
  approveBooking,
  rejectBooking,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  reportBookingIssue,
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

async function runNotificationTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 7 Real-Time Notification Test Suite');
  console.log('====================================================\n');

  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';

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

  // Generate tokens
  const ownerToken = jwt.sign({ id: ownerUser._id.toString(), role: 'user' }, jwtSecret, { expiresIn: '1h' });
  const borrowerToken = jwt.sign({ id: borrowerUser._id.toString(), role: 'user' }, jwtSecret, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ id: borrowerUser._id.toString(), role: 'user' }, jwtSecret, { expiresIn: '-1s' });

  // --- Test Suite 1: Notification Model Validation ---
  console.log('--- Test Suite 1: Notification Model Validation ---');

  const validDoc = new Notification({
    recipient: borrowerUser._id,
    type: 'booking_approved',
    title: 'Booking Request Approved',
    message: 'Your reservation for Spectrometer was approved.',
    isRead: false,
  });

  const validErr = validDoc.validateSync();
  assert(!validErr, 'Valid Notification document passes Mongoose schema validation');
  assert(validDoc.isRead === false, 'Default isRead status is strictly false');
  assert(validDoc.readAt === null, 'Default readAt timestamp is null');

  // Missing recipient rejected
  const noRecipientDoc = new Notification({
    type: 'booking_approved',
    title: 'No Recipient',
    message: 'Testing validation error',
  });
  const noRecErr = noRecipientDoc.validateSync();
  assert(noRecErr && noRecErr.errors.recipient, 'Notification without recipient is rejected');

  // Missing type rejected
  const noTypeDoc = new Notification({
    recipient: borrowerUser._id,
    title: 'No Type',
    message: 'Testing validation error',
  });
  const noTypeErr = noTypeDoc.validateSync();
  assert(noTypeErr && noTypeErr.errors.type, 'Notification without type is rejected');

  // Invalid type enum rejected
  const invalidTypeDoc = new Notification({
    recipient: borrowerUser._id,
    type: 'unsupported_custom_notification',
    title: 'Invalid Type',
    message: 'Testing validation error',
  });
  const invTypeErr = invalidTypeDoc.validateSync();
  assert(invTypeErr && invTypeErr.errors.type, 'Notification with invalid type enum is rejected');

  // markAsRead method
  validDoc.save = function () {
    return Promise.resolve(this);
  };
  await validDoc.markAsRead();
  assert(validDoc.isRead === true, 'markAsRead() method updates isRead to true');
  assert(validDoc.readAt instanceof Date, 'markAsRead() records valid readAt Date');

  // toJSON strips __v
  const jsonOutput = validDoc.toJSON();
  assert(jsonOutput.__v === undefined, 'toJSON() strips internal Mongoose __v');

  // --- Test Suite 2: Controller Offline Guard (503 Service Unavailable) ---
  console.log('\n--- Test Suite 2: Controller Offline Guard (503 Service Unavailable) ---');

  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const dummyId = new mongoose.Types.ObjectId().toString();

  const { req: offGetReq, res: offGetRes } = createMockReqRes({
    method: 'GET',
    url: '/api/notifications',
    user: borrowerUser,
  });
  await getNotifications(offGetReq, offGetRes, () => {});
  assert(offGetRes.statusCode === 503, 'GET /api/notifications returns 503 when database is offline');

  const { req: offCountReq, res: offCountRes } = createMockReqRes({
    method: 'GET',
    url: '/api/notifications/unread-count',
    user: borrowerUser,
  });
  await getUnreadCount(offCountReq, offCountRes, () => {});
  assert(offCountRes.statusCode === 503, 'GET /api/notifications/unread-count returns 503 when database is offline');

  const { req: offReadReq, res: offReadRes } = createMockReqRes({
    method: 'PATCH',
    url: `/api/notifications/${dummyId}/read`,
    params: { id: dummyId },
    user: borrowerUser,
  });
  await markAsRead(offReadReq, offReadRes, () => {});
  assert(offReadRes.statusCode === 503, 'PATCH /api/notifications/:id/read returns 503 when database is offline');

  const { req: offReadAllReq, res: offReadAllRes } = createMockReqRes({
    method: 'PATCH',
    url: '/api/notifications/read-all',
    user: borrowerUser,
  });
  await markAllAsRead(offReadAllReq, offReadAllRes, () => {});
  assert(offReadAllRes.statusCode === 503, 'PATCH /api/notifications/read-all returns 503 when database is offline');

  // Restore simulated connected readyState (1)
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // --- Test Suite 3: Socket.IO Server & Authentication Tests ---
  console.log('\n--- Test Suite 3: Socket.IO Server & Authentication Tests ---');

  // Spin up test HTTP server
  const testHttpServer = http.createServer();
  initSocket(testHttpServer);
  assert(getIO() !== null, 'Socket.IO attaches successfully to HTTP server');

  const { socketAuthMiddleware, handleSocketConnection } = require('../socket');

  // 1. Missing token rejected
  await new Promise((resolve) => {
    const mockSocket = { handshake: { auth: {} } };
    socketAuthMiddleware(mockSocket, (err) => {
      assert(err && err.message.includes('Token required'), 'Socket connection without token is rejected');
      resolve();
    });
  });

  // 2. Expired token rejected
  await new Promise((resolve) => {
    const mockSocket = { handshake: { auth: { token: expiredToken } } };
    socketAuthMiddleware(mockSocket, (err) => {
      assert(err && err.message.includes('Token expired'), 'Socket connection with expired token is rejected');
      resolve();
    });
  });

  // 3. Forged/invalid token rejected
  await new Promise((resolve) => {
    const mockSocket = { handshake: { auth: { token: 'forged.invalid.signature' } } };
    socketAuthMiddleware(mockSocket, (err) => {
      assert(err && err.message.includes('Invalid or malformed token'), 'Socket with forged token is rejected');
      resolve();
    });
  });

  // 4. Valid token succeeds and sets socket.user
  await new Promise((resolve) => {
    const mockSocket = { handshake: { auth: { token: borrowerToken } } };
    socketAuthMiddleware(mockSocket, (err) => {
      assert(!err, 'Socket authentication succeeds with valid token');
      assert(mockSocket.user && mockSocket.user._id === borrowerUser._id.toString(), 'Socket user attached with correct decoded user ID');
      resolve();
    });
  });

  // 5. Server-controlled private room join verification
  const joinedRooms = new Set();
  const mockConnectedSocket = {
    user: { _id: borrowerUser._id.toString() },
    join: function (room) {
      joinedRooms.add(room);
    },
    on: function (event, handler) {},
  };

  handleSocketConnection(mockConnectedSocket);
  assert(
    joinedRooms.has(`user:${borrowerUser._id}`),
    'Authenticated socket automatically joins server-controlled user room (user:<userId>)'
  );
  assert(
    !joinedRooms.has(`user:${ownerUser._id}`),
    'User socket does NOT have access to other users private rooms'
  );

  // 6. emitToUser routes to private room
  let targetEmittedRoom = null;
  let emittedEvent = null;
  let emittedData = null;

  const originalIO = getIO();
  // Mock io.to for emitToUser testing
  originalIO.to = function (room) {
    targetEmittedRoom = room;
    return {
      emit: function (event, data) {
        emittedEvent = event;
        emittedData = data;
      },
    };
  };

  const testPayload = { title: 'Test Alert', type: 'booking_approved' };
  const emitSuccess = emitToUser(borrowerUser._id.toString(), 'notification:new', testPayload);

  assert(emitSuccess === true, 'emitToUser returns true when successfully dispatched');
  assert(targetEmittedRoom === `user:${borrowerUser._id}`, 'emitToUser routes event strictly to user:<userId> private room');
  assert(emittedEvent === 'notification:new', 'Emits expected "notification:new" event');
  assert(emittedData.title === 'Test Alert', 'Event payload preserved accurately');

  closeSocket();

  // --- Test Suite 4: Notification Service Persistence & Fallbacks ---
  console.log('\n--- Test Suite 4: Notification Service Persistence & Fallbacks ---');

  // In-memory notifications store
  const notifRepo = new Map();

  Notification.create = function (docData) {
    const _id = new mongoose.Types.ObjectId();
    const created = {
      _id,
      id: _id.toString(),
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: function () {
        notifRepo.set(this._id.toString(), { ...this });
        return Promise.resolve(this);
      },
      toJSON: function () {
        const copy = { ...this };
        delete copy.__v;
        return copy;
      },
    };
    notifRepo.set(_id.toString(), created);
    return Promise.resolve(created);
  };

  Notification.find = function (filter = {}) {
    let items = Array.from(notifRepo.values());
    if (filter.recipient) {
      items = items.filter((n) => n.recipient.toString() === filter.recipient.toString());
    }
    if (filter.isRead !== undefined) {
      items = items.filter((n) => n.isRead === filter.isRead);
    }
    if (filter.booking) {
      items = items.filter((n) => n.booking && n.booking.toString() === filter.booking.toString());
    }
    if (filter.type) {
      items = items.filter((n) => n.type === filter.type);
    }

    const chainable = {
      sort: () => chainable,
      skip: () => chainable,
      limit: () => chainable,
      populate: () => chainable,
      then: (cb) => Promise.resolve(items).then(cb),
    };
    return chainable;
  };

  Notification.findOne = function (filter = {}) {
    const chain = Notification.find(filter);
    return {
      populate: () => chain,
      then: (cb) => chain.then((results) => (results.length > 0 ? results[0] : null)).then(cb),
    };
  };

  Notification.countDocuments = function (filter = {}) {
    return Notification.find(filter).then((results) => results.length);
  };

  Notification.findById = function (id) {
    const found = notifRepo.get(id ? id.toString() : '');
    return Promise.resolve(
      found
        ? {
            ...found,
            save: function () {
              notifRepo.set(this._id.toString(), { ...this });
              return Promise.resolve(this);
            },
          }
        : null
    );
  };

  Notification.updateMany = function (filter = {}, update = {}) {
    let count = 0;
    for (const [id, notif] of notifRepo.entries()) {
      if (filter.recipient && notif.recipient.toString() === filter.recipient.toString()) {
        if (filter.isRead !== undefined && notif.isRead !== filter.isRead) {
          continue;
        }
        notifRepo.set(id, {
          ...notif,
          isRead: update.$set?.isRead !== undefined ? update.$set.isRead : true,
          readAt: update.$set?.readAt || new Date(),
        });
        count++;
      }
    }
    return Promise.resolve({ modifiedCount: count });
  };

  // Test service createAndSendNotification persists before socket
  const persistedNotif = await createAndSendNotification({
    recipient: borrowerUser._id,
    type: 'booking_created',
    title: 'New Booking Created',
    message: 'Your request is in review',
    link: '/dashboard',
  });

  assert(persistedNotif._id !== undefined, 'createAndSendNotification creates and persists document in MongoDB');
  assert(notifRepo.has(persistedNotif._id.toString()), 'Notification exists in database repository');

  // --- Test Suite 5: REST API Controller Endpoints ---
  console.log('\n--- Test Suite 5: REST API Controller Endpoints ---');

  // Add sample notifications for borrower and owner
  await createAndSendNotification({
    recipient: borrowerUser._id,
    type: 'booking_approved',
    title: 'Approved Alert',
    message: 'Booking 1 approved',
  });

  await createAndSendNotification({
    recipient: ownerUser._id,
    type: 'booking_created',
    title: 'Owner Alert',
    message: 'New request for custodian',
  });

  // 1. GET /api/notifications - User only sees their own notifications
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/notifications',
      user: borrowerUser,
    });
    await getNotifications(req, res, () => {});
    assert(res.statusCode === 200, 'GET /api/notifications returns 200 OK');
    assert(res.jsonResponse.data.length === 2, 'Borrower sees only their 2 notifications');
    assert(
      res.jsonResponse.data.every((n) => n.recipient.toString() === borrowerUser._id.toString()),
      'All returned notifications strictly belong to authenticated user'
    );
  }

  // 2. GET /api/notifications/unread-count
  {
    const { req, res } = createMockReqRes({
      method: 'GET',
      url: '/api/notifications/unread-count',
      user: borrowerUser,
    });
    await getUnreadCount(req, res, () => {});
    assert(res.statusCode === 200, 'GET /api/notifications/unread-count returns 200 OK');
    assert(res.jsonResponse.count === 2, 'Reports correct unread count of 2');
  }

  // 3. PATCH /api/notifications/:id/read - User can mark their own as read
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/notifications/${persistedNotif._id}/read`,
      params: { id: persistedNotif._id.toString() },
      user: borrowerUser,
    });
    await markAsRead(req, res, () => {});
    assert(res.statusCode === 200, 'Mark as read returns 200 OK');
    assert(res.jsonResponse.data.isRead === true, 'Notification status is marked isRead: true');

    // Verify unread count decreased to 1
    const { req: cReq, res: cRes } = createMockReqRes({ user: borrowerUser });
    await getUnreadCount(cReq, cRes, () => {});
    assert(cRes.jsonResponse.count === 1, 'Unread count updated to 1 after single read');
  }

  // 4. Non-owner cannot mark another user's notification as read
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: `/api/notifications/${persistedNotif._id}/read`,
      params: { id: persistedNotif._id.toString() },
      user: thirdPartyUser, // stranger
    });
    await markAsRead(req, res, () => {});
    assert(res.statusCode === 403, 'Non-owner attempt to mark notification as read rejected with 403 Forbidden');
  }

  // 5. PATCH /api/notifications/read-all
  {
    const { req, res } = createMockReqRes({
      method: 'PATCH',
      url: '/api/notifications/read-all',
      user: borrowerUser,
    });
    await markAllAsRead(req, res, () => {});
    assert(res.statusCode === 200, 'Mark all as read returns 200 OK');

    const { req: cReq, res: cRes } = createMockReqRes({ user: borrowerUser });
    await getUnreadCount(cReq, cRes, () => {});
    assert(cRes.jsonResponse.count === 0, 'Unread count is 0 after mark-all-as-read');
  }

  // --- Test Suite 6: Booking Deadline Reminders & Idempotency ---
  console.log('\n--- Test Suite 6: Booking Deadline Reminders & Idempotency ---');

  const testBookingId = new mongoose.Types.ObjectId();
  const testResourceTitle = 'Thermal Imaging Sensor';

  // Stub Booking.find for deadline reminders check
  Booking.find = function (query = {}) {
    const doc = {
      _id: testBookingId,
      id: testBookingId.toString(),
      status: 'checked_in',
      requester: borrowerUser._id,
      endAt: new Date(Date.now() + 3600000), // ends in 1 hour
      resource: { _id: new mongoose.Types.ObjectId(), title: testResourceTitle },
    };

    const chainable = {
      populate: () => chainable,
      then: (cb) => Promise.resolve([doc]).then(cb),
    };
    return chainable;
  };

  // Run 1: Should send deadline reminder
  const run1 = await checkAndSendDeadlineReminders({ reminderWindowMinutes: 120 });
  assert(run1.sentCount === 1, 'checkAndSendDeadlineReminders detects approaching deadline and generates notification');
  assert(run1.reminders[0].type === 'booking_deadline_reminder', 'Notification type is "booking_deadline_reminder"');

  // Run 2: Idempotency check — must NOT generate duplicate reminder for the same booking
  const run2 = await checkAndSendDeadlineReminders({ reminderWindowMinutes: 120 });
  assert(run2.sentCount === 0, 'Idempotency verified: duplicate reminder prevented on subsequent check');

  // --- Summary ---
  console.log('\n====================================================');
  console.log(`📊 Part 7 Real-Time Notification Test Results:`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runNotificationTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
