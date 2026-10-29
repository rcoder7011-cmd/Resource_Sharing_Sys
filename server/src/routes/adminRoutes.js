const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/authMiddleware');
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
  getRescueSummary,
  getRescueResources,
  getRescueResourceDetails,
} = require('../controllers/adminController');

// All administrative endpoints require valid authentication AND administrator role
router.use(protect);
router.use(requireAdmin);

// Dashboard overview & real metrics
router.get('/stats', getDashboardStats);

// Platform analytics with date filtering
router.get('/analytics', getPlatformAnalytics);

// Smart Resource Rescue (Part 11) intelligence & analytics
router.get('/rescue/summary', getRescueSummary);
router.get('/rescue/resources', getRescueResources);
router.get('/rescue/resources/:id', getRescueResourceDetails);

// User management
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);

// Resource moderation
router.get('/resources', getResources);
router.patch('/resources/:id/moderation', moderateResource);

// Issue & condition report resolution
router.get('/issues', getIssueReports);
router.patch('/issues/:bookingId/status', updateIssueReportStatus);

// Audit logging
router.get('/audit-logs', getAuditLogs);

module.exports = router;

