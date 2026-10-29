const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const chatService = require('../services/chatService');

let passedTests = 0;
let failedTests = 0;

function pass(name) {
  passedTests++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name, err) {
  failedTests++;
  console.error(`  ❌ FAIL: ${name}`, err);
}

// In-Memory Test Store simulating MongoDB models for fast isolated testing
class MockQuery {
  constructor(data) {
    this._data = data;
  }
  populate() {
    return this;
  }
  sort() {
    if (Array.isArray(this._data)) {
      return Promise.resolve([...this._data]);
    }
    return Promise.resolve(this._data);
  }
  then(resolve, reject) {
    return Promise.resolve(this._data).then(resolve, reject);
  }
}

async function runChatTests() {
  console.log('====================================================');
  console.log('🧪 Starting Part 17 In-App Chat & Pickup Coordination Test Suite');
  console.log('====================================================');

  const borrowerId = new mongoose.Types.ObjectId();
  const ownerId = new mongoose.Types.ObjectId();
  const strangerId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const resourceId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();

  // Simulate connected database state for isolated unit tests
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const mockBooking = {
    _id: bookingId,
    resource: resourceId,
    requester: borrowerId,
    owner: ownerId,
    status: 'approved',
    startAt: new Date(Date.now() + 86400000),
    endAt: new Date(Date.now() + 172800000),
    pickupCoordination: {
      exactLocation: 'Room 304, Advanced Physics Lab',
      instructions: 'Ring bell at entrance',
      targetTime: new Date(Date.now() + 90000000),
      ownerPhone: '+91 98765 43210',
      requesterPhone: '+91 91234 56789',
      sharePhoneWithRequester: false,
      sharePhoneWithOwner: false,
    },
    save: async function () {
      return this;
    },
  };

  // --- Test Suite 1: Model Schema Validation ---
  console.log('\n--- Test Suite 1: Chat Models Schema Validation ---');

  try {
    const validConv = new Conversation({
      booking: bookingId,
      resource: resourceId,
      participants: [borrowerId, ownerId],
      lastMessage: { text: 'Hello', sentAt: new Date() },
    });
    const err = validConv.validateSync();
    assert.strictEqual(err, undefined);
    pass('Valid Conversation passes Mongoose validation');
  } catch (err) {
    fail('Valid Conversation passes Mongoose validation', err);
  }

  try {
    const invalidConv = new Conversation({});
    const err = invalidConv.validateSync();
    assert(err && err.errors.booking);
    pass('Conversation without booking reference is rejected');
  } catch (err) {
    fail('Conversation without booking reference is rejected', err);
  }

  try {
    const validMsg = new Message({
      conversation: new mongoose.Types.ObjectId(),
      booking: bookingId,
      sender: borrowerId,
      recipient: ownerId,
      text: 'Can I pick up the camera at 10 AM?',
    });
    const err = validMsg.validateSync();
    assert.strictEqual(err, undefined);
    pass('Valid Message passes Mongoose validation');
  } catch (err) {
    fail('Valid Message passes Mongoose validation', err);
  }

  try {
    const emptyMsg = new Message({
      conversation: new mongoose.Types.ObjectId(),
      booking: bookingId,
      sender: borrowerId,
      recipient: ownerId,
      text: '',
    });
    const err = emptyMsg.validateSync();
    assert(err && err.errors.text);
    pass('Message with empty text is rejected');
  } catch (err) {
    fail('Message with empty text is rejected', err);
  }

  try {
    const longMsg = new Message({
      conversation: new mongoose.Types.ObjectId(),
      booking: bookingId,
      sender: borrowerId,
      recipient: ownerId,
      text: 'a'.repeat(2001),
    });
    const err = longMsg.validateSync();
    assert(err && err.errors.text);
    pass('Message exceeding 2000 characters is rejected');
  } catch (err) {
    fail('Message exceeding 2000 characters is rejected', err);
  }

  // --- Test Suite 2: Participation & Access Control Logic ---
  console.log('\n--- Test Suite 2: Participation & Access Control Verification ---');

  try {
    assert.strictEqual(chatService.isParticipant(mockBooking, borrowerId.toString()), true);
    pass('Borrower is recognized as authorized participant');
  } catch (err) {
    fail('Borrower is recognized as authorized participant', err);
  }

  try {
    assert.strictEqual(chatService.isParticipant(mockBooking, ownerId.toString()), true);
    pass('Owner is recognized as authorized participant');
  } catch (err) {
    fail('Owner is recognized as authorized participant', err);
  }

  try {
    assert.strictEqual(chatService.isParticipant(mockBooking, strangerId.toString()), false);
    pass('Unrelated user is strictly denied participant status');
  } catch (err) {
    fail('Unrelated user is strictly denied participant status', err);
  }

  try {
    // Admins without booking participation are strictly blocked from private chat
    assert.strictEqual(chatService.isParticipant(mockBooking, adminId.toString()), false);
    pass('Administrator without booking participation is denied participant status');
  } catch (err) {
    fail('Administrator without booking participation is denied participant status', err);
  }

  try {
    assert.strictEqual(chatService.isParticipant(null, borrowerId.toString()), false);
    assert.strictEqual(chatService.isParticipant(mockBooking, null), false);
    pass('Null booking or user safely defaults to false');
  } catch (err) {
    fail('Null booking or user safely defaults to false', err);
  }

  // --- Test Suite 3: Pickup Coordination Security & Privacy ---
  console.log('\n--- Test Suite 3: Pickup Coordination Security & Privacy ---');

  try {
    // Locked for pending bookings
    const pendingBooking = {
      _id: bookingId,
      requester: borrowerId,
      owner: ownerId,
      status: 'pending',
      pickupCoordination: {
        exactLocation: 'Confidential Room 101',
        instructions: 'Secret code 1234',
        ownerPhone: '+91 99999 88888',
      },
    };

    // Mock Booking.findById
    const origFindById = Booking.findById;
    Booking.findById = () => ({
      populate: () => Promise.resolve(pendingBooking),
    });

    // Temporarily mock isDatabaseConnected
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const pendingCoord = await chatService.getPickupCoordination(bookingId.toString(), borrowerId.toString());
    assert.strictEqual(pendingCoord.isLocked, true);
    assert.strictEqual(pendingCoord.exactLocation, '');
    assert.strictEqual(pendingCoord.instructions, '');
    assert.strictEqual(pendingCoord.sharedContactPhone, null);
    pass('Pickup details are strictly locked for pending bookings');

    // Approved booking with phone sharing disabled
    Booking.findById = () => ({
      populate: () => Promise.resolve(mockBooking),
    });

    const approvedBorrowerCoord = await chatService.getPickupCoordination(bookingId.toString(), borrowerId.toString());
    assert.strictEqual(approvedBorrowerCoord.isLocked, false);
    assert.strictEqual(approvedBorrowerCoord.exactLocation, 'Room 304, Advanced Physics Lab');
    assert.strictEqual(approvedBorrowerCoord.instructions, 'Ring bell at entrance');
    assert.strictEqual(approvedBorrowerCoord.sharedContactPhone, null);
    pass('Approved booking reveals location & instructions but masks phone when sharing is off');

    // Owner opts in to share phone
    mockBooking.pickupCoordination.sharePhoneWithRequester = true;
    const sharedBorrowerCoord = await chatService.getPickupCoordination(bookingId.toString(), borrowerId.toString());
    assert.strictEqual(sharedBorrowerCoord.sharedContactPhone, '+91 98765 43210');
    pass('Reveals owner contact phone when owner explicitly grants sharePhoneWithRequester');

    // Stranger attempts to view pickup coordination
    let strangerBlocked = false;
    try {
      await chatService.getPickupCoordination(bookingId.toString(), strangerId.toString());
    } catch (authErr) {
      if (authErr.statusCode === 403) strangerBlocked = true;
    }
    assert.strictEqual(strangerBlocked, true);
    pass('Unauthorized non-participant is rejected with 403 Forbidden for pickup coordination');

    // Restore Booking.findById
    Booking.findById = origFindById;
  } catch (err) {
    fail('Pickup coordination privacy tests', err);
  }

  // --- Test Suite 4: Message Dispatch & Input Sanitization ---
  console.log('\n--- Test Suite 4: Message Dispatch & Sanitization ---');

  try {
    // Attempting to send message without text
    let emptyBlocked = false;
    try {
      await chatService.sendMessage(bookingId.toString(), borrowerId.toString(), '   ');
    } catch (e) {
      if (e.statusCode === 400 && e.message.includes('empty')) emptyBlocked = true;
    }
    assert.strictEqual(emptyBlocked, true);
    pass('Whitespace-only message is rejected with 400 Bad Request');
  } catch (err) {
    fail('Whitespace-only message is rejected with 400 Bad Request', err);
  }

  try {
    // Attempting to send message with invalid ObjectId
    let invalidIdBlocked = false;
    try {
      await chatService.sendMessage('not-a-valid-id', borrowerId.toString(), 'Hello');
    } catch (e) {
      if (e.statusCode === 400 && e.message.includes('Invalid booking ID')) invalidIdBlocked = true;
    }
    assert.strictEqual(invalidIdBlocked, true);
    pass('Invalid booking ID is rejected with 400 Bad Request');
  } catch (err) {
    fail('Invalid booking ID is rejected with 400 Bad Request', err);
  }

  try {
    // Non-participant sending message
    const origFindById = Booking.findById;
    Booking.findById = () => ({
      populate: () => Promise.resolve(mockBooking),
    });
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    let nonParticipantBlocked = false;
    try {
      await chatService.sendMessage(bookingId.toString(), strangerId.toString(), 'Hey there');
    } catch (e) {
      if (e.statusCode === 403) nonParticipantBlocked = true;
    }
    assert.strictEqual(nonParticipantBlocked, true);
    pass('Non-participant attempt to send message is rejected with 403 Forbidden');

    Booking.findById = origFindById;
  } catch (err) {
    fail('Non-participant attempt to send message is rejected with 403 Forbidden', err);
  }

  // --- Test Suite 5: Pickup Coordination Updates ---
  console.log('\n--- Test Suite 5: Pickup Coordination Updates ---');

  try {
    const origFindById = Booking.findById;
    Booking.findById = () => ({
      populate: () => Promise.resolve(mockBooking),
      then: (resolve) => resolve(mockBooking),
    });
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    // Owner updates location and instructions
    const updatedByOwner = await chatService.updatePickupCoordination(
      bookingId.toString(),
      ownerId.toString(),
      {
        exactLocation: 'Engineering Block 2, Room 108',
        instructions: 'Ask for Dr. Rao at front desk',
        sharePhoneWithRequester: true,
      }
    );

    assert.strictEqual(updatedByOwner.exactLocation, 'Engineering Block 2, Room 108');
    assert.strictEqual(updatedByOwner.instructions, 'Ask for Dr. Rao at front desk');
    pass('Owner can update exact location, instructions, and phone sharing');

    // Borrower updates proposed pickup time
    const newTargetTime = new Date(Date.now() + 100000000);
    const updatedByBorrower = await chatService.updatePickupCoordination(
      bookingId.toString(),
      borrowerId.toString(),
      {
        targetTime: newTargetTime,
        requesterPhone: '+91 99887 76655',
        sharePhoneWithOwner: true,
      }
    );

    assert.strictEqual(mockBooking.pickupCoordination.requesterPhone, '+91 99887 76655');
    assert.strictEqual(mockBooking.pickupCoordination.sharePhoneWithOwner, true);
    pass('Borrower can propose pickup time and share their contact phone');

    Booking.findById = origFindById;
  } catch (err) {
    fail('Pickup coordination updates test', err);
  }

  console.log('\n====================================================');
  console.log(`Part 17 Chat & Pickup Test Summary: Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runChatTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
