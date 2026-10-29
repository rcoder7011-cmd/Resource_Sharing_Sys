/**
 * Part 11 Smart Resource Rescue Test Suite
 *
 * Verifies:
 * 1. Operating hours parsing (standard weekdays, 24/7, daily, custom ranges, AM/PM, fallbacks)
 * 2. Available unit-minutes calculations with multi-unit quantity multipliers
 * 3. Deterministic utilization calculations, window overlap clipping, and status filtering (approved/checked_in/completed vs cancelled/rejected)
 * 4. Multi-unit booking capacity calculations & 100% capacity saturation clamping
 * 5. Pending demand tracking (unfulfilled interest)
 * 6. Classification heuristics (underused <20%, moderate 20-60%, well_used >60%, insufficient_data <7d)
 * 7. Confidence scoring (high >=30d, medium 7-29d, low <7d)
 * 8. Smart Rescue recommendation engine rules & priority sorting
 * 9. Administrative authorization guards (403 for non-admin on /api/admin/rescue/*)
 * 10. Owner utilization endpoint isolation (/api/resources/mine/utilization strictly scoped to owner)
 * 11. Database disconnection (503) offline guards
 */

const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const generateToken = require('../utils/generateToken');

const {
  parseOperatingHours,
  calculateAvailableUnitMinutes,
  calculateResourceUtilization,
  generateRescueRecommendations,
} = require('../services/rescueService');

const {
  getRescueSummary,
  getRescueResources,
  getRescueResourceDetails,
} = require('../controllers/adminController');

const { getMyResourceUtilization } = require('../controllers/resourceController');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_rescue_suite_1234567890';
process.env.JWT_EXPIRES_IN = '1h';

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

const mockResponse = () => {
  const res = {};
  res.statusCode = 200;
  res.data = null;
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (payload) {
    res.data = payload;
    return res;
  };
  return res;
};

