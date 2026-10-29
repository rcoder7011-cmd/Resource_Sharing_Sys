import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  LogOut,
  Compass,
  CheckCircle2,
  RefreshCw,
  PackagePlus,
  Package,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Loader2,
  MapPin,
  Calendar,
  Check,
  X,
  Inbox,
  Clock3,
  CheckSquare,
  CornerDownLeft,
  AlertOctagon,
  Camera,
  Sparkles,
  History,
  UploadCloud,
  CheckCircle,
  Eye,
  Scale,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import EditResourceModal from '../components/resources/EditResourceModal';
import {
  getMyResources,
  getMyResourceUtilization,
  deleteResource,
} from '../services/resourceService';
import {
  getMyBookings,
  getOwnerBookings,
  cancelBooking,
  approveBooking,
  rejectBooking,
  checkInBooking,
  checkOutBooking,
  reportBookingIssue,
  uploadBookingEvidence,
  getBookingTimeline,
} from '../services/bookingService';
import { APP_NAME } from '../utils/constants';

/**
 * Helper to format ISO timestamps into user-friendly localized strings
 */
const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Condition rank scale for deterioration detection
 */
const CONDITION_RANKS = {
  excellent: 4,
  good: 3,
  fair: 2,
  damaged: 1,
};

/**
 * Map condition status to badge variants
 */
const getConditionBadgeVariant = (condition) => {
  switch (condition?.toLowerCase()) {
    case 'excellent':
      return 'available';
    case 'good':
      return 'info';
    case 'fair':
      return 'warning';
    case 'damaged':
      return 'danger';
    default:
      return 'neutral';
  }
};

/**
 * Map booking status to badge variants
 */
