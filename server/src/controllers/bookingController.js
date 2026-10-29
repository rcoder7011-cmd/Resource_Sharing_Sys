const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Resource = require('../models/Resource');
const { createAndSendNotification } = require('../services/notificationService');
const {
  saveEvidenceFile,
  getEvidenceFilePath,
  parseBase64Upload,
} = require('../services/evidenceStorageService');
const {
  withResourceLock,
  calculateSlotAvailability,
  syncResourceAvailability,
} = require('../services/availabilityService');

/**
 * Check MongoDB connection status
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * @desc    Submit a new booking request for a resource
 * @route   POST /api/bookings
 * @access  Private
 */
const createBooking = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { resourceId, resource: resourceField, startAt, endAt, quantity = 1, purpose } = req.body;
    const targetResourceId = resourceId || resourceField;

    // 1. Target resource validation
    if (!targetResourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required to make a booking request',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetResourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Resource ID format',
      });
    }

    // 2. Date and time validation
    if (!startAt || !endAt) {
      return res.status(400).json({
        success: false,
        message: 'Both start time and end time are required',
      });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format. Please provide valid ISO date strings.',
      });
    }

    // Allow 2-minute buffer for network/clock skew
    const nowWithBuffer = new Date(Date.now() - 120000);
    if (startDate < nowWithBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Booking start time cannot be in the past',
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End time must be strictly after start time',
      });
    }

    // Minimum booking duration: 15 minutes
    const durationMinutes = (endDate - startDate) / 60000;
    if (durationMinutes < 15) {
      return res.status(400).json({
        success: false,
        message: 'Booking duration must be at least 15 minutes',
      });
    }

    // 3. Purpose validation
    if (!purpose || typeof purpose !== 'string' || purpose.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clear purpose for the booking (at least 5 characters)',
      });
    }

    if (purpose.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Booking purpose cannot exceed 500 characters',
      });
    }

    // 4. Quantity validation
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Booking quantity must be a positive integer of at least 1',
      });
    }

    // 5. Fetch resource and verify availability
    const resource = await Resource.findById(targetResourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Requested resource not found',
      });
    }

    if (resource.availabilityStatus !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Resource is currently unavailable for new bookings (Status: ${resource.availabilityStatus})`,
      });
    }

    // 6. Prohibit self-booking
    if (resource.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request a booking for a resource that you own',
      });
    }

    // 7. Verify requested quantity does not exceed resource capacity
    const totalResourceQuantity = resource.quantity || 1;
    if (parsedQuantity > totalResourceQuantity) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity (${parsedQuantity}) exceeds total available units (${totalResourceQuantity})`,
      });
    }

    return await withResourceLock(targetResourceId, async () => {
      // Re-verify resource existence and active status under lock
      const freshResource = await Resource.findById(targetResourceId);
      if (!freshResource || freshResource.availabilityStatus !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Resource is currently unavailable for new bookings`,
        });
      }

      // Check for duplicate booking by the SAME requester:
      // 1. User already has a confirmed/active reservation (approved or checked_in) in this overlapping interval
      // 2. User already submitted an identical pending request (double-submission prevention)
      const existingDuplicates = await Booking.find({
        resource: freshResource._id,
        requester: req.user._id,
        status: { $in: ['pending', 'approved', 'checked_in'] },
        startAt: { $lt: endDate },
        endAt: { $gt: startDate },
      });

      const hasBlockingDuplicate = existingDuplicates.some((b) => {
        if (b.status === 'approved' || b.status === 'checked_in') return true;
        const bStart = new Date(b.startAt).getTime();
        const bEnd = new Date(b.endAt).getTime();
        return bStart === startDate.getTime() && bEnd === endDate.getTime();
      });

      if (hasBlockingDuplicate) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active or pending reservation for this resource during this time. Duplicate submission prevented.',
        });
      }

      // 8. Create booking in pending status
      const booking = await Booking.create({
        resource: freshResource._id,
        requester: req.user._id,
        owner: freshResource.owner,
        startAt: startDate,
        endAt: endDate,
        quantity: parsedQuantity,
        purpose: purpose.trim(),
        status: 'pending',
      });

      // Populate resource and owner information for client convenience
      await booking.populate([
        { path: 'resource', select: 'title images category location quantity availabilityStatus' },
        { path: 'owner', select: 'name email' },
        { path: 'requester', select: 'name email' },
      ]);

      // Part 7: Notify resource owner about new booking request
      createAndSendNotification({
        recipient: booking.owner,
        sender: req.user._id,
        type: 'booking_created',
        title: 'New Booking Request',
        message: `${req.user.name || 'A campus member'} requested booking for "${freshResource.title}".`,
        booking: booking._id,
        resource: freshResource._id,
        link: '/dashboard?tab=incoming-requests',
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Booking request submitted successfully. Awaiting custodian approval.',
        data: booking,
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all bookings submitted by the authenticated requester
 * @route   GET /api/bookings/mine
 * @access  Private
 */
const getMyBookings = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const bookings = await Booking.find({ requester: req.user._id })
      .populate('resource', 'title images category location quantity availabilityStatus operatingHours')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all incoming booking requests for resources owned by the user
 * @route   GET /api/bookings/owner
 * @access  Private
 */
const getOwnerBookings = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const bookings = await Booking.find({ owner: req.user._id })
      .populate('resource', 'title images category location quantity availabilityStatus')
      .populate('requester', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single booking by ID (Requester, Owner, or Admin only)
 * @route   GET /api/bookings/:id
 * @access  Private
 */
const getBookingById = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('resource', 'title images category location quantity availabilityStatus operatingHours')
      .populate('requester', 'name email')
      .populate('owner', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const requesterId = booking.requester?._id
      ? booking.requester._id.toString()
      : booking.requester?.toString();
    const ownerId = booking.owner?._id
      ? booking.owner._id.toString()
      : booking.owner?.toString();
    const currentUserId = req.user._id.toString();

    if (requesterId !== currentUserId && ownerId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a booking request (Requester or Admin only)
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private
 */
const cancelBooking = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isRequester = booking.requester.toString() === req.user._id.toString();
    if (!isRequester && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the original requester or an administrator can cancel this booking',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already cancelled',
      });
    }

    if (booking.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a booking that was already rejected',
      });
    }

    if (booking.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a booking that is already checked in. Please complete check-out/return instead.',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking',
      });
    }

    // Check if the booking time window is already completely in the past
    if (new Date(booking.endAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a booking that has already concluded',
      });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // Automatically sync and restore resource availability in MongoDB
    await syncResourceAvailability(booking.resource);

    // Part 7: Notify the relevant other party
    const isCancelledByBorrower = booking.requester.toString() === req.user._id.toString();
    const cancelRecipient = isCancelledByBorrower ? booking.owner : booking.requester;
    const cancelLink = isCancelledByBorrower
      ? '/dashboard?tab=incoming-requests'
      : '/dashboard?tab=my-bookings';

    createAndSendNotification({
      recipient: cancelRecipient,
      sender: req.user._id,
      type: 'booking_cancelled',
      title: 'Booking Reservation Cancelled',
      message: `${req.user.name || 'A user'} cancelled the booking reservation.`,
      booking: booking._id,
      resource: booking.resource,
      link: cancelLink,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Booking has been cancelled successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a booking request (Owner or Admin only)
 *          Strictly re-verifies availability and overlap capacity
 * @route   PATCH /api/bookings/:id/approve
 * @access  Private
 */
const approveBooking = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isOwner = booking.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the resource owner or an administrator can approve this booking',
      });
    }

    if (booking.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already approved',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a booking with status '${booking.status}'`,
      });
    }

    // Check if requested time window has already concluded
    if (new Date(booking.endAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve an expired booking request whose time window has concluded',
      });
    }

    // Verify parent resource exists and is in available status
    const resource = await Resource.findById(booking.resource);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Associated resource not found',
      });
    }

    if (resource.availabilityStatus !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve booking because resource is currently '${resource.availabilityStatus}'`,
      });
    }

    return await withResourceLock(booking.resource, async () => {
      let session = null;
      if (
        mongoose.connection.readyState === 1 &&
        mongoose.connection.client &&
        typeof mongoose.connection.client.startSession === 'function'
      ) {
        try {
          const s = await mongoose.startSession();
          if (s && typeof s.startTransaction === 'function') {
            try {
              s.startTransaction();
              session = s;
            } catch (txErr) {
              const isUnsupported =
                txErr.message?.includes('Transaction numbers are only allowed on a replica set') ||
                txErr.message?.includes('Transactions are not supported') ||
                txErr.message?.includes('replica set') ||
                txErr.code === 20;
              if (isUnsupported) {
                session = null;
              } else {
                throw txErr;
              }
            }
          }
        } catch (sessErr) {
          const isUnsupported =
            sessErr.message?.includes('Transaction numbers are only allowed on a replica set') ||
            sessErr.message?.includes('Transactions are not supported') ||
            sessErr.message?.includes('replica set') ||
            sessErr.message?.includes('not supported') ||
            sessErr.code === 20;
          if (isUnsupported) {
            session = null;
          } else {
            throw sessErr;
          }
        }
      }

      try {
        const queryOptions = session ? { session } : {};

        // Re-fetch latest booking document to prevent duplicate approvals
        const currentBooking = await Booking.findById(id, null, queryOptions);
        if (!currentBooking) {
          if (session) await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: 'Booking not found',
          });
        }

        if (currentBooking.status === 'approved') {
          if (session) await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: 'This booking is already approved',
          });
        }

        if (currentBooking.status !== 'pending') {
          if (session) await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Cannot approve a booking with status '${currentBooking.status}'`,
          });
        }

        // Overlap Check & Capacity Management:
        // Two intervals [A_start, A_end] and [B_start, B_end] overlap if and only if:
        // A_start < B_end AND A_end > B_start.
        // Note: If A_end === B_start (adjacent), they do NOT overlap.
        const overlappingBookings = await Booking.find({
          resource: currentBooking.resource,
          status: { $in: ['approved', 'checked_in'] },
          _id: { $ne: currentBooking._id },
          startAt: { $lt: currentBooking.endAt },
          endAt: { $gt: currentBooking.startAt },
        }, null, queryOptions);

        const totalCapacity = resource.quantity || 1;
        const requestedQuantity = currentBooking.quantity || 1;
        const currentlyBookedQuantity = overlappingBookings.reduce(
          (sum, b) => sum + (b.quantity || 1),
          0
        );

        if (currentlyBookedQuantity + requestedQuantity > totalCapacity) {
          if (session) await session.abortTransaction();
          const availableCapacity = Math.max(0, totalCapacity - currentlyBookedQuantity);
          return res.status(409).json({
            success: false,
            message: `Cannot approve booking: overlapping confirmed bookings exceed total resource capacity. Total capacity: ${totalCapacity}, currently booked: ${currentlyBookedQuantity}, available: ${availableCapacity}, requested: ${requestedQuantity}.`,
          });
        }

        currentBooking.status = 'approved';
        currentBooking.reviewedAt = new Date();
        await currentBooking.save(queryOptions);

        if (session) {
          await session.commitTransaction();
        }

        // Automatically sync and update resource availability in MongoDB
        await syncResourceAvailability(currentBooking.resource);

        // Part 7: Notify borrower of booking approval
        createAndSendNotification({
          recipient: currentBooking.requester,
          sender: req.user._id,
          type: 'booking_approved',
          title: 'Booking Request Approved',
          message: `Your booking for "${resource.title}" was approved by the custodian.`,
          booking: currentBooking._id,
          resource: currentBooking.resource,
          link: '/dashboard?tab=my-bookings',
        }).catch(() => {});

        return res.status(200).json({
          success: true,
          message: 'Booking request approved successfully',
          data: currentBooking,
        });
      } catch (opErr) {
        if (session) {
          try { await session.abortTransaction(); } catch {}
        }
        throw opErr;
      } finally {
        if (session) {
          try { await session.endSession(); } catch {}
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a booking request (Owner or Admin only)
 * @route   PATCH /api/bookings/:id/reject
 * @access  Private
 */
const rejectBooking = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isOwner = booking.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the resource owner or an administrator can reject this booking',
      });
    }

    if (booking.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already rejected',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a booking with status '${booking.status}'`,
      });
    }

    const reason = req.body.ownerResponse || req.body.reason || '';

    booking.status = 'rejected';
    booking.ownerResponse = String(reason).trim();
    booking.reviewedAt = new Date();
    await booking.save();

    // Automatically sync and restore resource availability in MongoDB
    await syncResourceAvailability(booking.resource);

    // Part 7: Notify borrower of booking rejection
    const reasonText = booking.ownerResponse ? ` Reason: "${booking.ownerResponse}"` : '';
    createAndSendNotification({
      recipient: booking.requester,
      sender: req.user._id,
      type: 'booking_rejected',
      title: 'Booking Request Declined',
      message: `Your booking request was declined by the custodian.${reasonText}`,
      booking: booking._id,
      resource: booking.resource,
      link: '/dashboard?tab=my-bookings',
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Booking request rejected',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Condition rank helper to objectively compare initial and final condition
 */
const CONDITION_RANKS = {
  excellent: 4,
  good: 3,
  fair: 2,
  damaged: 1,
};

/**
 * Robust user ID comparison helper that safely handles populated ObjectIds and strings
 */
const isSameUserId = (userField, targetId) => {
  if (!userField || !targetId) return false;
  const fieldId = userField._id ? userField._id.toString() : userField.toString();
  const targetIdStr = targetId._id ? targetId._id.toString() : targetId.toString();
  return fieldId === targetIdStr;
};

/**
 * @desc    Check in / pick up resource for an approved booking (Borrower only)
 * @route   POST /api/bookings/:id/check-in
 * @access  Private
 */
const checkInBooking = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // 1. Borrower or Owner authorization check
    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';
    const isHandoverProof = Boolean(
      req.isHandoverProof ||
      (req.originalUrl && req.originalUrl.includes('handover')) ||
      (req.url && req.url.includes('handover'))
    );

    if (!isBorrower && !(isHandoverProof && isOwner) && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: isHandoverProof
          ? 'Only the authorized borrower or resource owner can record handover proof'
          : 'Only the borrower who reserved this resource can complete check-in',
      });
    }

    // 2. Status and duplicate verification
    if (booking.checkIn && booking.checkIn.checkedInAt) {
      return res.status(400).json({
        success: false,
        message: 'Resource is already checked in for this booking / Handover proof has already been recorded',
      });
    }

    if (booking.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Resource is already checked in for this booking',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot check in a completed booking',
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in a ${booking.status} booking`,
      });
    }

    if (booking.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be in approved status before check-in can occur',
      });
    }

    // 3. Time window check: Booking must not have already ended
    if (new Date(booking.endAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check in: the scheduled booking time window has already expired',
      });
    }

    // 4. Request validation
    const { condition, notes, photos, reviewedAndConfirmed } = req.body;

    const validConditions = ['excellent', 'good', 'fair', 'damaged'];
    if (!condition || !validConditions.includes(condition)) {
      return res.status(400).json({
        success: false,
        message: 'Initial condition is required and must be one of: excellent, good, fair, damaged',
      });
    }

    if (notes && typeof notes === 'string' && notes.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Check-in notes cannot exceed 1000 characters',
      });
    }

    const validatedPhotos = Array.isArray(photos)
      ? photos.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : [];

    // 5. Update booking record
    booking.checkIn = {
      checkedInAt: new Date(),
      submittedBy: req.user._id,
      reviewedAndConfirmed: reviewedAndConfirmed !== false,
      condition,
      notes: notes ? String(notes).trim() : '',
      photos: validatedPhotos,
    };
    booking.status = 'checked_in';
    await booking.save();

    // Automatically sync resource availability in MongoDB
    await syncResourceAvailability(booking.resource);

    // Part 7: Notify other party about handover & check-in
    const notifyRecipient = isBorrower ? booking.owner : booking.requester;
    createAndSendNotification({
      recipient: notifyRecipient,
      sender: req.user._id,
      type: 'booking_checked_in',
      title: 'Equipment Picked Up & Handover Recorded',
      message: `${req.user.name || 'Participant'} recorded pickup condition (${condition}).`,
      booking: booking._id,
      resource: booking.resource,
      link: isBorrower ? '/dashboard?tab=incoming-requests' : '/dashboard?tab=my-bookings',
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Initial handover proof recorded successfully. Safe usage initiated.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check out / return resource for an active booking (Borrower only)
 * @route   POST /api/bookings/:id/check-out
 * @access  Private
 */
const checkOutBooking = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // 1. Borrower or Owner authorization check
    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the authorized borrower or owner can record return proof',
      });
    }

    // 2. Status & duplicate verification
    if (booking.checkOut && booking.checkOut.checkedOutAt) {
      return res.status(400).json({
        success: false,
        message: 'Return proof has already been recorded for this booking',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Resource has already been returned and checked out',
      });
    }

    if (booking.status !== 'checked_in') {
      return res.status(400).json({
        success: false,
        message: 'Resource must be checked in before it can be returned / checked out',
      });
    }

    if (!booking.checkIn || !booking.checkIn.checkedInAt) {
      return res.status(400).json({
        success: false,
        message: 'Missing initial check-in record. Cannot complete check-out.',
      });
    }

    // 3. Request validation
    const { condition, notes, photos, reviewedAndConfirmed } = req.body;

    const validConditions = ['excellent', 'good', 'fair', 'damaged'];
    if (!condition || !validConditions.includes(condition)) {
      return res.status(400).json({
        success: false,
        message: 'Return condition is required and must be one of: excellent, good, fair, damaged',
      });
    }

    if (notes && typeof notes === 'string' && notes.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Return notes cannot exceed 1000 characters',
      });
    }

    const validatedPhotos = Array.isArray(photos)
      ? photos.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : [];

    // 4. Condition Comparison Analysis
    const initialCondition = booking.checkIn.condition || 'good';
    const initialRank = CONDITION_RANKS[initialCondition] || 3;
    const returnRank = CONDITION_RANKS[condition] || 3;
    const isWorsened = returnRank < initialRank;
    const difference = isWorsened
      ? 'degraded'
      : returnRank > initialRank
      ? 'improved'
      : 'consistent';

    // 5. Update booking record
    booking.checkOut = {
      checkedOutAt: new Date(),
      submittedBy: req.user._id,
      reviewedAndConfirmed: reviewedAndConfirmed !== false,
      condition,
      notes: notes ? String(notes).trim() : '',
      photos: validatedPhotos,
    };
    booking.conditionComparison = {
      isWorsened,
      difference,
    };
    booking.status = 'completed';
    await booking.save();

    // Automatically sync and restore resource availability in MongoDB
    await syncResourceAvailability(booking.resource);

    // Part 7: Notify other party about return & verified condition
    const returnRecipient = isBorrower ? booking.owner : booking.requester;
    createAndSendNotification({
      recipient: returnRecipient,
      sender: req.user._id,
      type: 'booking_returned',
      title: isWorsened
        ? 'Resource Returned with Condition Difference'
        : 'Resource Returned & Completed',
      message: `${req.user.name || 'Participant'} recorded return condition (${condition}).`,
      booking: booking._id,
      resource: booking.resource,
      link: isBorrower ? '/dashboard?tab=incoming-requests' : '/dashboard?tab=my-bookings',
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: isWorsened
        ? 'Resource returned with noted condition difference. You may submit an issue report if needed.'
        : 'Resource returned successfully in verified condition.',
      data: booking,
      conditionComparison: booking.conditionComparison,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Report an issue regarding condition or handover (Borrower, Owner, or Admin)
 * @route   POST /api/bookings/:id/report-issue
 * @access  Private
 */
const reportBookingIssue = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // 1. Authorization check
    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to report an issue for this booking',
      });
    }

    // 2. Handover state check
    const hasHandover =
      booking.status === 'checked_in' ||
      booking.status === 'completed' ||
      Boolean(booking.checkIn?.checkedInAt);

    if (!hasHandover) {
      return res.status(400).json({
        success: false,
        message: 'Issues can only be reported for bookings that have completed check-in or return',
      });
    }

    // 3. Duplicate check
    if (booking.issueReport && booking.issueReport.hasIssue) {
      return res.status(400).json({
        success: false,
        message: 'An issue has already been reported for this booking',
      });
    }

    // 4. Request payload validation
    const { description, category = 'other', photos } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a detailed issue description (at least 5 characters)',
      });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Issue description cannot exceed 2000 characters',
      });
    }

    const validCategories = [
      'condition_degradation',
      'physical_damage',
      'missing_accessories',
      'late_return',
      'other',
    ];
    const validatedCategory = validCategories.includes(category) ? category : 'other';

    const validatedPhotos = Array.isArray(photos)
      ? photos.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : [];

    // 5. Store issue report
    booking.issueReport = {
      hasIssue: true,
      reportedBy: req.user._id,
      category: validatedCategory,
      description: description.trim(),
      photos: validatedPhotos,
      reportedAt: new Date(),
      initialCondition: booking.checkIn?.condition || 'unspecified',
      finalCondition: booking.checkOut?.condition || 'unspecified',
      status: 'open',
    };
    await booking.save();

    // Part 7: Notify other party about the reported condition issue
    const isBorrowerReporter = booking.requester.toString() === req.user._id.toString();
    const issueRecipient = isBorrowerReporter ? booking.owner : booking.requester;
    const issueLink = isBorrowerReporter
      ? '/dashboard?tab=incoming-requests'
      : '/dashboard?tab=my-bookings';

    createAndSendNotification({
      recipient: issueRecipient,
      sender: req.user._id,
      type: 'booking_issue_reported',
      title: 'Resource Condition Issue Reported',
      message: `${req.user.name || 'A user'} logged an issue: "${description.trim().substring(0, 80)}"`,
      booking: booking._id,
      resource: booking.resource,
      link: issueLink,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Issue report submitted successfully for custodian/institutional review',
      data: booking,
      issueReport: booking.issueReport,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get condition history and issue report for a booking (Borrower, Owner, or Admin)
 * @route   GET /api/bookings/:id/condition
 * @access  Private
 */
const getBookingCondition = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('resource', 'title images category location')
      .populate('requester', 'name email')
      .populate('owner', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view condition records for this booking',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        status: booking.status,
        checkIn: booking.checkIn || null,
        checkOut: booking.checkOut || null,
        conditionComparison: booking.conditionComparison || null,
        issueReport: booking.issueReport || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload an evidence photo for a booking (Handover or Return)
 * @route   POST /api/bookings/:id/evidence/upload
 * @access  Private
 */
const uploadBookingEvidence = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload evidence for this booking',
      });
    }

    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required (data-URI or base64 format)',
      });
    }

    let parsed;
    try {
      parsed = parseBase64Upload(image);
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        message: parseErr.message,
      });
    }

    const effectiveMime = mimeType || parsed.mimeType;

    let savedFile;
    try {
      savedFile = saveEvidenceFile(id, parsed.buffer, effectiveMime);
    } catch (saveErr) {
      return res.status(400).json({
        success: false,
        message: saveErr.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Evidence photo uploaded and verified successfully',
      data: savedFile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download/view a secure evidence photo (Authenticated borrower/owner/admin only)
 * @route   GET /api/bookings/:id/evidence/:filename
 * @access  Private
 */
const getBookingEvidenceFile = async (req, res, next) => {
  try {
    const { id, filename } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access evidence files for this booking',
      });
    }

    let fileInfo;
    try {
      fileInfo = getEvidenceFilePath(id, filename);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }

    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(fileInfo.fullPath);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chronological evidence timeline for a booking
 * @route   GET /api/bookings/:id/timeline
 * @access  Private
 */
const getBookingTimeline = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('resource', 'title category location')
      .populate('requester', 'name email role')
      .populate('owner', 'name email role')
      .populate('checkIn.submittedBy', 'name email role')
      .populate('checkOut.submittedBy', 'name email role')
      .populate('issueReport.reportedBy', 'name email role')
      .populate('issueReport.resolvedBy', 'name email role');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view the evidence timeline for this booking',
      });
    }

    const timeline = [];

    // 1. Booking Requested
    if (booking.createdAt) {
      timeline.push({
        id: `evt_req_${booking._id}`,
        type: 'booking_requested',
        eventType: 'booking_requested',
        actorRole: 'borrower',
        title: 'Booking Requested',
        timestamp: booking.createdAt,
        actor: {
          id: booking.requester?._id || booking.requester,
          name: booking.requester?.name || 'Borrower',
          role: 'borrower',
        },
        status: 'pending',
        notes: booking.purpose,
        metadata: {
          startAt: booking.startAt,
          endAt: booking.endAt,
          quantity: booking.quantity || 1,
        },
      });
    }

    // 2. Booking Approved or Rejected
    if (
      booking.status === 'approved' ||
      booking.status === 'rejected' ||
      booking.reviewedAt ||
      booking.status === 'checked_in' ||
      booking.status === 'completed'
    ) {
      const reviewDate = booking.reviewedAt || booking.updatedAt;
      const isRejected = booking.status === 'rejected';
      const eventType = isRejected ? 'booking_rejected' : 'booking_approved';
      timeline.push({
        id: `evt_rev_${booking._id}`,
        type: eventType,
        eventType: eventType,
        actorRole: 'owner',
        title: isRejected ? 'Booking Declined by Owner' : 'Booking Approved by Owner',
        timestamp: reviewDate,
        actor: {
          id: booking.owner?._id || booking.owner,
          name: booking.owner?.name || 'Resource Custodian',
          role: 'owner',
        },
        status: isRejected ? 'rejected' : 'approved',
        notes: booking.ownerResponse || (isRejected ? 'Booking request declined' : 'Approved for campus handover'),
      });
    }

    // 3. Handover Proof Submitted (Check-in)
    if (booking.checkIn && booking.checkIn.checkedInAt) {
      const isHandoverByOwner = isSameUserId(booking.checkIn.submittedBy, booking.owner);
      const handoverRole = isHandoverByOwner ? 'owner' : 'borrower';
      const handoverName = isHandoverByOwner
        ? (booking.owner?.name || 'Resource Custodian')
        : (booking.requester?.name || 'Borrower');

      timeline.push({
        id: `evt_handover_${booking._id}`,
        type: 'handover_proof_submitted',
        eventType: 'handover_proof_submitted',
        actorRole: handoverRole,
        title: 'Initial Handover Condition Recorded',
        timestamp: booking.checkIn.checkedInAt,
        actor: {
          id: booking.checkIn.submittedBy?._id || booking.checkIn.submittedBy || (isHandoverByOwner ? booking.owner : booking.requester),
          name: booking.checkIn.submittedBy?.name || handoverName,
          role: handoverRole,
        },
        status: 'checked_in',
        condition: booking.checkIn.condition,
        notes: booking.checkIn.notes,
        photos: booking.checkIn.photos || [],
        reviewedAndConfirmed: booking.checkIn.reviewedAndConfirmed,
      });
    }

    // 4. Return Proof Submitted (Check-out)
    if (booking.checkOut && booking.checkOut.checkedOutAt) {
      const isReturnByOwner = isSameUserId(booking.checkOut.submittedBy, booking.owner);
      const returnRole = isReturnByOwner ? 'owner' : 'borrower';
      const returnName = isReturnByOwner
        ? (booking.owner?.name || 'Resource Custodian')
        : (booking.requester?.name || 'Borrower');

      timeline.push({
        id: `evt_return_${booking._id}`,
        type: 'return_proof_submitted',
        eventType: 'return_proof_submitted',
        actorRole: returnRole,
        title: 'Return Condition Recorded',
        timestamp: booking.checkOut.checkedOutAt,
        actor: {
          id: booking.checkOut.submittedBy?._id || booking.checkOut.submittedBy || (isReturnByOwner ? booking.owner : booking.requester),
          name: booking.checkOut.submittedBy?.name || returnName,
          role: returnRole,
        },
        status: 'completed',
        condition: booking.checkOut.condition,
        notes: booking.checkOut.notes,
        photos: booking.checkOut.photos || [],
        conditionComparison: booking.conditionComparison,
        reviewedAndConfirmed: booking.checkOut.reviewedAndConfirmed,
      });
    }

    // 5. Booking Cancelled (if applicable)
    if (booking.status === 'cancelled') {
      timeline.push({
        id: `evt_cancel_${booking._id}`,
        type: 'booking_cancelled',
        eventType: 'booking_cancelled',
        actorRole: 'borrower',
        title: 'Booking Cancelled',
        timestamp: booking.cancelledAt || booking.updatedAt,
        actor: {
          id: booking.requester?._id || booking.requester,
          name: booking.requester?.name || 'Borrower',
          role: 'borrower',
        },
        status: 'cancelled',
        notes: 'Booking reservation was cancelled prior to completion.',
      });
    }

    // 6. Issue Reported (if applicable)
    if (booking.issueReport && booking.issueReport.hasIssue && booking.issueReport.reportedAt) {
      const isIssueByOwner = isSameUserId(booking.issueReport.reportedBy, booking.owner);
      const issueRole = isIssueByOwner ? 'owner' : 'borrower';
      const issueName = isIssueByOwner
        ? (booking.owner?.name || 'Resource Custodian')
        : (booking.requester?.name || 'Borrower');

      timeline.push({
        id: `evt_issue_${booking._id}`,
        type: 'issue_reported',
        eventType: 'issue_reported',
        actorRole: issueRole,
        title: 'Dispute / Condition Issue Reported',
        timestamp: booking.issueReport.reportedAt,
        actor: {
          id: booking.issueReport.reportedBy?._id || booking.issueReport.reportedBy,
          name: booking.issueReport.reportedBy?.name || issueName,
          role: issueRole,
        },
        status: booking.issueReport.status,
        category: booking.issueReport.category || 'other',
        description: booking.issueReport.description,
        notes: booking.issueReport.description,
        photos: booking.issueReport.photos || [],
      });

      // 7. Issue Resolved (if applicable)
      if (booking.issueReport.resolvedAt) {
        timeline.push({
          id: `evt_resolved_${booking._id}`,
          type: 'issue_resolved',
          eventType: 'issue_resolved',
          actorRole: 'admin',
          title: 'Condition Issue Resolved by Administration',
          timestamp: booking.issueReport.resolvedAt,
          actor: {
            id: booking.issueReport.resolvedBy?._id || booking.issueReport.resolvedBy,
            name: booking.issueReport.resolvedBy?.name || 'Platform Administrator',
            role: 'admin',
          },
          status: 'resolved',
          resolutionNotes: booking.issueReport.resolutionNotes || 'Matter closed after inspection.',
        });
      }
    }

    // Sort strictly chronological (ascending timestamp)
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.status(200).json({
      success: true,
      bookingId: booking._id,
      count: timeline.length,
      timeline,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete initial and return proof details with condition comparison
 * @route   GET /api/bookings/:id/proof
 * @access  Private
 */
const getBookingProofDetails = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('resource', 'title category location images condition')
      .populate('requester', 'name email')
      .populate('owner', 'name email')
      .populate('checkIn.submittedBy', 'name email')
      .populate('checkOut.submittedBy', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view proof details for this booking',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        resource: booking.resource,
        status: booking.status,
        handoverProof: booking.checkIn?.checkedInAt
          ? {
              checkedInAt: booking.checkIn.checkedInAt,
              submittedBy: booking.checkIn.submittedBy,
              reviewedAndConfirmed: booking.checkIn.reviewedAndConfirmed,
              condition: booking.checkIn.condition,
              notes: booking.checkIn.notes,
              photos: booking.checkIn.photos,
            }
          : null,
        returnProof: booking.checkOut?.checkedOutAt
          ? {
              checkedOutAt: booking.checkOut.checkedOutAt,
              submittedBy: booking.checkOut.submittedBy,
              reviewedAndConfirmed: booking.checkOut.reviewedAndConfirmed,
              condition: booking.checkOut.condition,
              notes: booking.checkOut.notes,
              photos: booking.checkOut.photos,
            }
          : null,
        conditionComparison: booking.conditionComparison || null,
        issueReport: booking.issueReport?.hasIssue ? booking.issueReport : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed issue report for a booking
 * @route   GET /api/bookings/:id/issue
 * @access  Private
 */
const getBookingIssueDetails = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
      });
    }

    const booking = await Booking.findById(id)
      .populate('resource', 'title category location images')
      .populate('requester', 'name email')
      .populate('owner', 'name email')
      .populate('issueReport.reportedBy', 'name email')
      .populate('issueReport.resolvedBy', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isBorrower = isSameUserId(booking.requester, req.user._id);
    const isOwner = isSameUserId(booking.owner, req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isBorrower && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view issue details for this booking',
      });
    }

    if (!booking.issueReport || !booking.issueReport.hasIssue) {
      return res.status(404).json({
        success: false,
        message: 'No issue report filed for this booking',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        issueReport: booking.issueReport,
        conditionComparison: booking.conditionComparison,
        initialCondition: booking.checkIn?.condition || 'unspecified',
        finalCondition: booking.checkOut?.condition || 'unspecified',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dedicated handover proof submission handler supporting custodian dispatch or borrower pickup
 */
const submitHandoverProof = async (req, res, next) => {
  req.isHandoverProof = true;
  return checkInBooking(req, res, next);
};

module.exports = {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  getBookingById,
  cancelBooking,
  approveBooking,
  rejectBooking,
  checkInBooking,
  submitHandoverProof,
  checkOutBooking,
  submitReturnProof: checkOutBooking,
  reportBookingIssue,
  getBookingCondition,
  uploadBookingEvidence,
  getBookingEvidenceFile,
  getBookingTimeline,
  getBookingProofDetails,
  getBookingIssueDetails,
};

