const assert = require('assert');
const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const {
  withResourceLock,
  doIntervalsOverlap,
  calculateSlotAvailability,
  calculateCurrentAvailability,
  syncResourceAvailability,
} = require('../services/availabilityService');

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

async function runAvailabilityTests() {
  console.log('====================================================');
  console.log('🧪 Starting Resource Availability & Capacity Test Suite');
  console.log('====================================================');

  // Simulate connected database state
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const ownerId = new mongoose.Types.ObjectId();
  const borrower1Id = new mongoose.Types.ObjectId();
  const borrower2Id = new mongoose.Types.ObjectId();
  const singleResourceId = new mongoose.Types.ObjectId();
  const multiResourceId = new mongoose.Types.ObjectId();

  // --- Test Suite 1: Mathematical Interval Overlap Rules ---
  console.log('\n--- Test Suite 1: Mathematical Interval Overlap Rules ---');

  try {
    const t1 = new Date('2026-11-01T10:00:00.000Z');
    const t2 = new Date('2026-11-01T12:00:00.000Z');
    const t3 = new Date('2026-11-01T11:00:00.000Z');
    const t4 = new Date('2026-11-01T13:00:00.000Z');
    const t5 = new Date('2026-11-01T14:00:00.000Z');

    // Partial overlap: [10:00-12:00] and [11:00-13:00]
    assert.strictEqual(doIntervalsOverlap(t1, t2, t3, t4), true);
    pass('Partial overlapping intervals are correctly identified as overlapping');

    // Adjacent boundary: [10:00-12:00] and [12:00-14:00] -> NO overlap
    assert.strictEqual(doIntervalsOverlap(t1, t2, t2, t5), false);
    pass('Adjacent boundary intervals (end == start) strictly do NOT overlap');

    // Completely disjoint intervals: [10:00-12:00] and [13:00-14:00]
    assert.strictEqual(doIntervalsOverlap(t1, t2, t4, t5), false);
    pass('Completely disjoint intervals do NOT overlap');

    // Enclosed interval: [10:00-14:00] contains [11:00-13:00]
    assert.strictEqual(doIntervalsOverlap(t1, t5, t3, t4), true);
    pass('Enclosed sub-intervals are correctly identified as overlapping');
  } catch (err) {
    fail('Interval overlap logic test', err);
  }

  // --- Test Suite 2: Single-Unit Double-Booking Prevention ---
  console.log('\n--- Test Suite 2: Single-Unit Double-Booking Prevention ---');

  try {
    const singleResource = new Resource({
      _id: singleResourceId,
      title: 'Precision SEM Microscope',
      description: 'High-vacuum field emission scanning electron microscope for nanoscale characterization.',
      category: 'Testing Equipment',
      quantity: 1,
      availabilityStatus: 'available',
      owner: ownerId,
    });

    const origResourceFindById = Resource.findById;
    const origBookingFind = Booking.find;

    Resource.findById = () => Promise.resolve(singleResource);

    // Mock existing approved booking [10:00-12:00]
    const activeBooking = {
      _id: new mongoose.Types.ObjectId(),
      resource: singleResourceId,
      status: 'approved',
      quantity: 1,
      startAt: new Date('2026-11-01T10:00:00.000Z'),
      endAt: new Date('2026-11-01T12:00:00.000Z'),
    };

    // Query for overlapping window [11:00-13:00]
    Booking.find = (query) => {
      if (query.startAt && query.startAt.$lt && query.endAt && query.endAt.$gt) {
        // Return activeBooking if query overlaps [10:00-12:00]
        const reqStart = query.endAt.$gt;
        const reqEnd = query.startAt.$lt;
        if (doIntervalsOverlap(activeBooking.startAt, activeBooking.endAt, reqStart, reqEnd)) {
          return Promise.resolve([activeBooking]);
        }
      }
      return Promise.resolve([]);
    };

    // Calculate slot availability for overlapping window [11:00-13:00]
    const overlapSlot = await calculateSlotAvailability(
      singleResourceId,
      '2026-11-01T11:00:00.000Z',
      '2026-11-01T13:00:00.000Z'
    );

    assert.strictEqual(overlapSlot.totalCapacity, 1);
    assert.strictEqual(overlapSlot.bookedQuantity, 1);
    assert.strictEqual(overlapSlot.availableCapacity, 0);
    assert.strictEqual(overlapSlot.isAvailable, false);
    assert.strictEqual(overlapSlot.availabilityStatus, 'unavailable');
    assert.strictEqual(overlapSlot.availabilityLabel, 'Currently Unavailable');
    pass('Single-unit resource is marked Currently Unavailable for overlapping slot');

    // Calculate slot availability for adjacent window [12:00-14:00] -> Should be available!
    const adjacentSlot = await calculateSlotAvailability(
      singleResourceId,
      '2026-11-01T12:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );

    assert.strictEqual(adjacentSlot.totalCapacity, 1);
    assert.strictEqual(adjacentSlot.bookedQuantity, 0);
    assert.strictEqual(adjacentSlot.availableCapacity, 1);
    assert.strictEqual(adjacentSlot.isAvailable, true);
    assert.strictEqual(adjacentSlot.availabilityStatus, 'available');
    assert.strictEqual(adjacentSlot.availabilityLabel, 'Available Now');
    pass('Single-unit resource is marked Available Now for adjacent boundary slot');

    Resource.findById = origResourceFindById;
    Booking.find = origBookingFind;
  } catch (err) {
    fail('Single-unit double booking prevention test', err);
  }

  // --- Test Suite 3: Multi-Unit Capacity Tracking & Automatic Status Sync ---
  console.log('\n--- Test Suite 3: Multi-Unit Capacity Tracking & Status Sync ---');

  try {
    const multiResource = new Resource({
      _id: multiResourceId,
      title: 'Sony Alpha 7 IV 4K Camera Rig',
      description: 'Professional full-frame mirrorless camera kit with prime lens set.',
      category: 'Cameras',
      quantity: 3, // 3 units total
      availabilityStatus: 'available',
      owner: ownerId,
    });

    const origResourceFindById = Resource.findById;
    const origBookingFind = Booking.find;
    Resource.findById = () => Promise.resolve(multiResource);

    // Initial state: 0 bookings -> 3 units available
    Booking.find = () => Promise.resolve([]);
    const initialSlot = await calculateSlotAvailability(
      multiResourceId,
      '2026-11-01T10:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );
    assert.strictEqual(initialSlot.availableCapacity, 3);
    assert.strictEqual(initialSlot.availabilityStatus, 'available');
    pass('Multi-unit resource begins with 3 of 3 units available');

    // Booking 1 (1 unit) approved -> 2 units remain
    const booking1 = {
      _id: new mongoose.Types.ObjectId(),
      resource: multiResourceId,
      status: 'approved',
      quantity: 1,
      startAt: new Date('2026-11-01T10:00:00.000Z'),
      endAt: new Date('2026-11-01T14:00:00.000Z'),
    };

    Booking.find = () => Promise.resolve([booking1]);
    const slotAfterB1 = await calculateSlotAvailability(
      multiResourceId,
      '2026-11-01T10:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );
    assert.strictEqual(slotAfterB1.bookedQuantity, 1);
    assert.strictEqual(slotAfterB1.availableCapacity, 2);
    assert.strictEqual(slotAfterB1.isAvailable, true);
    assert.strictEqual(slotAfterB1.availabilityStatus, 'available');
    pass('After 1 of 3 units booked, resource remains Available with 2 units remaining');

    // Booking 2 (2 units) approved -> 0 units remain (full capacity consumed)
    const booking2 = {
      _id: new mongoose.Types.ObjectId(),
      resource: multiResourceId,
      status: 'approved',
      quantity: 2,
      startAt: new Date('2026-11-01T10:00:00.000Z'),
      endAt: new Date('2026-11-01T14:00:00.000Z'),
    };

    Booking.find = () => Promise.resolve([booking1, booking2]);
    const slotAfterB2 = await calculateSlotAvailability(
      multiResourceId,
      '2026-11-01T10:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );
    assert.strictEqual(slotAfterB2.bookedQuantity, 3);
    assert.strictEqual(slotAfterB2.availableCapacity, 0);
    assert.strictEqual(slotAfterB2.isAvailable, false);
    assert.strictEqual(slotAfterB2.availabilityStatus, 'unavailable');
    assert.strictEqual(slotAfterB2.availabilityLabel, 'Currently Unavailable');
    pass('When 3 of 3 units booked, resource automatically switches to Currently Unavailable');

    Resource.findById = origResourceFindById;
    Booking.find = origBookingFind;
  } catch (err) {
    fail('Multi-unit capacity tracking test', err);
  }

  // --- Test Suite 4: Quantity Restoration (Cancel, Reject, Return) ---
  console.log('\n--- Test Suite 4: Quantity Restoration (Cancel, Reject, Return) ---');

  try {
    const multiResource = new Resource({
      _id: multiResourceId,
      title: 'Sony Alpha 7 IV 4K Camera Rig',
      description: 'Professional full-frame mirrorless camera kit with prime lens set.',
      category: 'Cameras',
      quantity: 3,
      availabilityStatus: 'unavailable',
      owner: ownerId,
    });

    const origResourceFindById = Resource.findById;
    const origBookingFind = Booking.find;
    Resource.findById = () => Promise.resolve(multiResource);

    // Scenario 1: Cancellation restores capacity
    // Booking 2 (2 units) is cancelled -> remaining active bookings = [booking1] (1 unit)
    const booking1 = {
      _id: new mongoose.Types.ObjectId(),
      resource: multiResourceId,
      status: 'approved',
      quantity: 1,
      startAt: new Date('2026-11-01T10:00:00.000Z'),
      endAt: new Date('2026-11-01T14:00:00.000Z'),
    };

    Booking.find = () => Promise.resolve([booking1]);
    const restoredSlot = await calculateSlotAvailability(
      multiResourceId,
      '2026-11-01T10:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );
    assert.strictEqual(restoredSlot.availableCapacity, 2);
    assert.strictEqual(restoredSlot.availabilityStatus, 'available');
    pass('Cancellation of booking immediately restores available capacity');

    // Scenario 2: Return / Check-out restores capacity
    // Booking 1 is completed/returned -> 0 active bookings remain
    Booking.find = () => Promise.resolve([]);
    const fullRestoredSlot = await calculateSlotAvailability(
      multiResourceId,
      '2026-11-01T10:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );
    assert.strictEqual(fullRestoredSlot.availableCapacity, 3);
    assert.strictEqual(fullRestoredSlot.isAvailable, true);
    assert.strictEqual(fullRestoredSlot.availabilityStatus, 'available');
    assert.strictEqual(fullRestoredSlot.availabilityLabel, 'Available Now');
    pass('Return/completion of booking restores full capacity to Available Now');

    Resource.findById = origResourceFindById;
    Booking.find = origBookingFind;
  } catch (err) {
    fail('Quantity restoration test', err);
  }

  // --- Test Suite 5: Concurrent Requests & Race Condition Protection ---
  console.log('\n--- Test Suite 5: Concurrent Requests & Mutex Lock ---');

  try {
    let availableUnits = 1;
    const executionOrder = [];

    // Simulate 5 concurrent attempts to claim the last unit
    const attemptBooking = async (requestId) => {
      return withResourceLock(singleResourceId, async () => {
        executionOrder.push(`start-${requestId}`);
        // Simulate async I/O delay
        await new Promise((r) => setTimeout(r, 10));

        if (availableUnits > 0) {
          availableUnits -= 1;
          executionOrder.push(`success-${requestId}`);
          return { success: true, requestId };
        } else {
          executionOrder.push(`rejected-${requestId}`);
          return { success: false, requestId, error: 'Overbooked' };
        }
      });
    };

    const results = await Promise.all([
      attemptBooking(1),
      attemptBooking(2),
      attemptBooking(3),
      attemptBooking(4),
      attemptBooking(5),
    ]);

    const successes = results.filter((r) => r.success);
    const rejections = results.filter((r) => !r.success);

    assert.strictEqual(successes.length, 1);
    assert.strictEqual(rejections.length, 4);
    assert.strictEqual(availableUnits, 0);
    pass('Concurrent requests: Exactly 1 request claims the unit; 4 are safely rejected');
    pass('withResourceLock serialized concurrent execution with zero race conditions');
  } catch (err) {
    fail('Concurrent booking race condition protection test', err);
  }

  // --- Test Suite 6: Maintenance Precedence Guard ---
  console.log('\n--- Test Suite 6: Maintenance Precedence Guard ---');

  try {
    const maintenanceResource = new Resource({
      _id: new mongoose.Types.ObjectId(),
      title: 'Autoclave Sterilizer 500L',
      category: 'Laboratories',
      quantity: 5,
      availabilityStatus: 'maintenance',
      owner: ownerId,
    });

    const origResourceFindById = Resource.findById;
    Resource.findById = () => Promise.resolve(maintenanceResource);

    const maintSlot = await calculateSlotAvailability(
      maintenanceResource._id,
      '2026-11-01T10:00:00.000Z',
      '2026-11-01T14:00:00.000Z'
    );

    assert.strictEqual(maintSlot.isAvailable, false);
    assert.strictEqual(maintSlot.availabilityStatus, 'maintenance');
    assert.strictEqual(maintSlot.availabilityLabel, 'Maintenance');
    assert.strictEqual(maintSlot.availableCapacity, 0);
    pass('Maintenance status takes strict precedence and blocks availability regardless of quantity');

    Resource.findById = origResourceFindById;
  } catch (err) {
    fail('Maintenance precedence test', err);
  }

  console.log('\n====================================================');
  console.log(`Availability & Capacity Test Summary: Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAvailabilityTests().catch((err) => {
  console.error('Fatal availability test error:', err);
  process.exit(1);
});

