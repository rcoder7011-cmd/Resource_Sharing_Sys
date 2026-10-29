const mongoose = require('mongoose');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { createAndSendNotification } = require('../services/notificationService');
const {
  getPlatformRescueSummary,
  getPlatformRescueResources,
  getSingleResourceRescueDetails,
} = require('../services/rescueService');

/**
 * Helper to check MongoDB connection status
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * @desc    Get system dashboard overview metrics
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const [
      totalUsers,
      totalResources,
      totalBookings,
      pendingBookings,
      activeBookings,
      completedBookings,
      openIssues,
      availableResources,
      flaggedResources,
      hiddenResources,
      suspendedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Resource.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: { $in: ['approved', 'checked_in'] } }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({
        'issueReport.hasIssue': true,
        'issueReport.status': { $in: ['open', 'under_review'] },
      }),
      Resource.countDocuments({
        availabilityStatus: 'available',
        moderationStatus: { $ne: 'hidden' },
      }),
      Resource.countDocuments({ moderationStatus: 'flagged' }),
      Resource.countDocuments({ moderationStatus: 'hidden' }),
      User.countDocuments({ status: 'suspended' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalResources,
        totalBookings,
        pendingBookings,
        activeBookings,
        completedBookings,
        openIssues,
        availableResources,
        flaggedResources,
        hiddenResources,
        suspendedUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregated platform analytics with date filters
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 */
const getPlatformAnalytics = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { range = '30d', startDate: customStart, endDate: customEnd } = req.query;

    const now = new Date();
    let startDate;
    let endDate = now;

    if (customStart) {
      startDate = new Date(customStart);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Expected ISO 8601 date string.',
        });
      }
    } else {
      switch (range) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0);
          break;
        case '30d':
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    if (customEnd) {
      endDate = new Date(customEnd);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Expected ISO 8601 date string.',
        });
      }
    }

    const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

    const [
      bookingTrends,
      categoryDistribution,
      topRequestedResources,
      bookingStatusDistribution,
      userGrowthTrends,
    ] = await Promise.all([
      // 1. Booking activity over time grouped by date
      Booking.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $in: ['$status', ['approved', 'checked_in', 'completed']] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 2. Resource categories and their distribution
      Resource.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            availableCount: {
              $sum: {
                $cond: [{ $eq: ['$availabilityStatus', 'available'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // 3. Most requested resources
      Booking.aggregate([
        {
          $group: {
            _id: '$resource',
            totalBookings: { $sum: 1 },
            approvedBookings: {
              $sum: { $cond: [{ $in: ['$status', ['approved', 'checked_in', 'completed']] }, 1, 0] },
            },
          },
        },
        { $sort: { totalBookings: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: 'resources',
            localField: '_id',
            foreignField: '_id',
            as: 'resourceDetails',
          },
        },
        { $unwind: '$resourceDetails' },
        {
          $project: {
            _id: 1,
            title: '$resourceDetails.title',
            category: '$resourceDetails.category',
            totalBookings: 1,
            approvedBookings: 1,
          },
        },
      ]),

      // 4. Booking status distribution
      Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // 5. User registration trends over time
      User.aggregate([
        { $match: dateMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        dateRange: {
          startDate,
          endDate,
          range,
        },
        bookingTrends,
        categoryDistribution,
        topRequestedResources,
        bookingStatusDistribution,
        userGrowthTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated users list with search & filters
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      status = '',
      sortBy = 'newest',
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }

    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    if (status && ['active', 'suspended'].includes(status)) {
      query.status = status;
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'name-asc': { name: 1 },
      'name-desc': { name: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page: pageNum,
        pages: totalPages,
        limit: limitNum,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      },
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user role (user/admin) with self-protection & last-admin guards
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Role must be "user" or "admin".',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // 1. Self-protection: Administrator cannot modify their own administrative role
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot alter their own administrative role.',
      });
    }

    // 2. Last-admin protection: Cannot demote the last active administrator
    if (targetUser.role === 'admin' && role === 'user') {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        status: 'active',
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last active platform administrator.',
        });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Create persistent AuditLog entry
    await AuditLog.create({
      admin: req.user._id,
      action: 'USER_ROLE_UPDATED',
      targetId: targetUser._id,
      targetModel: 'User',
      details: `Role updated from "${previousRole}" to "${role}" for user ${targetUser.email}`,
      metadata: {
        previousRole,
        newRole: role,
        targetEmail: targetUser.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}`,
      user: targetUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Suspend or activate user account with self-suspension & last-admin guards
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
const updateUserStatus = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    const { status, reason = '' } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be "active" or "suspended".',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    // 1. Self-protection: Administrator cannot suspend their own account
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot suspend their own account.',
      });
    }

    // 2. Last-admin protection: Cannot suspend the last active administrator
    if (targetUser.role === 'admin' && status === 'suspended') {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        status: 'active',
      });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot suspend the last active platform administrator.',
        });
      }
    }

    const previousStatus = targetUser.status || 'active';
    targetUser.status = status;

    if (status === 'suspended') {
      targetUser.suspendedAt = new Date();
      targetUser.suspensionReason = reason.trim();
    } else {
      targetUser.suspendedAt = null;
      targetUser.suspensionReason = '';
    }

    await targetUser.save();

    // Create persistent AuditLog entry
    await AuditLog.create({
      admin: req.user._id,
      action: 'USER_STATUS_UPDATED',
      targetId: targetUser._id,
      targetModel: 'User',
      details: `Account status updated from "${previousStatus}" to "${status}" for user ${targetUser.email}. Reason: ${reason || 'N/A'}`,
      metadata: {
        previousStatus,
        newStatus: status,
        reason,
        targetEmail: targetUser.email,
      },
    });

    return res.status(200).json({
      success: true,
      message: `User account successfully ${status === 'active' ? 'reactivated' : 'suspended'}`,
      user: targetUser.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated resources with moderation details
 * @route   GET /api/admin/resources
 * @access  Private/Admin
 */
const getResources = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      moderationStatus = '',
      availabilityStatus = '',
      sortBy = 'newest',
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { institution: { $regex: term, $options: 'i' } },
      ];
    }

    if (category && category !== 'All Categories') {
      query.category = category;
    }

    if (moderationStatus && ['approved', 'flagged', 'hidden'].includes(moderationStatus)) {
      query.moderationStatus = moderationStatus;
    }

    if (availabilityStatus && ['available', 'unavailable', 'maintenance'].includes(availabilityStatus)) {
      query.availabilityStatus = availabilityStatus;
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'title-asc': { title: 1 },
      'title-desc': { title: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Resource.countDocuments(query);
    const resources = await Resource.find(query)
      .populate('owner', 'name email role status')
      .populate('moderatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      count: resources.length,
      pagination: {
        total,
        page: pageNum,
        pages: totalPages,
        limit: limitNum,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      },
      data: resources,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Moderate resource listing (approved/flagged/hidden) without destroying booking history
 * @route   PATCH /api/admin/resources/:id/moderation
 * @access  Private/Admin
 */
const moderateResource = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    const { moderationStatus, reason = '' } = req.body;

    if (!moderationStatus || !['approved', 'flagged', 'hidden'].includes(moderationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid moderationStatus. Must be "approved", "flagged", or "hidden".',
      });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource listing not found',
      });
    }

    const previousStatus = resource.moderationStatus || 'approved';
    resource.moderationStatus = moderationStatus;
    resource.moderationReason = reason.trim();
    resource.moderatedBy = req.user._id;
    resource.moderatedAt = new Date();
    await resource.save();

    // Create AuditLog entry
    await AuditLog.create({
      admin: req.user._id,
      action: 'RESOURCE_MODERATED',
      targetId: resource._id,
      targetModel: 'Resource',
      details: `Resource "${resource.title}" status changed from "${previousStatus}" to "${moderationStatus}". Reason: ${reason || 'N/A'}`,
      metadata: {
        resourceTitle: resource.title,
        previousStatus,
        newStatus: moderationStatus,
        reason,
      },
    });

    // Notify resource owner of moderation action
    await createAndSendNotification({
      recipient: resource.owner,
      sender: req.user._id,
      type: 'system',
      title: 'Listing Moderation Update',
      message: `Your listing "${resource.title}" has been updated to "${moderationStatus}" by institutional administrators.${reason ? ` Reason: ${reason}` : ''}`,
      resource: resource._id,
      link: '/dashboard',
    });

    return res.status(200).json({
      success: true,
      message: `Resource listing successfully updated to "${moderationStatus}"`,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated issue reports with booking & condition history
 * @route   GET /api/admin/issues
 * @access  Private/Admin
 */
const getIssueReports = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      page = 1,
      limit = 10,
      status = '',
      dateFrom,
      dateTo,
    } = req.query;

    const query = {
      'issueReport.hasIssue': true,
    };

    if (status && ['open', 'under_review', 'resolved'].includes(status)) {
      query['issueReport.status'] = status;
    }

    if (dateFrom || dateTo) {
      query['issueReport.reportedAt'] = {};
      if (dateFrom) query['issueReport.reportedAt'].$gte = new Date(dateFrom);
      if (dateTo) query['issueReport.reportedAt'].$lte = new Date(dateTo);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Booking.countDocuments(query);
    const bookingsWithIssues = await Booking.find(query)
      .populate('requester', 'name email role')
      .populate('owner', 'name email role')
      .populate('resource', 'title category location images')
      .populate('issueReport.reportedBy', 'name email')
      .populate('issueReport.resolvedBy', 'name email')
      .sort({ 'issueReport.reportedAt': -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      count: bookingsWithIssues.length,
      pagination: {
        total,
        page: pageNum,
        pages: totalPages,
        limit: limitNum,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      },
      data: bookingsWithIssues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update issue report status & administrative resolution note
 * @route   PATCH /api/admin/issues/:bookingId/status
 * @access  Private/Admin
 */
const updateIssueReportStatus = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { bookingId } = req.params;
    const { status, resolutionNotes = '' } = req.body;

    if (!status || !['open', 'under_review', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "open", "under_review", or "resolved".',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (!booking.issueReport || !booking.issueReport.hasIssue) {
      return res.status(400).json({
        success: false,
        message: 'This booking does not contain an active issue report.',
      });
    }

    const previousStatus = booking.issueReport.status || 'open';
    booking.issueReport.status = status;
    booking.issueReport.resolutionNotes = resolutionNotes.trim();
    booking.issueReport.resolvedBy = req.user._id;
    booking.issueReport.resolvedAt = new Date();
    await booking.save();

    // Create AuditLog entry
    await AuditLog.create({
      admin: req.user._id,
      action: 'ISSUE_STATUS_UPDATED',
      targetId: booking._id,
      targetModel: 'Booking',
      details: `Issue report status updated from "${previousStatus}" to "${status}". Notes: ${resolutionNotes || 'N/A'}`,
      metadata: {
        bookingId: booking._id,
        previousStatus,
        newStatus: status,
        resolutionNotes,
      },
    });

    // Notify the user who reported the issue
    if (booking.issueReport.reportedBy) {
      await createAndSendNotification({
        recipient: booking.issueReport.reportedBy,
        sender: req.user._id,
        type: 'booking_issue_reported',
        title: `Issue Report Status: ${status === 'resolved' ? 'Resolved' : 'Under Institutional Review'}`,
        message: `Your reported condition issue has been marked as "${status}".${resolutionNotes ? ` Resolution Note: ${resolutionNotes}` : ''}`,
        booking: booking._id,
        resource: booking.resource,
        link: '/dashboard',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Issue report status updated to "${status}"`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated administrative audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private/Admin
 */
const getAuditLogs = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { page = 1, limit = 20, action = '' } = req.query;

    const query = {};
    if (action) {
      query.action = action;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('admin', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      count: logs.length,
      pagination: {
        total,
        page: pageNum,
        pages: totalPages,
        limit: limitNum,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      },
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get platform-wide Smart Resource Rescue summary metrics
 * @route   GET /api/admin/rescue/summary
 * @access  Private/Admin
 */
const getRescueSummary = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const windowDays = parseInt(req.query.windowDays, 10) || 30;
    const summary = await getPlatformRescueSummary(windowDays);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of resources evaluated by Smart Resource Rescue engine with filters
 * @route   GET /api/admin/rescue/resources
 * @access  Private/Admin
 */
const getRescueResources = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      windowDays = 30,
      classification = 'all',
      category,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await getPlatformRescueResources({
      windowDays: parseInt(windowDays, 10) || 30,
      classification,
      category,
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    return res.status(200).json({
      success: true,
      count: result.resources.length,
      pagination: result.pagination,
      data: result.resources,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed rescue analytics and recommendations for a single resource
 * @route   GET /api/admin/rescue/resources/:id
 * @access  Private/Admin
 */
const getRescueResourceDetails = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    const windowDays = parseInt(req.query.windowDays, 10) || 30;

    const details = await getSingleResourceRescueDetails(id, windowDays);
    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};

