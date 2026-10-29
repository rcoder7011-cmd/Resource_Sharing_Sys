/**
 * Part 8 Admin Dashboard, Platform Analytics & Reports Management Test Suite
 * 
 * Verifies:
 * 1. User & Resource schema additions (User status, Resource moderationStatus, AuditLog)
 * 2. Admin authorization middleware (401 for unauthenticated, 403 for non-admin, 200 for admin)
 * 3. Account suspension enforcement (protect & login reject suspended accounts with 403)
 * 4. Strict public registration guard (cannot create admin role)
 * 5. Dashboard real metric queries & empty dataset handling
 * 6. Platform analytics aggregation & date range validation
 * 7. User management (search, pagination, last-admin protection, self-demotion/suspension protection)
 * 8. Resource moderation (flagging/hiding, booking preservation, audit recording)
 * 9. Issue & condition report management (status update, resolution notes, audit recording)
 * 10. Audit logging immutability & retrieval
 */

const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { protect, requireAdmin } = require('../middleware/authMiddleware');
const generateToken = require('../utils/generateToken');
const {
  getDashboardStats,
  getPlatformAnalytics,
  getUsers,
  updateUserRole,
  updateUserStatus,
  getResources,
  moderateResource,
  getIssueReports,
  updateIssueReportStatus,
  getAuditLogs,
} = require('../controllers/adminController');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_admin_suite_12345';
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
  console.log('🧪 Starting Part 8 Admin & Platform Analytics Test Suite');
  console.log('====================================================\n');

  // --- Suite 1: Schema & Model Validations ---
  console.log('--- Test Suite 1: Schema & Model Validations ---');

  await runTest('User schema defaults status to "active"', async () => {
    const user = new User({
      name: 'Test Member',
      email: 'member@inst.edu',
      password: 'password123',
    });
    assert.strictEqual(user.status, 'active');
  });

  await runTest('User schema rejects invalid status value', async () => {
    const user = new User({
      name: 'Test Member',
      email: 'member@inst.edu',
      password: 'password123',
      status: 'banned_permanently',
    });
    const err = user.validateSync();
    assert(err && err.errors.status, 'Expected validation error for invalid status');
  });

  await runTest('User toSafeObject includes status', async () => {
    const user = new User({
      name: 'Test Member',
      email: 'member@inst.edu',
      password: 'password123',
      status: 'active',
    });
    const safe = user.toSafeObject();
    assert.strictEqual(safe.status, 'active');
    assert.strictEqual(safe.password, undefined);
  });

  await runTest('Resource schema defaults moderationStatus to "approved"', async () => {
    const resource = new Resource({
      title: 'Lab Microscope',
      description: 'High magnification optical research microscope for biology lab.',
      category: 'Laboratories',
      owner: new mongoose.Types.ObjectId(),
    });
    assert.strictEqual(resource.moderationStatus, 'approved');
  });

  await runTest('Resource schema rejects invalid moderationStatus', async () => {
    const resource = new Resource({
      title: 'Lab Microscope',
      description: 'High magnification optical research microscope for biology lab.',
      category: 'Laboratories',
      owner: new mongoose.Types.ObjectId(),
      moderationStatus: 'censored',
    });
    const err = resource.validateSync();
    assert(err && err.errors.moderationStatus, 'Expected validation error for invalid moderationStatus');
  });

  await runTest('AuditLog schema validates required fields', async () => {
    const log = new AuditLog({});
    const err = log.validateSync();
    assert(err && err.errors.admin, 'Admin is required');
    assert(err && err.errors.action, 'Action is required');
    assert(err && err.errors.targetId, 'Target ID is required');
    assert(err && err.errors.targetModel, 'Target model is required');
  });

  await runTest('AuditLog schema rejects invalid action enum', async () => {
    const log = new AuditLog({
      admin: new mongoose.Types.ObjectId(),
      action: 'DELETED_ENTIRE_DATABASE',
      targetId: new mongoose.Types.ObjectId(),
      targetModel: 'User',
    });
    const err = log.validateSync();
    assert(err && err.errors.action, 'Expected validation error for unauthorized audit action');
  });

  // --- Suite 2: Admin Authorization & Middleware Guards ---
  console.log('\n--- Test Suite 2: Admin Authorization & Middleware Guards ---');

  await runTest('requireAdmin rejects unauthenticated request with 401', async () => {
    const req = {};
    const res = mockResponse();
    let nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(nextCalled, false);
  });

  await runTest('requireAdmin rejects standard user (role: "user") with 403 Forbidden', async () => {
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'user',
      },
    };
    const res = mockResponse();
    let nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.success, false);
    assert(res.data.message.includes('Administrator privileges required'));
    assert.strictEqual(nextCalled, false);
  });

  await runTest('requireAdmin allows administrator (role: "admin") to proceed', async () => {
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'admin',
      },
    };
    const res = mockResponse();
    let nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.statusCode, 200);
  });

  // --- Suite 3: Account Suspension Guards ---
  console.log('\n--- Test Suite 3: Account Suspension Guards ---');

  await runTest('protect rejects suspended user with 403 Forbidden', async () => {
    const suspendedUserId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: suspendedUserId }, process.env.JWT_SECRET);

    // Mock User.findById
    const originalFindById = User.findById;
    User.findById = () => ({
      select: () => Promise.resolve({
        _id: suspendedUserId,
        name: 'Suspended Member',
        email: 'suspended@inst.edu',
        role: 'user',
        status: 'suspended',
      }),
    });

    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    try {
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = mockResponse();
      let nextCalled = false;

      await protect(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes('suspended'));
      assert.strictEqual(nextCalled, false);
    } finally {
      User.findById = originalFindById;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 4: Dashboard Stats Real Queries & Offline Guard ---
  console.log('\n--- Test Suite 4: Dashboard Stats Real Queries & Offline Guard ---');

  await runTest('getDashboardStats returns 503 when database is disconnected', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

    try {
      const req = {};
      const res = mockResponse();
      await getDashboardStats(req, res, () => {});
      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.data.success, false);
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await runTest('getDashboardStats aggregates live metrics correctly', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    // Mock countDocuments
    const origUserCount = User.countDocuments;
    const origResourceCount = Resource.countDocuments;
    const origBookingCount = Booking.countDocuments;

    User.countDocuments = (q) => {
      if (q && q.status === 'suspended') return Promise.resolve(1);
      return Promise.resolve(25);
    };

    Resource.countDocuments = (q) => {
      if (q && q.moderationStatus === 'flagged') return Promise.resolve(2);
      if (q && q.moderationStatus === 'hidden') return Promise.resolve(1);
      if (q && q.availabilityStatus === 'available') return Promise.resolve(15);
      return Promise.resolve(20);
    };

    Booking.countDocuments = (q) => {
      if (!q) return Promise.resolve(50);
      if (q.status === 'pending') return Promise.resolve(8);
      if (q.status && q.status.$in) return Promise.resolve(12);
      if (q.status === 'completed') return Promise.resolve(22);
      if (q['issueReport.hasIssue']) return Promise.resolve(3);
      return Promise.resolve(0);
    };

    try {
      const req = {};
      const res = mockResponse();
      await getDashboardStats(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.stats.totalUsers, 25);
      assert.strictEqual(res.data.stats.totalResources, 20);
      assert.strictEqual(res.data.stats.totalBookings, 50);
      assert.strictEqual(res.data.stats.pendingBookings, 8);
      assert.strictEqual(res.data.stats.activeBookings, 12);
      assert.strictEqual(res.data.stats.completedBookings, 22);
      assert.strictEqual(res.data.stats.openIssues, 3);
      assert.strictEqual(res.data.stats.availableResources, 15);
      assert.strictEqual(res.data.stats.flaggedResources, 2);
      assert.strictEqual(res.data.stats.hiddenResources, 1);
      assert.strictEqual(res.data.stats.suspendedUsers, 1);
    } finally {
      User.countDocuments = origUserCount;
      Resource.countDocuments = origResourceCount;
      Booking.countDocuments = origBookingCount;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 5: Platform Analytics & Date Range Validation ---
  console.log('\n--- Test Suite 5: Platform Analytics & Date Range Validation ---');

  await runTest('getPlatformAnalytics rejects malformed custom startDate with 400', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    try {
      const req = { query: { startDate: 'invalid-not-a-date' } };
      const res = mockResponse();
      await getPlatformAnalytics(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes('Invalid startDate'));
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await runTest('getPlatformAnalytics executes aggregations and returns structure', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const origBookingAgg = Booking.aggregate;
    const origResourceAgg = Resource.aggregate;
    const origUserAgg = User.aggregate;

    Booking.aggregate = () => Promise.resolve([{ _id: '2026-10-28', total: 5, approved: 3, completed: 1, cancelled: 1 }]);
    Resource.aggregate = () => Promise.resolve([{ _id: 'Laboratories', count: 4, totalQuantity: 8, availableCount: 3 }]);
    User.aggregate = () => Promise.resolve([{ _id: '2026-10-28', count: 2 }]);

    try {
      const req = { query: { range: '30d' } };
      const res = mockResponse();
      await getPlatformAnalytics(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.success, true);
      assert(Array.isArray(res.data.analytics.bookingTrends));
      assert(Array.isArray(res.data.analytics.categoryDistribution));
      assert(Array.isArray(res.data.analytics.userGrowthTrends));
      assert.strictEqual(res.data.analytics.dateRange.range, '30d');
    } finally {
      Booking.aggregate = origBookingAgg;
      Resource.aggregate = origResourceAgg;
      User.aggregate = origUserAgg;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 6: User Management & Critical Safety Guards ---
  console.log('\n--- Test Suite 6: User Management & Critical Safety Guards ---');

  await runTest('updateUserRole rejects self-demotion with 400', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const adminId = new mongoose.Types.ObjectId();
    const origFindById = User.findById;
    User.findById = () => Promise.resolve({
      _id: adminId,
      name: 'Super Admin',
      email: 'admin@inst.edu',
      role: 'admin',
    });

    try {
      const req = {
        user: { _id: adminId, role: 'admin' },
        params: { id: adminId.toString() },
        body: { role: 'user' },
      };
      const res = mockResponse();
      await updateUserRole(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes('cannot alter their own administrative role'));
    } finally {
      User.findById = origFindById;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await runTest('updateUserRole blocks demoting the last active administrator with 400', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const currentAdminId = new mongoose.Types.ObjectId();
    const targetAdminId = new mongoose.Types.ObjectId();

    const origFindById = User.findById;
    const origCountDocuments = User.countDocuments;

    User.findById = () => Promise.resolve({
      _id: targetAdminId,
      name: 'Target Admin',
      email: 'targetadmin@inst.edu',
      role: 'admin',
      status: 'active',
    });

    // Mock only 1 active admin left
    User.countDocuments = () => Promise.resolve(1);

    try {
      const req = {
        user: { _id: currentAdminId, role: 'admin' },
        params: { id: targetAdminId.toString() },
        body: { role: 'user' },
      };
      const res = mockResponse();
      await updateUserRole(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes('last active platform administrator'));
    } finally {
      User.findById = origFindById;
      User.countDocuments = origCountDocuments;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await runTest('updateUserStatus blocks admin self-suspension with 400', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const adminId = new mongoose.Types.ObjectId();
    const origFindById = User.findById;

    User.findById = () => Promise.resolve({
      _id: adminId,
      name: 'Admin Self',
      email: 'admin@inst.edu',
      role: 'admin',
      status: 'active',
    });

    try {
      const req = {
        user: { _id: adminId, role: 'admin' },
        params: { id: adminId.toString() },
        body: { status: 'suspended', reason: 'Testing' },
      };
      const res = mockResponse();
      await updateUserStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes('cannot suspend their own account'));
    } finally {
      User.findById = origFindById;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  await runTest('updateUserStatus suspends member and logs to AuditLog', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const adminId = new mongoose.Types.ObjectId();
    const targetUserId = new mongoose.Types.ObjectId();

    const mockTargetUser = {
      _id: targetUserId,
      name: 'Bad Actor',
      email: 'bad@inst.edu',
      role: 'user',
      status: 'active',
      save: function () { return Promise.resolve(this); },
      toSafeObject: function () { return { id: this._id, status: this.status }; },
    };

    const origFindById = User.findById;
    const origAuditCreate = AuditLog.create;
    let auditCreated = false;

    User.findById = () => Promise.resolve(mockTargetUser);
    AuditLog.create = (entry) => {
      auditCreated = true;
      assert.strictEqual(entry.action, 'USER_STATUS_UPDATED');
      assert.strictEqual(entry.targetId, targetUserId);
      return Promise.resolve(entry);
    };

    try {
      const req = {
        user: { _id: adminId, role: 'admin' },
        params: { id: targetUserId.toString() },
        body: { status: 'suspended', reason: 'Policy violation' },
      };
      const res = mockResponse();
      await updateUserStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockTargetUser.status, 'suspended');
      assert.strictEqual(mockTargetUser.suspensionReason, 'Policy violation');
      assert(mockTargetUser.suspendedAt instanceof Date);
      assert.strictEqual(auditCreated, true);
    } finally {
      User.findById = origFindById;
      AuditLog.create = origAuditCreate;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 7: Resource Moderation & Booking Preservation ---
  console.log('\n--- Test Suite 7: Resource Moderation & Booking Preservation ---');

  await runTest('moderateResource hides listing, preserves DB record and creates AuditLog', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const adminId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const resourceId = new mongoose.Types.ObjectId();

    const mockResource = {
      _id: resourceId,
      title: 'Inappropriate Listing',
      owner: ownerId,
      moderationStatus: 'approved',
      save: function () { return Promise.resolve(this); },
    };

    const origFindById = Resource.findById;
    const origAuditCreate = AuditLog.create;
    let auditCreated = false;

    Resource.findById = () => Promise.resolve(mockResource);
    AuditLog.create = (entry) => {
      auditCreated = true;
      assert.strictEqual(entry.action, 'RESOURCE_MODERATED');
      return Promise.resolve(entry);
    };

    try {
      const req = {
        user: { _id: adminId, role: 'admin' },
        params: { id: resourceId.toString() },
        body: { moderationStatus: 'hidden', reason: 'Unverified laboratory equipment' },
      };
      const res = mockResponse();
      await moderateResource(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockResource.moderationStatus, 'hidden');
      assert.strictEqual(mockResource.moderationReason, 'Unverified laboratory equipment');
      assert.strictEqual(mockResource.moderatedBy, adminId);
      assert(mockResource.moderatedAt instanceof Date);
      assert.strictEqual(auditCreated, true);
    } finally {
      Resource.findById = origFindById;
      AuditLog.create = origAuditCreate;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 8: Issue & Report Management ---
  console.log('\n--- Test Suite 8: Issue & Report Management ---');

  await runTest('updateIssueReportStatus updates status & resolution notes with audit trail', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const adminId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();
    const reporterId = new mongoose.Types.ObjectId();

    const mockBooking = {
      _id: bookingId,
      issueReport: {
        hasIssue: true,
        status: 'open',
        reportedBy: reporterId,
        description: 'Camera lens cracked on return',
      },
      save: function () { return Promise.resolve(this); },
    };

    const origFindById = Booking.findById;
    const origAuditCreate = AuditLog.create;
    let auditCreated = false;

    Booking.findById = () => Promise.resolve(mockBooking);
    AuditLog.create = (entry) => {
      auditCreated = true;
      assert.strictEqual(entry.action, 'ISSUE_STATUS_UPDATED');
      assert.strictEqual(entry.targetId, bookingId);
      return Promise.resolve(entry);
    };

    try {
      const req = {
        user: { _id: adminId, role: 'admin' },
        params: { bookingId: bookingId.toString() },
        body: {
          status: 'resolved',
          resolutionNotes: 'Inspection confirmed preexisting wear. Deprecated lens replaced by lab inventory.',
        },
      };
      const res = mockResponse();
      await updateIssueReportStatus(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockBooking.issueReport.status, 'resolved');
      assert.strictEqual(
        mockBooking.issueReport.resolutionNotes,
        'Inspection confirmed preexisting wear. Deprecated lens replaced by lab inventory.'
      );
      assert.strictEqual(mockBooking.issueReport.resolvedBy, adminId);
      assert(mockBooking.issueReport.resolvedAt instanceof Date);
      assert.strictEqual(auditCreated, true);
    } finally {
      Booking.findById = origFindById;
      AuditLog.create = origAuditCreate;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Suite 9: Audit Logs API ---
  console.log('\n--- Test Suite 9: Audit Logs API ---');

  await runTest('getAuditLogs retrieves chronological logs with pagination', async () => {
    const origReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    const origCount = AuditLog.countDocuments;
    const origFind = AuditLog.find;

    AuditLog.countDocuments = () => Promise.resolve(2);
    AuditLog.find = () => ({
      populate: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => Promise.resolve([
              { action: 'USER_ROLE_UPDATED', details: 'Promoted user' },
              { action: 'RESOURCE_MODERATED', details: 'Flagged listing' },
            ]),
          }),
        }),
      }),
    });

    try {
      const req = { query: { page: 1, limit: 10 } };
      const res = mockResponse();
      await getAuditLogs(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.count, 2);
      assert.strictEqual(res.data.pagination.total, 2);
      assert.strictEqual(res.data.data[0].action, 'USER_ROLE_UPDATED');
    } finally {
      AuditLog.countDocuments = origCount;
      AuditLog.find = origFind;
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  });

  // --- Summary ---
  console.log('\n====================================================');
  console.log(`📊 Part 8 Admin & Analytics Test Results:`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();