const getStatusBadgeVariant = (status) => {
  switch (status) {
    case 'approved':
      return 'available';
    case 'checked_in':
      return 'info';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    case 'completed':
      return 'purple';
    default:
      return 'info';
  }
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();

  // Verification & notifications
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState('');

  // Active dashboard tab: 'listings' | 'my-bookings' | 'incoming-requests'
  const [activeTab, setActiveTab] = useState('listings');

  // 1. My Listings State (Part 4)
  const [myListings, setMyListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState(null);

  // 1.1 Smart Resource Rescue Owner State (Part 11)
  const [ownerUtilizationData, setOwnerUtilizationData] = useState(null);
  const [_isLoadingUtilization, setIsLoadingUtilization] = useState(false);

  // Edit Modal State
  const [selectedEditResource, setSelectedEditResource] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Delete Confirmation Modal State
  const [selectedDeleteResource, setSelectedDeleteResource] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 2. My Bookings State (Part 5 Requester)
  const [myBookings, setMyBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);

  // Cancel Booking Modal State
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // 3. Incoming Requests State (Part 5 Owner)
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [isLoadingOwnerBookings, setIsLoadingOwnerBookings] = useState(true);
  const [ownerBookingsError, setOwnerBookingsError] = useState(null);
  const [approvingBookingId, setApprovingBookingId] = useState(null);
  const [approvalActionError, setApprovalActionError] = useState('');

  // Reject Booking Modal State
  const [selectedRejectBooking, setSelectedRejectBooking] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // 4. Part 6 & Part 12: Check-in / Handover Proof State
  const [selectedCheckInBooking, setSelectedCheckInBooking] = useState(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkInCondition, setCheckInCondition] = useState('good');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInPhotos, setCheckInPhotos] = useState('');
  const [checkInReviewed, setCheckInReviewed] = useState(true);
  const [checkInUploadedPhotos, setCheckInUploadedPhotos] = useState([]);
  const [isUploadingCheckInPhoto, setIsUploadingCheckInPhoto] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState('');

  // 5. Part 6 & Part 12: Check-out / Return Proof State
  const [selectedCheckOutBooking, setSelectedCheckOutBooking] = useState(null);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [checkOutCondition, setCheckOutCondition] = useState('good');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [checkOutPhotos, setCheckOutPhotos] = useState('');
  const [checkOutReviewed, setCheckOutReviewed] = useState(true);
  const [checkOutUploadedPhotos, setCheckOutUploadedPhotos] = useState([]);
  const [isUploadingCheckOutPhoto, setIsUploadingCheckOutPhoto] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkOutError, setCheckOutError] = useState('');

  // 6. Part 6 & Part 12: Condition Issue Report State
  const [selectedIssueBooking, setSelectedIssueBooking] = useState(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState('other');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueUploadedPhotos, setIssueUploadedPhotos] = useState([]);
  const [isUploadingIssuePhoto, setIsUploadingIssuePhoto] = useState(false);
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [issueError, setIssueError] = useState('');

  // 7. Part 12: Evidence Timeline State
  const [selectedTimelineBooking, setSelectedTimelineBooking] = useState(null);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineData, setTimelineData] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  // 8. Part 12: Photo Lightbox Preview State
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  // Load user-owned resources from backend
  const loadMyListings = useCallback(async () => {
    if (!token) return;
    setIsLoadingListings(true);
    setListingsError(null);

    try {
      const response = await getMyResources(token);
      if (response?.data) {
        setMyListings(response.data);
      }
    } catch (err) {
      setListingsError(err.message || 'Could not load your listings. Please try again.');
    } finally {
      setIsLoadingListings(false);
    }
  }, [token]);

  // Load owner's resource utilization insights (Part 11 Smart Resource Rescue)
  const loadOwnerUtilization = useCallback(async () => {
    if (!token) return;
    setIsLoadingUtilization(true);
    try {
      const response = await getMyResourceUtilization({ windowDays: 30 }, token);
      if (response?.data) {
        setOwnerUtilizationData(response.data);
      }
    } catch (err) {
      console.warn('Could not load owner resource utilization telemetry:', err.message);
    } finally {
      setIsLoadingUtilization(false);
    }
  }, [token]);

  // Load bookings made by the user
  const loadMyBookings = useCallback(async () => {
    if (!token) return;
    setIsLoadingBookings(true);
    setBookingsError(null);

    try {
      const response = await getMyBookings(token);
      if (response?.data) {
        setMyBookings(response.data);
      }
    } catch (err) {
      setBookingsError(err.message || 'Could not load your bookings');
    } finally {
      setIsLoadingBookings(false);
    }
  }, [token]);

  // Load incoming booking requests for the owner's resources
  const loadOwnerBookings = useCallback(async () => {
    if (!token) return;
    setIsLoadingOwnerBookings(true);
    setOwnerBookingsError(null);

    try {
      const response = await getOwnerBookings(token);
      if (response?.data) {
        setOwnerBookings(response.data);
      }
    } catch (err) {
      setOwnerBookingsError(err.message || 'Could not load incoming requests');
    } finally {
      setIsLoadingOwnerBookings(false);
    }
  }, [token]);

  useEffect(() => {
    loadMyListings();
    loadMyBookings();
    loadOwnerBookings();
    loadOwnerUtilization();
  }, [loadMyListings, loadMyBookings, loadOwnerBookings, loadOwnerUtilization]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshNotice('');
    setApprovalActionError('');
    try {
      const refreshed = await refreshUser();
      await Promise.all([
        loadMyListings(),
        loadMyBookings(),
        loadOwnerBookings(),
        loadOwnerUtilization(),
      ]);
      if (refreshed) {
        setRefreshNotice('Profile, listings, and bookings updated successfully.');
      } else {
        setRefreshNotice('Using local session cache.');
      }
    } catch {
      setRefreshNotice('Unable to sync latest updates. Please check your connection.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshNotice(''), 3000);
    }
  };

  // Trigger Edit
  const handleOpenEdit = (resource) => {
    setSelectedEditResource(resource);
    setEditModalOpen(true);
  };

  // Trigger Delete confirmation
  const handleOpenDelete = (resource) => {
    setSelectedDeleteResource(resource);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedDeleteResource || isDeleting) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      const id = selectedDeleteResource._id || selectedDeleteResource.id;
      await deleteResource(id, token);
      setMyListings((prev) => prev.filter((r) => (r._id || r.id) !== id));
      setDeleteModalOpen(false);
      setSelectedDeleteResource(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete listing. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // After edit success
  const handleEditSuccess = (updatedResource) => {
    setMyListings((prev) =>
      prev.map((r) =>
        (r._id || r.id) === (updatedResource._id || updatedResource.id)
          ? updatedResource
          : r
      )
    );
  };

  // Trigger Cancel Booking
  const handleOpenCancel = (booking) => {
    setSelectedCancelBooking(booking);
    setCancelError('');
    setCancelModalOpen(true);
  };

  // Confirm Cancel Booking
  const handleConfirmCancel = async () => {
    if (!selectedCancelBooking || isCancelling) return;

    setIsCancelling(true);
    setCancelError('');

    try {
      const id = selectedCancelBooking._id || selectedCancelBooking.id;
      const response = await cancelBooking(id, token);
      if (response?.data) {
        setMyBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? { ...b, status: 'cancelled' } : b))
        );
      }
      setCancelModalOpen(false);
      setSelectedCancelBooking(null);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Approve Booking (Owner)
  const handleApproveBooking = async (booking) => {
    const id = booking._id || booking.id;
    setApprovingBookingId(id);
    setApprovalActionError('');

    try {
      const response = await approveBooking(id, token);
      if (response?.data) {
        setOwnerBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? { ...b, status: 'approved' } : b))
        );
      }
    } catch (err) {
      setApprovalActionError(err.message || 'Failed to approve booking.');
    } finally {
      setApprovingBookingId(null);
    }
  };

  // Trigger Reject Booking modal
  const handleOpenReject = (booking) => {
    setSelectedRejectBooking(booking);
    setRejectionReason('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  // Confirm Reject Booking
  const handleConfirmReject = async () => {
    if (!selectedRejectBooking || isRejecting) return;

    setIsRejecting(true);
    setRejectError('');

    try {
      const id = selectedRejectBooking._id || selectedRejectBooking.id;
      const response = await rejectBooking(id, rejectionReason.trim(), token);
      if (response?.data) {
        setOwnerBookings((prev) =>
          prev.map((b) =>
            (b._id || b.id) === id
              ? { ...b, status: 'rejected', ownerResponse: rejectionReason.trim() }
              : b
          )
        );
      }
      setRejectModalOpen(false);
      setSelectedRejectBooking(null);
    } catch (err) {
      setRejectError(err.message || 'Failed to reject booking.');
    } finally {
      setIsRejecting(false);
    }
  };

  // ----------------------------------------------------
  // Part 6 & Part 12 Handlers: Proof-Based Verification
  // ----------------------------------------------------

  // File upload handler for secure evidence photos
  const handleFileUpload = async (file, target) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      let bookingId;
      if (target === 'checkIn') bookingId = selectedCheckInBooking?._id || selectedCheckInBooking?.id;
      else if (target === 'checkOut') bookingId = selectedCheckOutBooking?._id || selectedCheckOutBooking?.id;
      else if (target === 'issue') bookingId = selectedIssueBooking?._id || selectedIssueBooking?.id;

      if (!bookingId) return;

      try {
        if (target === 'checkIn') setIsUploadingCheckInPhoto(true);
        if (target === 'checkOut') setIsUploadingCheckOutPhoto(true);
        if (target === 'issue') setIsUploadingIssuePhoto(true);

        const res = await uploadBookingEvidence(
          bookingId,
          { image: base64Data, mimeType: file.type },
          token
        );

        if (res?.data?.relativeUrl) {
          if (target === 'checkIn') setCheckInUploadedPhotos((prev) => [...prev, res.data.relativeUrl]);
          if (target === 'checkOut') setCheckOutUploadedPhotos((prev) => [...prev, res.data.relativeUrl]);
          if (target === 'issue') setIssueUploadedPhotos((prev) => [...prev, res.data.relativeUrl]);
        }
      } catch (err) {
        alert('Failed to upload evidence photo: ' + err.message);
      } finally {
        if (target === 'checkIn') setIsUploadingCheckInPhoto(false);
        if (target === 'checkOut') setIsUploadingCheckOutPhoto(false);
        if (target === 'issue') setIsUploadingIssuePhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Check-in / Handover Modal (Borrower or Owner)
  const handleOpenCheckIn = (booking) => {
    setSelectedCheckInBooking(booking);
    const initialCond = booking.resource?.condition || 'good';
    setCheckInCondition(initialCond);
    setCheckInNotes('');
    setCheckInPhotos('');
    setCheckInReviewed(true);
    setCheckInUploadedPhotos([]);
    setCheckInError('');
    setCheckInModalOpen(true);
  };

  // Confirm Check-in / Handover (Borrower or Owner)
  const handleConfirmCheckIn = async () => {
    if (!selectedCheckInBooking || isCheckingIn) return;
    setIsCheckingIn(true);
    setCheckInError('');

    try {
      const id = selectedCheckInBooking._id || selectedCheckInBooking.id;
      const textPhotos = checkInPhotos.trim()
        ? checkInPhotos
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
        : [];
      const mergedPhotos = Array.from(new Set([...checkInUploadedPhotos, ...textPhotos]));

      const response = await checkInBooking(
        id,
        {
          condition: checkInCondition,
          notes: checkInNotes.trim(),
          photos: mergedPhotos,
          reviewedAndConfirmed: checkInReviewed,
        },
        token
      );

      if (response?.data) {
        setMyBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? response.data : b))
        );
        setOwnerBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? response.data : b))
        );
      }
      setCheckInModalOpen(false);
      setSelectedCheckInBooking(null);
    } catch (err) {
      setCheckInError(err.message || 'Failed to complete handover proof.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Open Check-out / Return Modal (Borrower or Owner)
  const handleOpenCheckOut = (booking) => {
    setSelectedCheckOutBooking(booking);
    const prevCond = booking.checkIn?.condition || 'good';
    setCheckOutCondition(prevCond);
    setCheckOutNotes('');
    setCheckOutPhotos('');
    setCheckOutReviewed(true);
    setCheckOutUploadedPhotos([]);
    setCheckOutError('');
    setCheckOutModalOpen(true);
  };

  // Confirm Check-out / Return (Borrower or Owner)
  const handleConfirmCheckOut = async () => {
    if (!selectedCheckOutBooking || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckOutError('');

    try {
      const id = selectedCheckOutBooking._id || selectedCheckOutBooking.id;
      const textPhotos = checkOutPhotos.trim()
        ? checkOutPhotos
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
        : [];
      const mergedPhotos = Array.from(new Set([...checkOutUploadedPhotos, ...textPhotos]));

      const response = await checkOutBooking(
        id,
        {
          condition: checkOutCondition,
          notes: checkOutNotes.trim(),
          photos: mergedPhotos,
          reviewedAndConfirmed: checkOutReviewed,
        },
        token
      );

      if (response?.data) {
        setMyBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? response.data : b))
        );
        setOwnerBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? response.data : b))
        );
      }
      setCheckOutModalOpen(false);
      setSelectedCheckOutBooking(null);
    } catch (err) {
      setCheckOutError(err.message || 'Failed to complete return proof.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Open Report Issue Modal (Borrower, Owner, or Admin)
  const handleOpenReportIssue = (booking) => {
    setSelectedIssueBooking(booking);
    setIssueCategory('other');
    setIssueDescription('');
    setIssueUploadedPhotos([]);
    setIssueError('');
    setIssueModalOpen(true);
  };

  // Confirm Report Issue
  const handleConfirmReportIssue = async () => {
    if (!selectedIssueBooking || isReportingIssue) return;
    if (!issueDescription.trim() || issueDescription.trim().length < 5) {
      setIssueError('Please provide a descriptive report of at least 5 characters.');
      return;
    }

    setIsReportingIssue(true);
    setIssueError('');

    try {
      const id = selectedIssueBooking._id || selectedIssueBooking.id;
      const response = await reportBookingIssue(
        id,
        {
          description: issueDescription.trim(),
          category: issueCategory,
          photos: issueUploadedPhotos,
        },
        token
      );

      if (response?.data) {
        setMyBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? response.data : b))
        );
        setOwnerBookings((prev) =>
          prev.map((b) => ((b._id || b.id) === id ? response.data : b))
        );
      }
      setIssueModalOpen(false);
      setSelectedIssueBooking(null);
    } catch (err) {
      setIssueError(err.message || 'Failed to submit condition issue report.');
    } finally {
      setIsReportingIssue(false);
    }
  };

  // Open Evidence Timeline Modal (Part 12)
  const handleOpenTimeline = async (booking) => {
    setSelectedTimelineBooking(booking);
    setTimelineModalOpen(true);
    setIsLoadingTimeline(true);
    setTimelineError('');
    setTimelineData([]);

    try {
      const id = booking._id || booking.id;
      const res = await getBookingTimeline(id, token);
      if (res?.timeline) {
        setTimelineData(res.timeline);
      }
    } catch (err) {
      setTimelineError(err.message || 'Failed to load chronological evidence timeline.');
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const pendingOwnerCount = ownerBookings.filter((b) => b.status === 'pending').length;

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Session';

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Profile Banner */}
      <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-white to-slate-100/60 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'Institutional Member'}
              </h1>
              <Badge
                variant={user?.role === 'admin' ? 'purple' : 'info'}
                size="sm"
              >
                {user?.role === 'admin' ? 'Administrator' : 'Standard User'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {user?.role === 'admin' && (
            <Button
              to="/admin"
              variant="secondary"
              size="sm"
              icon={Shield}
              className="!border-purple-500/40 !text-purple-300 hover:!bg-purple-950/40"
            >
              Admin Portal
            </Button>
          )}
          <Button
            to="/create-resource"
            variant="primary"
            size="sm"
            icon={PackagePlus}
          >
            List a Resource
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            icon={RefreshCw}
            className={isRefreshing ? 'animate-spin' : ''}
          >
            {isRefreshing ? 'Syncing...' : 'Sync Data'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            icon={LogOut}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {refreshNotice && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{refreshNotice}</span>
        </div>
      )}

      {/* Main Grid: Management Tabs & Content (2 cols) & Account Info (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols): Listings & Bookings Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Segmented Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('listings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'listings'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>My Listings</span>
              <span
                className={`text-[11px] px-2 py-0.2 rounded-full ${
                  activeTab === 'listings' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {myListings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-bookings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'my-bookings'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
              <span
                className={`text-[11px] px-2 py-0.2 rounded-full ${
                  activeTab === 'my-bookings' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {myBookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('incoming-requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'incoming-requests'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Incoming Requests</span>
              {pendingOwnerCount > 0 ? (
                <span className="text-[11px] px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold animate-pulse">
                  {pendingOwnerCount} Pending
                </span>
              ) : (
                <span
                  className={`text-[11px] px-2 py-0.2 rounded-full ${
                    activeTab === 'incoming-requests'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {ownerBookings.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: MY LISTINGS (Part 4) */}
          {activeTab === 'listings' && (
            <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    My Equipment & Space Listings
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Manage availability, edit specifications, or remove active listings
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {ownerUtilizationData?.underusedCount > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{ownerUtilizationData.underusedCount} Underused</span>
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {myListings.length} {myListings.length === 1 ? 'Listing' : 'Listings'}
                  </span>
                  <Button to="/create-resource" variant="primary" size="sm" icon={PackagePlus}>
                    Add Listing
                  </Button>
                </div>
              </div>

              {/* Listings Content */}
              {isLoadingListings ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400">Loading your listed resources...</p>
                </div>
              ) : listingsError ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <span>{listingsError}</span>
                  <Button variant="outline" size="sm" onClick={loadMyListings}>
                    Retry
                  </Button>
                </div>
              ) : myListings.length === 0 ? (
                <div className="py-12 px-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No active listings yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      You haven't added any laboratory tools, computing nodes, or spaces. Help campus researchers unlock underused equipment!
                    </p>
                  </div>
                  <Button to="/create-resource" variant="primary" size="sm" icon={PackagePlus}>
                    List Your First Resource
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {myListings.map((item) => {
                    const itemId = item._id || item.id;
                    const itemTitle = item.title || item.name;
                    const itemCampus =
                      typeof item.location === 'object'
                        ? item.location?.campus || 'Main Academic Campus'
                        : item.location || 'Main Academic Campus';

                    const util = ownerUtilizationData?.resources?.find(
                      (r) => String(r.resourceId) === String(itemId)
                    );

                    return (
                      <div
                        key={itemId}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate max-w-sm">
                              {itemTitle}
                            </span>
                            <Badge
                              variant={
                                item.availabilityStatus === 'available'
                                  ? 'available'
                                  : item.availabilityStatus === 'unavailable'
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {item.availabilityStatus || 'available'}
                            </Badge>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span>{itemCampus}</span>
                            </span>
                            <span>•</span>
                            <span>Qty: {item.quantity || 1}</span>
                            <span>•</span>
                            <span className="capitalize">Condition: {item.condition || 'good'}</span>
                          </div>

                          {util && (
                            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                                    util.classification === 'underused'
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                      : util.classification === 'well_used'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                      : util.classification === 'insufficient_data'
                                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                                      : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                  }`}
                                >
                                  {util.utilizationRate}% Utilized ({util.classification === 'insufficient_data' ? 'Calibrating' : util.classification.replace('_', ' ')})
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {util.bookedHours}h booked / {util.availableHours}h cap
                                </span>
                              </div>

                              {util.primaryRecommendation && (
                                <div className="w-full text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 mt-0.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>
                                    <strong>Smart Rescue Tip:</strong> {util.primaryRecommendation.title} — {util.primaryRecommendation.suggestedAction}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Link
                            to={`/resources/${itemId}`}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="View in Catalog"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-slate-700/60 hover:border-blue-500/40 transition-colors"
                            title="Edit Listing"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-colors"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY BOOKINGS (Part 5 Requester) */}
          {activeTab === 'my-bookings' && (
            <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    My Resource Reservations
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Track your requested time slots, approval status, and upcoming sessions
                  </p>
                </div>

                <Button to="/resources" variant="outline" size="sm" icon={Compass}>
                  Explore Equipment
                </Button>
              </div>

              {isLoadingBookings ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400">Loading your reservations...</p>
                </div>
              ) : bookingsError ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <span>{bookingsError}</span>
                  <Button variant="outline" size="sm" onClick={loadMyBookings}>
                    Retry
                  </Button>
                </div>
              ) : myBookings.length === 0 ? (
                <div className="py-12 px-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No reservations yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      You haven't scheduled any equipment or lab space. Browse our catalog and submit your first booking request.
                    </p>
                  </div>
                  <Button to="/resources" variant="primary" size="sm" icon={Compass}>
                    Explore Available Resources
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((booking) => {
                    const bookingId = booking._id || booking.id;
                    const resource = booking.resource || {};
                    const resTitle = resource.title || 'Institutional Equipment';
                    const resId = resource._id || resource.id;
                    const canCancel =
                      ['pending', 'approved'].includes(booking.status) &&
                      new Date(booking.endAt) > new Date();
                    const hasHandover =
                      booking.status === 'checked_in' ||
                      booking.status === 'completed' ||
                      Boolean(booking.checkIn?.checkedInAt);

                    return (
                      <div
                        key={bookingId}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/70">
                          <div className="flex flex-wrap items-center gap-2">
                            {resId ? (
                              <Link
                                to={`/resources/${resId}`}
                                className="text-sm font-bold text-white hover:text-blue-400 transition-colors"
                              >
                                {resTitle}
                              </Link>
                            ) : (
                              <span className="text-sm font-bold text-white">{resTitle}</span>
                            )}
                            <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                              {booking.status === 'checked_in' ? 'Checked Out / In Use' : booking.status}
                            </Badge>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {booking.quantity || 1} unit(s)
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                            {/* Part 12 Borrower Timeline Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTimeline(booking)}
                              icon={History}
                              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                              Timeline
                            </Button>

                            {/* In-App Chat & Pickup Coordination Button */}
                            <Button
                              to={`/chat?booking=${booking._id || booking.id}`}
                              variant="outline"
                              size="sm"
                              icon={MessageSquare}
                              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                              Chat & Pickup
                            </Button>

                            {/* Part 6 Borrower Check-in Button */}
                            {booking.status === 'approved' && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenCheckIn(booking)}
                                icon={CheckSquare}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                              >
                                Check In / Pickup
                              </Button>
                            )}

                            {/* Part 6 Borrower Return Button */}
                            {booking.status === 'checked_in' && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenCheckOut(booking)}
                                icon={CornerDownLeft}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                Return Resource
                              </Button>
                            )}

                            {/* Cancel Booking (only allowed when pending or approved, not checked-in) */}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancel(booking)}
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors shrink-0"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Booking time details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>
                              <strong>From:</strong> {formatDateTime(booking.startAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>
                              <strong>To:</strong> {formatDateTime(booking.endAt)}
                            </span>
                          </div>
                        </div>

                        {/* Purpose note */}
                        <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-slate-500 font-medium mr-1.5">Purpose:</span>
                          <span className="italic">"{booking.purpose}"</span>
                        </div>

                        {/* Part 6: Handover & Condition Audit Lifecycle Card */}
                        {hasHandover && (
                          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-semibold text-slate-200">
                                  Condition & Handover Verification
                                </span>
                              </div>
                              {booking.conditionComparison?.isWorsened ? (
                                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                  Condition Degraded
                                </span>
                              ) : booking.status === 'completed' ? (
                                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                  Condition Verified
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                                  In Active Handover
                                </span>
                              )}
                            </div>

                            {/* Stage Columns: Pickup vs Return */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Pickup Record */}
                              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-medium">Pickup Condition:</span>
                                  <Badge variant={getConditionBadgeVariant(booking.checkIn?.condition)} size="sm">
                                    {booking.checkIn?.condition || 'Recorded'}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Picked up: {formatDateTime(booking.checkIn?.checkedInAt)}
                                </p>
                                {booking.checkIn?.notes && (
                                  <p className="text-[11px] text-slate-300 italic">
                                    "{booking.checkIn.notes}"
                                  </p>
                                )}
                                {booking.checkIn?.photos?.length > 0 && (
                                  <div className="text-[11px] text-blue-400 flex items-center gap-1 pt-0.5">
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>{booking.checkIn.photos.length} photo URL(s) recorded</span>
                                  </div>
                                )}
                              </div>

                              {/* Return Record */}
                              {booking.status === 'completed' && booking.checkOut?.checkedOutAt ? (
                                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">Return Condition:</span>
                                    <Badge variant={getConditionBadgeVariant(booking.checkOut?.condition)} size="sm">
                                      {booking.checkOut?.condition || 'Recorded'}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Returned: {formatDateTime(booking.checkOut?.checkedOutAt)}
                                  </p>
                                  {booking.checkOut?.notes && (
                                    <p className="text-[11px] text-slate-300 italic">
                                      "{booking.checkOut.notes}"
                                    </p>
                                  )}
                                  {booking.checkOut?.photos?.length > 0 && (
                                    <div className="text-[11px] text-blue-400 flex items-center gap-1 pt-0.5">
                                      <Camera className="w-3.5 h-3.5" />
                                      <span>{booking.checkOut.photos.length} return photo(s) recorded</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs">
                                  <span>Return pending by borrower</span>
                                  <span className="text-[10px] text-slate-600 mt-0.5">Return verification occurs at check-out</span>
                                </div>
                              )}
                            </div>

                            {/* Degradation notice banner if condition worsened */}
                            {booking.conditionComparison?.isWorsened && (
                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  <strong>Degradation Notice:</strong> Resource returned in lower condition ({booking.checkIn?.condition} → {booking.checkOut?.condition}).
                                </span>
                              </div>
                            )}

                            {/* Issue report section */}
                            {booking.issueReport?.hasIssue ? (
                              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-1">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                                    Condition Issue Logged
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 uppercase tracking-wider">
                                    {booking.issueReport.status || 'open'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                                  "{booking.issueReport.description}"
                                </p>
                                <p className="text-[10px] text-rose-400/70">
                                  Reported on {formatDateTime(booking.issueReport.reportedAt)}
                                </p>
                              </div>
                            ) : (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReportIssue(booking)}
                                  className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Report Condition Issue</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rejection / Custodian note banner if rejected */}
                        {booking.status === 'rejected' && booking.ownerResponse && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-rose-200">Custodian Note:</strong>{' '}
                              <span>{booking.ownerResponse}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INCOMING REQUESTS (Part 5 Owner / Custodian) */}
          {activeTab === 'incoming-requests' && (
            <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Incoming Booking Requests
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Review and approve or reject equipment reservation requests from campus researchers
                  </p>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {ownerBookings.length} {ownerBookings.length === 1 ? 'Request' : 'Requests'}
                </span>
              </div>

              {/* Approval Error Notice (e.g. Overlapping bookings capacity conflict) */}
              {approvalActionError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-200">Approval Denied</p>
                      <p className="text-xs leading-relaxed mt-0.5">{approvalActionError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApprovalActionError('')}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isLoadingOwnerBookings ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400">Loading incoming requests...</p>
                </div>
              ) : ownerBookingsError ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <span>{ownerBookingsError}</span>
                  <Button variant="outline" size="sm" onClick={loadOwnerBookings}>
                    Retry
                  </Button>
                </div>
              ) : ownerBookings.length === 0 ? (
                <div className="py-12 px-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">No incoming requests</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Requests will appear here when other campus members reserve equipment or spaces that you manage.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {ownerBookings.map((booking) => {
                    const bookingId = booking._id || booking.id;
                    const resource = booking.resource || {};
                    const resTitle = resource.title || 'Institutional Equipment';
                    const resId = resource._id || resource.id;
                    const requesterName = booking.requester?.name || 'Campus Member';
                    const requesterEmail = booking.requester?.email || '';
                    const isPending = booking.status === 'pending';
                    const isApprovingThis = approvingBookingId === bookingId;

                    return (
                      <div
                        key={bookingId}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/70">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {resId ? (
                                <Link
                                  to={`/resources/${resId}`}
                                  className="text-sm font-bold text-white hover:text-blue-400 transition-colors"
                                >
                                  {resTitle}
                                </Link>
                              ) : (
                                <span className="text-sm font-bold text-white">{resTitle}</span>
                              )}
                              <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                                {booking.status}
                              </Badge>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {booking.quantity || 1} unit(s)
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-2">
                              <span>Requester: <strong className="text-slate-300">{requesterName}</strong></span>
                              {requesterEmail && (
                                <span className="text-slate-500">({requesterEmail})</span>
                              )}
                            </p>
                          </div>

                          {/* Owner Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                            {/* Part 12 Owner Timeline Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTimeline(booking)}
                              icon={History}
                              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                              Timeline
                            </Button>

                            {/* In-App Chat & Pickup Coordination Button */}
                            <Button
                              to={`/chat?booking=${booking._id || booking.id}`}
                              variant="outline"
                              size="sm"
                              icon={MessageSquare}
                              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            >
                              Chat & Pickup
                            </Button>

                            {/* Pending Request Approval / Rejection */}
                            {isPending && (
                              <>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={isApprovingThis}
                                  onClick={() => handleApproveBooking(booking)}
                                  icon={isApprovingThis ? Loader2 : Check}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                  {isApprovingThis ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenReject(booking)}
                                  icon={X}
                                  className="hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40"
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {/* Owner Handover / Check-in */}
                            {booking.status === 'approved' && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenCheckIn(booking)}
                                icon={CheckSquare}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                              >
                                Handover / Pickup
                              </Button>
                            )}

                            {/* Owner Return / Check-out */}
                            {booking.status === 'checked_in' && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenCheckOut(booking)}
                                icon={CornerDownLeft}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                Process Return
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Booking time details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>
                              <strong>Start:</strong> {formatDateTime(booking.startAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>
                              <strong>End:</strong> {formatDateTime(booking.endAt)}
                            </span>
                          </div>
                        </div>

                        {/* Stated Purpose */}
                        <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                          <span className="text-slate-500 font-medium mr-1.5">Stated Purpose:</span>
                          <span className="italic">"{booking.purpose}"</span>
                        </div>

                        {/* Part 6 Custodian Handover & Condition Audit View */}
                        {(booking.status === 'checked_in' ||
                          booking.status === 'completed' ||
                          Boolean(booking.checkIn?.checkedInAt)) && (
                          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-semibold text-slate-200">
                                  Custodian Condition Audit
                                </span>
                              </div>
                              {booking.conditionComparison?.isWorsened ? (
                                <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                  Degradation Detected
                                </span>
                              ) : booking.status === 'completed' ? (
                                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                  Returned & Verified
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                                  Active In-Use by Borrower
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Pickup Verification */}
                              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-medium">Pickup Condition:</span>
                                  <Badge variant={getConditionBadgeVariant(booking.checkIn?.condition)} size="sm">
                                    {booking.checkIn?.condition || 'Recorded'}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Picked up: {formatDateTime(booking.checkIn?.checkedInAt)}
                                </p>
                                {booking.checkIn?.notes && (
                                  <p className="text-[11px] text-slate-300 italic">
                                    "{booking.checkIn.notes}"
                                  </p>
                                )}
                                {booking.checkIn?.photos?.length > 0 && (
                                  <div className="text-[11px] text-blue-400 flex items-center gap-1 pt-0.5">
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>{booking.checkIn.photos.length} photo(s) recorded</span>
                                  </div>
                                )}
                              </div>

                              {/* Return Verification */}
                              {booking.status === 'completed' && booking.checkOut?.checkedOutAt ? (
                                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">Return Condition:</span>
                                    <Badge variant={getConditionBadgeVariant(booking.checkOut?.condition)} size="sm">
                                      {booking.checkOut?.condition || 'Recorded'}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Returned: {formatDateTime(booking.checkOut?.checkedOutAt)}
                                  </p>
                                  {booking.checkOut?.notes && (
                                    <p className="text-[11px] text-slate-300 italic">
                                      "{booking.checkOut.notes}"
                                    </p>
                                  )}
                                  {booking.checkOut?.photos?.length > 0 && (
                                    <div className="text-[11px] text-blue-400 flex items-center gap-1 pt-0.5">
                                      <Camera className="w-3.5 h-3.5" />
                                      <span>{booking.checkOut.photos.length} return photo(s) recorded</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-lg bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs">
                                  <span>Currently with borrower</span>
                                  <span className="text-[10px] text-slate-600 mt-0.5">Check-out pending completion</span>
                                </div>
                              )}
                            </div>

                            {/* Degradation notice banner */}
                            {booking.conditionComparison?.isWorsened && (
                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  <strong>Custodian Alert:</strong> Condition downgraded from {booking.checkIn?.condition} to {booking.checkOut?.condition}. Inspect equipment before next checkout.
                                </span>
                              </div>
                            )}

                            {/* Issue report section */}
                            {booking.issueReport?.hasIssue ? (
                              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-1">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                                    Condition Issue Logged
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 uppercase tracking-wider">
                                    {booking.issueReport.status || 'open'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                                  "{booking.issueReport.description}"
                                </p>
                                <p className="text-[10px] text-rose-400/70">
                                  Reported on {formatDateTime(booking.issueReport.reportedAt)}
                                </p>
                              </div>
                            ) : (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenReportIssue(booking)}
                                  className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Log Damage / Issue</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Reviewed Info if resolved */}
                        {!isPending && (
                          <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                            <span>
                              Decision: <span className="capitalize font-semibold text-slate-400">{booking.status}</span>
                              {booking.reviewedAt && ` on ${formatDateTime(booking.reviewedAt)}`}
                            </span>
                            {booking.status === 'rejected' && booking.ownerResponse && (
                              <span className="italic text-rose-300/80">
                                Reason: "{booking.ownerResponse}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Platform Standards & Community Trust Section */}
          <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Platform Standards & Community Trust
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Core principles governing resource sharing across {APP_NAME} facilities
                </p>
              </div>
              <Badge variant="available" size="sm">
                Verified Platform
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Standard 1 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-white">Verified Custody & Condition Audits</span>
                  <p className="text-slate-400">Photo documentation at pickup and return eliminates damage disputes and establishes transparent accountability.</p>
                </div>
              </div>

              {/* Standard 2 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-white">Conflict-Free Scheduling</span>
                  <p className="text-slate-400">Mathematical interval scheduling guarantees confirmed reservation slots without double-booking collisions.</p>
                </div>
              </div>

              {/* Standard 3 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-white">Instant Real-Time Notifications</span>
                  <p className="text-slate-400">Direct notifications alert borrowers and custodians for requests, approvals, and upcoming return deadlines.</p>
                </div>
              </div>

              {/* Standard 4 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-white">Underused Resource Intelligence</span>
                  <p className="text-slate-400">
                    Smart Resource Rescue continuously monitors equipment utilization to surface idle assets and maximize student innovation.
                  </p>
                </div>
              </div>

              {/* Standard 5 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-white">Fair Access & Governance</span>
                  <p className="text-slate-400">
                    Administrative moderation, prerequisite safety training verification, and transparent dispute resolution protect participating laboratories.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Account Identity & Security Details */}
        <div className="space-y-6">
          <div className="card-surface p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              Account Security Profile
            </h2>

            <div className="space-y-3 text-xs sm:text-sm divide-y divide-slate-800/80">
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono text-xs text-slate-300">
                  {user?.id ? `${user.id.substring(0, 10)}...` : 'Active'}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400">Security Role:</span>
                <span className="text-white font-medium capitalize">
                  {user?.role || 'user'}
                </span>
              </div>

              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400">Member Since:</span>
                <span className="text-slate-300">{formattedDate}</span>
              </div>

              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400">Account Status:</span>
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active & Verified
                </span>
              </div>

              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400">Session Security:</span>
                <span className="text-blue-400 text-xs font-semibold">
                  Encrypted (Protected)
                </span>
              </div>
            </div>
          </div>

          <div className="card-surface p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              Quick Shortcuts
            </h2>
            <div className="flex flex-col gap-2.5">
              <Button to="/create-resource" variant="primary" size="md" icon={PackagePlus}>
                List New Equipment
              </Button>
              <Button to="/chat" variant="outline" size="md" icon={MessageSquare}>
                Messages & Pickup Coordination
              </Button>
              <Button to="/resources" variant="outline" size="md" icon={Compass}>
                Explore Catalog
              </Button>
              <Button to="/#how-it-works" variant="outline" size="md">
                Custodian Guidelines
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Resource Modal (Part 4) */}
      {selectedEditResource && (
        <EditResourceModal
          resource={selectedEditResource}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedEditResource(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Listing Confirmation Modal (Part 4) */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setSelectedDeleteResource(null);
          }
        }}
        title="Confirm Listing Deletion"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Irreversible Action</p>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-white">
                  "{selectedDeleteResource?.title || selectedDeleteResource?.name}"
                </strong>
                ? This permanently removes the listing from the institutional catalog.
              </p>
            </div>
          </div>

          {deleteError && (
            <p className="text-xs text-rose-400 font-medium">{deleteError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedDeleteResource(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              icon={isDeleting ? Loader2 : Trash2}
            >
              {isDeleting ? 'Deleting Listing...' : 'Confirm Deletion'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Booking Confirmation Modal (Part 5) */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => {
          if (!isCancelling) {
            setCancelModalOpen(false);
            setSelectedCancelBooking(null);
          }
        }}
        title="Cancel Booking Reservation"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">Confirm Reservation Cancellation</p>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Are you sure you want to cancel your booking for{' '}
                <strong className="text-white">
                  "{selectedCancelBooking?.resource?.title || 'this resource'}"
                </strong>
                ? This will release the reserved time slot back into available capacity.
              </p>
            </div>
          </div>

          {cancelError && (
            <p className="text-xs text-rose-400 font-medium">{cancelError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isCancelling}
              onClick={() => {
                setCancelModalOpen(false);
                setSelectedCancelBooking(null);
              }}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              icon={isCancelling ? Loader2 : X}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Booking Modal (Part 5 Custodian) */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          if (!isRejecting) {
            setRejectModalOpen(false);
            setSelectedRejectBooking(null);
          }
        }}
        title="Reject Booking Request"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <p className="text-xs text-slate-400">
            You are rejecting the request for{' '}
            <strong className="text-white">
              "{selectedRejectBooking?.resource?.title || 'this resource'}"
            </strong>{' '}
            from <strong className="text-white">{selectedRejectBooking?.requester?.name}</strong>.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="rejectionReason" className="block text-xs font-medium text-slate-300">
              Reason for Rejection (Optional)
            </label>
            <textarea
              id="rejectionReason"
              rows={3}
              maxLength={500}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Equipment scheduled for preventive maintenance, or department exam conflict..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {rejectError && (
            <p className="text-xs text-rose-400 font-medium">{rejectError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isRejecting}
              onClick={() => {
                setRejectModalOpen(false);
                setSelectedRejectBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isRejecting}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              icon={isRejecting ? Loader2 : X}
            >
              {isRejecting ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Part 6 & Part 12: Check-in / Handover Proof Modal */}
      <Modal
        isOpen={checkInModalOpen}
        onClose={() => {
          if (!isCheckingIn) {
            setCheckInModalOpen(false);
            setSelectedCheckInBooking(null);
          }
        }}
        title="Check-in & Handover Proof Verification"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 space-y-1">
            <p className="font-semibold text-white">
              {selectedCheckInBooking?.resource?.title || 'Resource'}
            </p>
            <p className="text-xs text-blue-300/80">
              Reserved for {formatDateTime(selectedCheckInBooking?.startAt)} — {formatDateTime(selectedCheckInBooking?.endAt)} ({selectedCheckInBooking?.quantity || 1} unit)
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Initial Equipment Condition <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['excellent', 'good', 'fair', 'damaged'].map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setCheckInCondition(cond)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    checkInCondition === cond
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="checkInNotes" className="block text-xs font-medium text-slate-300">
              Pickup Condition Notes (Optional)
            </label>
            <textarea
              id="checkInNotes"
              rows={2}
              maxLength={500}
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
              placeholder="e.g., Checked all cables, lens clean, powered on successfully..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Part 12 Photo Upload & URL Documentation */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Evidence Photos (Optional, max 5MB, JPEG/PNG/WebP)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors">
                {isUploadingCheckInPhoto ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                )}
                <span>{isUploadingCheckInPhoto ? 'Uploading Photo...' : 'Upload Evidence Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploadingCheckInPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'checkIn');
                    e.target.value = '';
                  }}
                />
              </label>
              <span className="text-[11px] text-slate-500">Stored privately in reservation archive</span>
            </div>

            {/* Thumbnail previews */}
            {checkInUploadedPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {checkInUploadedPhotos.map((url, idx) => (
                  <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCheckInUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-rose-600 text-white rounded p-0.5 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 pt-1">
              <input
                id="checkInPhotos"
                type="text"
                value={checkInPhotos}
                onChange={(e) => setCheckInPhotos(e.target.value)}
                placeholder="Or enter image URLs (comma-separated)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Part 12 Review & Confirmation Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={checkInReviewed}
                onChange={(e) => setCheckInReviewed(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-300 leading-snug">
                <strong className="text-white">Handover Review Confirmation:</strong> I confirm that I have inspected this resource and verified the condition reported above before proceeding.
              </span>
            </label>
          </div>

          {checkInError && (
            <p className="text-xs text-rose-400 font-medium">{checkInError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isCheckingIn}
              onClick={() => {
                setCheckInModalOpen(false);
                setSelectedCheckInBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isCheckingIn || !checkInReviewed}
              onClick={handleConfirmCheckIn}
              className="bg-blue-600 hover:bg-blue-500 text-white"
              icon={isCheckingIn ? Loader2 : CheckSquare}
            >
              {isCheckingIn ? 'Completing Check-in...' : 'Confirm Handover & Pickup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Part 6 & Part 12: Check-out / Return Modal */}
      <Modal
        isOpen={checkOutModalOpen}
        onClose={() => {
          if (!isCheckingOut) {
            setCheckOutModalOpen(false);
            setSelectedCheckOutBooking(null);
          }
        }}
        title="Return Resource & Condition Audit"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <p className="font-semibold text-white">
              {selectedCheckOutBooking?.resource?.title || 'Resource'}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Pickup Condition:</span>
              <Badge variant={getConditionBadgeVariant(selectedCheckOutBooking?.checkIn?.condition)} size="sm">
                {selectedCheckOutBooking?.checkIn?.condition || 'good'}
              </Badge>
              {selectedCheckOutBooking?.checkIn?.checkedInAt && (
                <span>(Picked up {formatDateTime(selectedCheckOutBooking.checkIn.checkedInAt)})</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Return Condition <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['excellent', 'good', 'fair', 'damaged'].map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setCheckOutCondition(cond)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    checkOutCondition === cond
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Degradation Notice */}
          {selectedCheckOutBooking?.checkIn?.condition &&
            CONDITION_RANKS[checkOutCondition] <
              CONDITION_RANKS[selectedCheckOutBooking.checkIn.condition] && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-200">Condition Degradation Notice</p>
                  <p className="text-amber-300/80 mt-0.5 leading-relaxed">
                    You are returning the resource in lower condition ({checkOutCondition}) than recorded at pickup ({selectedCheckOutBooking.checkIn.condition}). Please describe any incidents, wear, or damage in your notes.
                  </p>
                </div>
              </div>
            )}

          <div className="space-y-1.5">
            <label htmlFor="checkOutNotes" className="block text-xs font-medium text-slate-300">
              Return Notes (Optional)
            </label>
            <textarea
              id="checkOutNotes"
              rows={2}
              maxLength={500}
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              placeholder="e.g., Cleaned workspace, returned all power adapters, battery charged..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Part 12 Photo Upload & URL Documentation */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Return Evidence Photos (Optional, max 5MB, JPEG/PNG/WebP)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors">
                {isUploadingCheckOutPhoto ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                )}
                <span>{isUploadingCheckOutPhoto ? 'Uploading Photo...' : 'Upload Evidence Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploadingCheckOutPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'checkOut');
                    e.target.value = '';
                  }}
                />
              </label>
              <span className="text-[11px] text-slate-500">Stored privately in reservation archive</span>
            </div>

            {/* Thumbnail previews */}
            {checkOutUploadedPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {checkOutUploadedPhotos.map((url, idx) => (
                  <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={url} alt={`Return Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCheckOutUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-rose-600 text-white rounded p-0.5 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 pt-1">
              <input
                id="checkOutPhotos"
                type="text"
                value={checkOutPhotos}
                onChange={(e) => setCheckOutPhotos(e.target.value)}
                placeholder="Or enter image URLs (comma-separated)"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Part 12 Review & Confirmation Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={checkOutReviewed}
                onChange={(e) => setCheckOutReviewed(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-xs text-slate-300 leading-snug">
                <strong className="text-white">Return Review Confirmation:</strong> I confirm that I have inspected this resource and verified the return condition recorded above.
              </span>
            </label>
          </div>

          {checkOutError && (
            <p className="text-xs text-rose-400 font-medium">{checkOutError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isCheckingOut}
              onClick={() => {
                setCheckOutModalOpen(false);
                setSelectedCheckOutBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isCheckingOut || !checkOutReviewed}
              onClick={handleConfirmCheckOut}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              icon={isCheckingOut ? Loader2 : CornerDownLeft}
            >
              {isCheckingOut ? 'Returning Resource...' : 'Confirm Return & Complete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Part 6 & Part 12: Report Condition Issue / Dispute Modal */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => {
          if (!isReportingIssue) {
            setIssueModalOpen(false);
            setSelectedIssueBooking(null);
          }
        }}
        title="Report Resource Condition Issue & Dispute"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          <p className="text-xs text-slate-400">
            Documenting an issue for{' '}
            <strong className="text-white">
              "{selectedIssueBooking?.resource?.title || 'this resource'}"
            </strong>
            . This report is recorded in the permanent reservation audit trail.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="issueCategory" className="block text-xs font-medium text-slate-300">
              Issue Category <span className="text-rose-400">*</span>
            </label>
            <select
              id="issueCategory"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            >
              <option value="condition_degradation">Condition Degradation</option>
              <option value="physical_damage">Physical Damage</option>
              <option value="missing_accessories">Missing Parts or Accessories</option>
              <option value="late_return">Late Return / Delayed Handover</option>
              <option value="other">Other Incident / Discrepancy</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="issueDescription" className="block text-xs font-medium text-slate-300">
              Issue Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="issueDescription"
              rows={3}
              maxLength={1000}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Provide an objective, non-accusatory description of the condition issue, functional failure, or missing accessories..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
            />
            <p className="text-[11px] text-slate-500">Minimum 5 characters required</p>
          </div>

          {/* Part 12 Issue Evidence Photos */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Issue Evidence Photos (Optional, max 5MB)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors">
                {isUploadingIssuePhoto ? (
                  <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4 text-rose-400" />
                )}
                <span>{isUploadingIssuePhoto ? 'Uploading...' : 'Upload Issue Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploadingIssuePhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'issue');
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {issueUploadedPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {issueUploadedPhotos.map((url, idx) => (
                  <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={url} alt={`Issue Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setIssueUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-rose-600 text-white rounded p-0.5 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {issueError && (
            <p className="text-xs text-rose-400 font-medium">{issueError}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isReportingIssue}
              onClick={() => {
                setIssueModalOpen(false);
                setSelectedIssueBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isReportingIssue}
              onClick={handleConfirmReportIssue}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              icon={isReportingIssue ? Loader2 : AlertOctagon}
            >
              {isReportingIssue ? 'Submitting Report...' : 'Submit Condition Report'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Part 12: Chronological Evidence Timeline Modal */}
      <Modal
        isOpen={timelineModalOpen}
        onClose={() => {
          setTimelineModalOpen(false);
          setSelectedTimelineBooking(null);
        }}
        title="Proof-Based Handover & Evidence Timeline"
      >
        <div className="space-y-5 text-xs sm:text-sm text-slate-300">
          {/* Reservation Header Card */}
          {selectedTimelineBooking && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-white text-sm">
                  {selectedTimelineBooking.resource?.title || 'Institutional Resource'}
                </span>
                <Badge variant={getStatusBadgeVariant(selectedTimelineBooking.status)} size="sm">
                  {selectedTimelineBooking.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500">Borrower: </span>
                  <span className="text-slate-300 font-medium">
                    {selectedTimelineBooking.requester?.name || 'Borrower'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Booking ID: </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {selectedTimelineBooking._id || selectedTimelineBooking.id}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Condition Verification Summary Card */}
          {selectedTimelineBooking?.checkIn && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-400" />
                  Condition Audit Summary
                </span>
                {selectedTimelineBooking.conditionComparison?.isWorsened ? (
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Condition Degraded ({selectedTimelineBooking.checkIn.condition} → {selectedTimelineBooking.checkOut?.condition || 'Pending'})
                  </span>
                ) : selectedTimelineBooking.status === 'completed' ? (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Verified Match
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    In Progress
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Pickup Condition</span>
                  <span className="font-semibold capitalize text-slate-200">
                    {selectedTimelineBooking.checkIn.condition}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Return Condition</span>
                  <span className="font-semibold capitalize text-slate-200">
                    {selectedTimelineBooking.checkOut?.condition || 'Not Yet Returned'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Events List */}
          {isLoadingTimeline ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Loading verified timeline events...</p>
            </div>
          ) : timelineError ? (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              {timelineError}
            </div>
          ) : timelineData.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No audit events recorded for this reservation yet.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
              {timelineData.map((event, index) => {
                const isIssue = event.eventType === 'issue_reported';
                const isHandover = event.eventType === 'handover_proof_submitted';
                const isReturn = event.eventType === 'return_proof_submitted';

                return (
                  <div key={index} className="relative flex items-start gap-3.5 pl-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 text-xs ${
                        isIssue
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : isReturn
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isHandover
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isIssue ? (
                        <AlertOctagon className="w-3 h-3" />
                      ) : isReturn ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : isHandover ? (
                        <Camera className="w-3 h-3" />
                      ) : (
                        <History className="w-3 h-3" />
                      )}
                    </div>

                    <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800/90 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-white text-xs">
                          {event.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 capitalize">
                          Actor: {event.actorRole || 'System'}
                        </span>
                        {event.condition && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 capitalize font-medium">
                            Condition: {event.condition}
                          </span>
                        )}
                        {event.category && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 capitalize font-medium">
                            Category: {event.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      {event.notes && (
                        <p className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 italic">
                          "{event.notes}"
                        </p>
                      )}

                      {/* Photo Evidence Gallery */}
                      {event.photos && event.photos.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-blue-400" />
                            Attached Photo Evidence ({event.photos.length}):
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {event.photos.map((photoUrl, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewPhotoUrl(photoUrl)}
                                className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 hover:border-blue-500 transition-all focus:outline-none"
                                title="Click to view full photo"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Evidence ${pIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTimelineModalOpen(false);
                setSelectedTimelineBooking(null);
              }}
            >
              Close Timeline
            </Button>
          </div>
        </div>
      </Modal>

      {/* Part 12: Photo Lightbox Modal */}
      <Modal
        isOpen={Boolean(previewPhotoUrl)}
        onClose={() => setPreviewPhotoUrl(null)}
        title="Evidence Photo Inspection"
      >
        <div className="space-y-4 text-center">
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-[70vh] flex items-center justify-center">
            <img
              src={previewPhotoUrl}
              alt="Evidence Inspection"
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="truncate max-w-md font-mono text-[11px] text-slate-500">
              {previewPhotoUrl}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPreviewPhotoUrl(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