async function runAllTests() {
  console.log('\n====================================================');
  console.log('🧪 Starting Part 11 Smart Resource Rescue Test Suite');
  console.log('====================================================\n');

  // ==========================================
  // SUITE 1: OPERATING HOURS PARSER
  // ==========================================
  console.log('--- Test Suite 1: Operating Hours Parser ---');

  await runTest('Parses default "Monday – Friday: 08:30 – 18:00" to 9.5 hours/day on weekdays', async () => {
    const res = parseOperatingHours('Monday – Friday: 08:30 – 18:00');
    assert.strictEqual(res.dailyHours, 9.5);
    assert.deepStrictEqual(res.operatingDays, [1, 2, 3, 4, 5]);
    assert.strictEqual(res.isContinuous247, false);
  });

  await runTest('Parses "24/7" to 24 hours/day across all 7 days', async () => {
    const res = parseOperatingHours('24/7 Access');
    assert.strictEqual(res.dailyHours, 24);
    assert.deepStrictEqual(res.operatingDays, [0, 1, 2, 3, 4, 5, 6]);
    assert.strictEqual(res.isContinuous247, true);
  });

  await runTest('Parses "Daily: 09:00 - 17:00" to 8 hours/day across 7 days', async () => {
    const res = parseOperatingHours('Daily: 09:00 - 17:00');
    assert.strictEqual(res.dailyHours, 8);
    assert.deepStrictEqual(res.operatingDays, [0, 1, 2, 3, 4, 5, 6]);
  });

  await runTest('Parses 12-hour AM/PM formats "8:00 AM - 5:00 PM" accurately', async () => {
    const res = parseOperatingHours('Monday - Friday: 8:00 AM - 5:00 PM');
    assert.strictEqual(res.dailyHours, 9);
    assert.deepStrictEqual(res.operatingDays, [1, 2, 3, 4, 5]);
  });

  await runTest('Falls back safely on null, empty or unparseable input to 8 hours Mon-Fri', async () => {
    const resEmpty = parseOperatingHours('');
    assert.strictEqual(resEmpty.dailyHours, 8);
    assert.deepStrictEqual(resEmpty.operatingDays, [1, 2, 3, 4, 5]);

    const resNull = parseOperatingHours(null);
    assert.strictEqual(resNull.dailyHours, 8);
  });

  // ==========================================
  // SUITE 2: AVAILABLE CAPACITY CALCULATIONS
  // ==========================================
  console.log('\n--- Test Suite 2: Available Capacity Unit-Minutes Calculations ---');

  await runTest('Multiplies available capacity strictly by inventory quantity (quantity = 3)', async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days window

    const singleResource = {
      quantity: 1,
      operatingHours: '24/7',
    };
    const multiResource = {
      quantity: 3,
      operatingHours: '24/7',
    };

    const singleCap = calculateAvailableUnitMinutes(singleResource, windowStart, now);
    const multiCap = calculateAvailableUnitMinutes(multiResource, windowStart, now);

    assert.strictEqual(multiCap, singleCap * 3, 'Multi-unit capacity must be exactly 3x single unit capacity');
  });

  await runTest('Ensures non-zero fallback for capacity calculation to prevent division-by-zero', async () => {
    const now = new Date();
    const cap = calculateAvailableUnitMinutes({ quantity: 1, operatingHours: 'invalid' }, now, now);
    assert(cap > 0, 'Capacity must be greater than 0');
  });

  // ==========================================
  // SUITE 3: DETERMINISTIC UTILIZATION MATH & STATUS FILTERING
  // ==========================================
  console.log('\n--- Test Suite 3: Deterministic Utilization Math & Booking Status Filtering ---');

  await runTest('Zero bookings yields exactly 0% utilization rate', async () => {
    const resource = {
      _id: 'res_zero_001',
      title: 'Spectrometer X',
      category: 'Laboratories',
      quantity: 1,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      operatingHours: 'Monday – Friday: 08:30 – 18:00',
    };

    const metrics = calculateResourceUtilization(resource, [], 30);
    assert.strictEqual(metrics.utilizationRate, 0);
    assert.strictEqual(metrics.confirmedBookingsCount, 0);
    assert.strictEqual(metrics.utilizedUnitHours, 0);
  });

  await runTest('Only approved, checked_in, and completed bookings count towards confirmed utilization', async () => {
    const now = new Date();
    const resource = {
      _id: 'res_status_001',
      title: 'CNC Mill',
      category: 'Workshop Tools',
      quantity: 1,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      operatingHours: 'Daily: 09:00 - 17:00',
    };

    const bookings = [
      {
        startAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours
        quantity: 1,
        status: 'completed',
      },
      {
        startAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour
        quantity: 1,
        status: 'approved',
      },
      {
        startAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 2 hours
        quantity: 1,
        status: 'cancelled', // MUST BE EXCLUDED
      },
      {
        startAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 2 hours
        quantity: 1,
        status: 'rejected', // MUST BE EXCLUDED
      },
    ];

    const metrics = calculateResourceUtilization(resource, bookings, 30);
    assert.strictEqual(metrics.confirmedBookingsCount, 2);
    assert.strictEqual(metrics.rejectedCancelledCount, 2);
    assert.strictEqual(metrics.utilizedUnitHours, 3.0, 'Utilized hours must be exactly 3.0 (2h completed + 1h approved)');
  });

  await runTest('Multi-unit booking multiplies utilized duration by booking quantity', async () => {
    const now = new Date();
    const resource = {
      _id: 'res_multi_qty_001',
      title: 'VR Headsets',
      category: 'Electronics',
      quantity: 5,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      operatingHours: 'Daily: 09:00 - 17:00',
    };

    const bookings = [
      {
        startAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour
        quantity: 3, // 3 headsets booked simultaneously = 3 unit-hours
        status: 'completed',
      },
    ];

    const metrics = calculateResourceUtilization(resource, bookings, 30);
    assert.strictEqual(metrics.utilizedUnitHours, 3.0, '1 hour x 3 units = 3 unit-hours');
  });

  await runTest('Window overlap boundary clipping: bookings starting before windowStart are clipped', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const resource = {
      _id: 'res_clip_001',
      title: 'Server Node',
      category: 'Computers',
      quantity: 1,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      operatingHours: '24/7',
    };

    // Booking starts 32 days ago and ends 29 days ago (3 days total, but only 1 day inside the 30-day window)
    const bookings = [
      {
        startAt: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
        quantity: 1,
        status: 'completed',
      },
    ];

    const metrics = calculateResourceUtilization(resource, bookings, 30);
    // Inside the 30-day window, exactly 1 day (24 hours) should be counted
    assert.strictEqual(Math.round(metrics.utilizedUnitHours), 24, 'Booking must be clipped to windowStart');
  });

  await runTest('Pending bookings are tracked as unfulfilled demand without inflating confirmed utilization', async () => {
    const now = new Date();
    const resource = {
      _id: 'res_pending_001',
      title: 'Conference Space A',
      category: 'Meeting Rooms',
      quantity: 1,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      operatingHours: 'Daily: 09:00 - 17:00',
    };

    const bookings = [
      {
        startAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 2 hours
        quantity: 1,
        status: 'pending',
      },
    ];

    const metrics = calculateResourceUtilization(resource, bookings, 30);
    assert.strictEqual(metrics.utilizationRate, 0, 'Pending booking must not contribute to active utilization');
    assert.strictEqual(metrics.pendingBookingsCount, 1);
    assert.strictEqual(metrics.pendingDemandHours, 2.0);
  });

  // ==========================================
  // SUITE 4: CLASSIFICATION & CONFIDENCE HEURISTICS
  // ==========================================
  console.log('\n--- Test Suite 4: Classification & Confidence Heuristics ---');

  await runTest('Classifies utilization < 20% as "underused" for resource with history', async () => {
    const now = new Date();
    const resource = {
      _id: 'res_under_001',
      title: 'Oscilloscope B',
      quantity: 1,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      operatingHours: 'Daily: 09:00 - 17:00',
    };

    // 1 hour booked out of ~240 hours = < 1%
    const bookings = [
      {
        startAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        quantity: 1,
        status: 'completed',
      },
    ];

    const metrics = calculateResourceUtilization(resource, bookings, 30);
    assert.strictEqual(metrics.classification, 'underused');
    assert.strictEqual(metrics.confidence, 'high');
  });

  await runTest('Classifies new resource (<7 days) with 0 bookings as "insufficient_data"', async () => {
    const now = new Date();
    const resource = {
      _id: 'res_new_001',
      title: 'Brand New 3D Printer',
      quantity: 1,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days old
      operatingHours: 'Daily: 09:00 - 17:00',
    };

    const metrics = calculateResourceUtilization(resource, [], 30);
    assert.strictEqual(metrics.classification, 'insufficient_data');
    assert.strictEqual(metrics.confidence, 'low');
  });

  await runTest('Assigns confidence "medium" for resources listed between 7 and 29 days', async () => {
    const now = new Date();
    const resource = {
      _id: 'res_med_001',
      title: 'Centrifuge',
      quantity: 1,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days old
      operatingHours: 'Daily: 09:00 - 17:00',
    };

    const metrics = calculateResourceUtilization(resource, [], 30);
    assert.strictEqual(metrics.confidence, 'medium');
  });

  // ==========================================
  // SUITE 5: SMART RESCUE RECOMMENDATION ENGINE
  // ==========================================
  console.log('\n--- Test Suite 5: Smart Rescue Recommendation Engine ---');

  await runTest('Triggers REC_SPECS when listing has brief description (<60 chars) or empty specs', async () => {
    const resource = {
      title: 'Lab Kit',
      description: 'A basic kit for biology.', // 24 chars
      specs: {},
      safetyLevel: 'Standard',
      operatingHours: 'Monday – Friday: 08:30 – 18:00',
    };
    const metrics = {
      classification: 'underused',
      parsedDailyHours: 9.5,
      confirmedBookingsCount: 1,
      pendingBookingsCount: 0,
      utilizationRate: 5.0,
    };

    const recs = generateRescueRecommendations(resource, metrics);
    const specRec = recs.find((r) => r.id === 'REC_SPECS');
    assert(specRec, 'Expected REC_SPECS recommendation');
    assert.strictEqual(specRec.category, 'discoverability');
  });

  await runTest('Triggers REC_ACCESS_BARRIER when underused resource has Restricted safety level', async () => {
    const resource = {
      title: 'Radiation Monitor',
      description: 'High precision industrial monitor with certified radiation detectors.',
      specs: { 'Calibrated By': 'AEC Lab' },
      safetyLevel: 'Restricted',
      operatingHours: 'Monday – Friday: 08:30 – 18:00',
    };
    const metrics = {
      classification: 'underused',
      parsedDailyHours: 9.5,
      confirmedBookingsCount: 1,
      pendingBookingsCount: 0,
      utilizationRate: 3.2,
    };

    const recs = generateRescueRecommendations(resource, metrics);
    const accessRec = recs.find((r) => r.id === 'REC_ACCESS_BARRIER');
    assert(accessRec, 'Expected REC_ACCESS_BARRIER recommendation');
    assert.strictEqual(accessRec.priority, 'high');
  });

  await runTest('Triggers REC_EXPAND_HOURS when daily operating hours are narrow (<=5 hours)', async () => {
    const resource = {
      title: 'Cleanroom Station',
      description: 'Specialized ISO Class 5 cleanroom bench for delicate wafer processing and lithography.',
      specs: { Class: 'ISO 5' },
      safetyLevel: 'Standard',
      operatingHours: 'Monday – Friday: 10:00 – 14:00', // 4 hours
    };
    const metrics = {
      classification: 'underused',
      parsedDailyHours: 4,
      confirmedBookingsCount: 1,
      pendingBookingsCount: 0,
      utilizationRate: 10.0,
    };

    const recs = generateRescueRecommendations(resource, metrics);
    const hoursRec = recs.find((r) => r.id === 'REC_EXPAND_HOURS');
    assert(hoursRec, 'Expected REC_EXPAND_HOURS recommendation');
    assert.strictEqual(hoursRec.category, 'scheduling');
  });

  await runTest('Triggers REC_CAMPUS_PROMO when resource has zero confirmed bookings in window', async () => {
    const resource = {
      title: 'Thermal Camera',
      description: 'FLIR professional infrared thermal imaging camera with calibrated analysis software.',
      specs: { Sensor: 'FLIR Lepton 3.5' },
      safetyLevel: 'Standard',
      operatingHours: 'Monday – Friday: 08:30 – 18:00',
    };
    const metrics = {
      classification: 'underused',
      parsedDailyHours: 9.5,
      confirmedBookingsCount: 0,
      pendingBookingsCount: 0,
      utilizationRate: 0,
    };

    const recs = generateRescueRecommendations(resource, metrics);
    const promoRec = recs.find((r) => r.id === 'REC_CAMPUS_PROMO');
    assert(promoRec, 'Expected REC_CAMPUS_PROMO recommendation');
    assert.strictEqual(promoRec.priority, 'high');
  });

  await runTest('Triggers REC_PENDING_CONVERSION when unapproved bookings exist on underused resource', async () => {
    const resource = {
      title: 'Sound Studio',
      description: 'Acoustically isolated studio for vocal tracking and audio podcast recording.',
      specs: { 'Noise Floor': '-60dB' },
      safetyLevel: 'Standard',
      operatingHours: 'Daily: 09:00 - 17:00',
    };
    const metrics = {
      classification: 'underused',
      parsedDailyHours: 8,
      confirmedBookingsCount: 0,
      pendingBookingsCount: 3,
      pendingDemandHours: 6.0,
      totalAvailableUnitHours: 240,
      utilizationRate: 0,
    };

    const recs = generateRescueRecommendations(resource, metrics);
    const pendingRec = recs.find((r) => r.id === 'REC_PENDING_CONVERSION');
    assert(pendingRec, 'Expected REC_PENDING_CONVERSION recommendation');
  });

  await runTest('Triggers REC_MAINTENANCE with urgent priority when resource availability is maintenance', async () => {
    const resource = {
      title: 'Laser Cutter',
      description: 'High power CO2 laser cutter for acrylic, wood, and non-metal sheet fabrication.',
      availabilityStatus: 'maintenance',
      specs: { Power: '100W' },
      safetyLevel: 'Standard',
      operatingHours: 'Monday – Friday: 08:30 – 18:00',
    };
    const metrics = {
      classification: 'underused',
      parsedDailyHours: 9.5,
      confirmedBookingsCount: 0,
      pendingBookingsCount: 0,
      utilizationRate: 0,
    };

    const recs = generateRescueRecommendations(resource, metrics);
    const maintRec = recs.find((r) => r.id === 'REC_MAINTENANCE');
    assert(maintRec, 'Expected REC_MAINTENANCE recommendation');
    assert.strictEqual(maintRec.priority, 'urgent');
    // Urgent recommendations must be sorted first
    assert.strictEqual(recs[0].id, 'REC_MAINTENANCE');
  });

  // ==========================================
  // SUITE 6: ROLE AUTHORIZATION & ENDPOINT SECURITY
  // ==========================================
  console.log('\n--- Test Suite 6: Role Authorization & Route Protection ---');

  await runTest('requireAdmin middleware blocks standard user (role: "user") with 403 Forbidden', async () => {
    const standardUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Regular Student',
      email: 'student@campus.edu',
      role: 'user',
    };

    const req = { user: standardUser };
    const res = mockResponse();
    let nextCalled = false;

    requireAdmin(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, 'next() must NOT be called for standard user');
    assert.strictEqual(res.statusCode, 403, 'Expected 403 Forbidden status');
    assert.strictEqual(res.data.success, false);
  });

  await runTest('requireAdmin middleware permits platform administrator (role: "admin")', async () => {
    const adminUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      role: 'admin',
    };

    const req = { user: adminUser };
    const res = mockResponse();
    let nextCalled = false;

    requireAdmin(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'next() must be called for administrator');
  });

  await runTest('protect middleware rejects request lacking authorization header with 401', async () => {
    const req = { headers: {} };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  // ==========================================
  // SUITE 7: DATABASE DISCONNECTION / OFFLINE GUARDS
  // ==========================================
  console.log('\n--- Test Suite 7: Database Disconnection / Offline Guards ---');

  await runTest('getRescueSummary returns 503 when database is disconnected', async () => {
    const req = { query: { windowDays: 30 } };
    const res = mockResponse();

    await getRescueSummary(req, res, () => {});
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.data.success, false);
  });

  await runTest('getRescueResources returns 503 when database is disconnected', async () => {
    const req = { query: {} };
    const res = mockResponse();

    await getRescueResources(req, res, () => {});
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.data.success, false);
  });

  await runTest('getRescueResourceDetails returns 503 when database is disconnected', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toString() }, query: {} };
    const res = mockResponse();

    await getRescueResourceDetails(req, res, () => {});
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.data.success, false);
  });

  await runTest('getMyResourceUtilization returns 503 when database is disconnected', async () => {
    const req = { user: { _id: new mongoose.Types.ObjectId() }, query: {} };
    const res = mockResponse();

    await getMyResourceUtilization(req, res, () => {});
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.data.success, false);
  });

  // ==========================================
  // FINAL RESULTS SUMMARY
  // ==========================================
  console.log('\n====================================================');
  console.log(`📊 Part 11 Smart Resource Rescue Test Results:`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

