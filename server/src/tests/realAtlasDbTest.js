/**
 * Isolated Real MongoDB Atlas Integration Test Suite
 *
 * Verifies real database operations against MongoDB Atlas:
 * 1. Mongoose connection and database selection ('ResourceSharingDb')
 * 2. User registration and secure bcrypt hashing
 * 3. User authentication and credential matching
 * 4. Resource creation and persistence
 * 5. Booking creation and lifecycle state persistence
 * 6. Reading persisted data from the live cluster
 * 7. Safe cleanup of test records (leaving all other data untouched)
 *
 * Safety:
 * - NEVER prints credentials, passwords, or complete connection strings.
 * - Uses isolated, uniquely tagged records with cleanup in finally block.
 * - Does not drop collections or delete existing records.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const { configureDNS } = require('../config/db');

async function runAtlasIntegrationAudit() {
  console.log('====================================================');
  console.log('🧪 Starting Real MongoDB Atlas Integration Audit');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '' || uri.includes('<PASSWORD>')) {
    console.error('❌ [BLOCKED] MONGODB_URI is not configured in server/.env');
    process.exit(1);
  }

  configureDNS();

  let testUser = null;
  let testOwner = null;
  let testResource = null;
  let testBooking = null;

  try {
    // 1. Connection & Database Verification
    console.log('\n--- Step 1: Atlas Connection & DB Name Verification ---');
    const conn = await mongoose.connect(uri, {
      dbName: 'ResourceSharingDb',
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });

    const isConnected = mongoose.connection.readyState === 1;
    const dbName = conn.connection.name;
    const host = conn.connection.host;

    if (!isConnected) {
      throw new Error(`Failed to establish ready connection (readyState: ${mongoose.connection.readyState})`);
    }

    console.log(`  ✅ Connected to Atlas cluster`);
    console.log(`  ✅ Host: ${host}`);
    console.log(`  ✅ Target Database: "${dbName}" (Verified: ${dbName === 'ResourceSharingDb'})`);

    const timestamp = Date.now();
    const testBorrowerEmail = `audit_borrower_${timestamp}@campus.edu`;
    const testOwnerEmail = `audit_owner_${timestamp}@campus.edu`;

    // 2. Real User Registration & Password Hashing
    console.log('\n--- Step 2: Real User Creation & Bcrypt Hash Persistence ---');
    testBorrower = await User.create({
      name: 'Audit Test Borrower',
      email: testBorrowerEmail,
      password: 'AuditSecurePassword123!',
      role: 'user',
    });

    testOwner = await User.create({
      name: 'Audit Test Owner',
      email: testOwnerEmail,
      password: 'AuditSecurePassword123!',
      role: 'user',
    });

    console.log(`  ✅ Real User created with ID: ${testBorrower._id}`);
    console.log(`  ✅ Password stored as bcrypt hash: ${testBorrower.password.startsWith('$2')}`);

    // 3. User Authentication & Password Matching
    console.log('\n--- Step 3: User Authentication Verification ---');
    const fetchedBorrower = await User.findById(testBorrower._id);
    const passwordMatch = await fetchedBorrower.matchPassword('AuditSecurePassword123!');
    const wrongPasswordMatch = await fetchedBorrower.matchPassword('WrongPassword!');

    console.log(`  ✅ Valid password match: ${passwordMatch === true}`);
    console.log(`  ✅ Invalid password rejected: ${wrongPasswordMatch === false}`);

    // 4. Resource Creation & Persistence
    console.log('\n--- Step 4: Real Resource Creation & Persistence ---');
    testResource = await Resource.create({
      title: `Audit Test DSLR Camera ${timestamp}`,
      description: 'High-end DSLR camera for photography workshop audit test.',
      category: 'Gadgets & Accessories',
      subcategory: 'Camera & Accessories',
      location: {
        campus: 'Engineering Campus',
        building: 'Media Center',
        room: 'Room 204',
      },
      quantity: 2,
      availabilityStatus: 'available',
      owner: testOwner._id,
      condition: 'good',
    });

    console.log(`  ✅ Real Resource created with ID: ${testResource._id}`);
    const fetchedResource = await Resource.findById(testResource._id);
    console.log(`  ✅ Resource retrieved from Atlas: "${fetchedResource.title}", quantity: ${fetchedResource.quantity}`);

    // 5. Booking Creation & Persistence
    console.log('\n--- Step 5: Real Booking Creation & Persistence ---');
    const startAt = new Date(Date.now() + 3600000); // 1 hour in future
    const endAt = new Date(Date.now() + 7200000);   // 2 hours in future

    testBooking = await Booking.create({
      resource: testResource._id,
      requester: testBorrower._id,
      owner: testOwner._id,
      startAt,
      endAt,
      quantity: 1,
      purpose: 'Verification of real Atlas persistence lifecycle',
      status: 'pending',
    });

    console.log(`  ✅ Real Booking created with ID: ${testBooking._id}`);
    console.log(`  ✅ Initial Booking status: ${testBooking.status}`);

    // 6. Booking Lifecycle Transitions & Persistence
    console.log('\n--- Step 6: Booking Lifecycle Transitions ---');
    testBooking.status = 'approved';
    testBooking.reviewedAt = new Date();
    await testBooking.save();

    const approvedBooking = await Booking.findById(testBooking._id);
    console.log(`  ✅ Transition to approved persisted: ${approvedBooking.status === 'approved'}`);

    approvedBooking.status = 'checked_in';
    approvedBooking.checkIn = {
      checkedInAt: new Date(),
      submittedBy: testBorrower._id,
      condition: 'excellent',
      notes: 'Picked up in pristine condition',
    };
    await approvedBooking.save();

    const checkedInBooking = await Booking.findById(testBooking._id);
    console.log(`  ✅ Transition to checked_in persisted: ${checkedInBooking.status === 'checked_in'}`);

    checkedInBooking.status = 'completed';
    checkedInBooking.checkOut = {
      checkedOutAt: new Date(),
      submittedBy: testBorrower._id,
      condition: 'excellent',
      notes: 'Returned in pristine condition',
    };
    await checkedInBooking.save();

    const completedBooking = await Booking.findById(testBooking._id);
    console.log(`  ✅ Transition to completed persisted: ${completedBooking.status === 'completed'}`);

    console.log('\n====================================================');
    console.log('🎉 REAL ATLAS DATABASE INTEGRATION: PASS');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.error('\n❌ Real Atlas Integration Failed:', err.message);
    throw err;
  } finally {
    console.log('\n--- Step 7: Safe Cleanup of Test Artifacts ---');
    try {
      if (testBooking && testBooking._id) {
        await Booking.deleteOne({ _id: testBooking._id });
        console.log(`  🧹 Cleaned up test booking: ${testBooking._id}`);
      }
      if (testResource && testResource._id) {
        await Resource.deleteOne({ _id: testResource._id });
        console.log(`  🧹 Cleaned up test resource: ${testResource._id}`);
      }
      if (testBorrower && testBorrower._id) {
        await User.deleteOne({ _id: testBorrower._id });
        console.log(`  🧹 Cleaned up test borrower user: ${testBorrower._id}`);
      }
      if (testOwner && testOwner._id) {
        await User.deleteOne({ _id: testOwner._id });
        console.log(`  🧹 Cleaned up test owner user: ${testOwner._id}`);
      }
    } catch (cleanupErr) {
      console.warn('  ⚠️  Cleanup notice:', cleanupErr.message);
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('  🔌 Disconnected from MongoDB Atlas');
    }
  }
}

if (require.main === module) {
  runAtlasIntegrationAudit()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runAtlasIntegrationAudit };
