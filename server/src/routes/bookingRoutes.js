const express = require('express');
const router = express.Router();
const {
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
  submitReturnProof,
  reportBookingIssue,
  getBookingCondition,
  uploadBookingEvidence,
  getBookingEvidenceFile,
  getBookingTimeline,
  getBookingProofDetails,
  getBookingIssueDetails,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

// All booking routes require authenticated session
router.use(protect);

// 1. Submit a new booking request
router.post('/', createBooking);

// 2. Requester personal bookings (Static route BEFORE /:id)
router.get('/mine', getMyBookings);

// 3. Custodian / Owner incoming booking requests (Static route BEFORE /:id)
router.get('/owner', getOwnerBookings);

// 4. Booking details by ID
router.get('/:id', getBookingById);

// 5. Booking state transitions
router.patch('/:id/cancel', cancelBooking);
router.patch('/:id/approve', approveBooking);
router.patch('/:id/reject', rejectBooking);

// 6. Part 6 & Part 12: Handover, Return, and Evidence Verification
router.post('/:id/check-in', checkInBooking);
router.post('/:id/handover-proof', submitHandoverProof);
router.post('/:id/check-out', checkOutBooking);
router.post('/:id/return-proof', submitReturnProof);
router.post('/:id/report-issue', reportBookingIssue);
router.get('/:id/condition', getBookingCondition);
router.get('/:id/proof', getBookingProofDetails);
router.get('/:id/timeline', getBookingTimeline);
router.get('/:id/issue', getBookingIssueDetails);

// 7. Secure Evidence Storage & Retrieval (Part 12)
router.post('/:id/evidence/upload', uploadBookingEvidence);
router.get('/:id/evidence/:filename', getBookingEvidenceFile);

module.exports = router;

