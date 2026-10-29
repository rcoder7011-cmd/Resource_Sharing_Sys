import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Mail,
  ChevronRight,
  Loader2,
  User,
  Package,
  Globe,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { SAMPLE_RESOURCES } from '../data/sampleResources';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getResourceById } from '../services/resourceService';
import { createBooking } from '../services/bookingService';
import { useAuth } from '../context/AuthContext';

export default function ResourceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated } = useAuth();

  const [resource, setResource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const todayDateString = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  // Booking Form State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const loadData = async () => {
      try {
        const response = await getResourceById(id);
        if (isMounted && response?.data) {
          setResource(response.data);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        // Check if ID matches a sample resource as graceful fallback
        const sampleMatch = SAMPLE_RESOURCES.find((r) => r.id === id);
        if (isMounted) {
          if (sampleMatch) {
            setResource(sampleMatch);
          } else {
            setLoadError(err.message || 'Resource not found');
          }
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 max-w-xl mx-auto px-4 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-white tracking-tight">
          Loading Resource Details...
        </h2>
        <p className="text-sm text-slate-400">
          Retrieving specifications, location, and custodian information.
        </p>
      </div>
    );
  }

  // Handle Invalid / Non-existent Resource
  if (!resource || loadError) {
    return (
      <div className="py-20 max-w-xl mx-auto px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Resource Not Found
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          The requested resource ID <code className="text-blue-400 font-mono">"{id}"</code> does not exist in our catalog or has been removed.
        </p>
        <div className="pt-2">
          <Button to="/resources" variant="primary" icon={ArrowLeft}>
            Back to Explore Catalog
          </Button>
        </div>
      </div>
    );
  }

  // Normalize properties
  const title = resource.title || resource.name;
  const description = resource.description || resource.summary;
  const campus =
    typeof resource.location === 'object'
      ? resource.location?.campus || 'Main Academic Campus'
      : resource.location || 'Main Academic Campus';
  const building =
    typeof resource.location === 'object'
      ? resource.location?.building || 'Main Complex'
      : 'Main Complex';
  const room =
    typeof resource.location === 'object'
      ? resource.location?.room || 'General Access'
      : 'Room 101';

  const availabilityText =
    resource.availability ||
    (resource.availabilityStatus === 'available'
      ? 'Available Now'
      : resource.availabilityStatus === 'unavailable'
      ? 'Currently Unavailable'
      : 'Maintenance');

  const badgeVariant =
    resource.badgeVariant ||
    (resource.availabilityStatus === 'available'
      ? 'available'
      : resource.availabilityStatus === 'unavailable'
      ? 'warning'
      : 'neutral');

  const images =
    resource.images && resource.images.length > 0
      ? resource.images
      : ['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80'];

  const institution =
    resource.institution ||
    (resource.owner?.name ? `Department Custodian: ${resource.owner.name}` : 'Institutional Facility');

  const accessRequirements =
    resource.accessRequirements ||
    (Array.isArray(resource.eligibility) ? resource.eligibility : ['Standard Safety Briefing']);

  const usageConditions = resource.usageConditions || [
    'Cleanroom / laboratory gowning required if applicable',
    'Follow institutional standard operating procedure (SOP)',
    'Log time in facility register at start and end of slot',
  ];

  // Convert specs object or map to key-value pairs
  const rawSpecs = resource.specs || {};
  const specsEntries =
    rawSpecs instanceof Map
      ? Array.from(rawSpecs.entries())
      : Object.entries(rawSpecs);

  const isLiveDatabase = Boolean(resource._id);
  const isOfflineDemo = !isLiveDatabase || (typeof resource.id === 'string' && resource.id.includes('-') && !resource._id);

  const isOwner =
    user &&
    resource?.owner &&
    ((resource.owner._id && resource.owner._id.toString() === (user._id || user.id)) ||
      (resource.owner.id && resource.owner.id.toString() === (user._id || user.id)) ||
      (typeof resource.owner === 'string' && resource.owner === (user._id || user.id)));

  const isAvailableForBooking = resource.availabilityStatus === 'available';

  const handleOpenBooking = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setBookingError('');
    setBookingSuccess(null);
    setBookingModalOpen(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (isOfflineDemo) {
      setBookingError(
        'This is an offline preview listing. To submit a reservation request, please select an active catalog listing.'
      );
      return;
    }

    if (!bookingDate || !startTime || !endTime) {
      setBookingError('Please select a booking date, start time, and end time.');
      return;
    }

    const startDateTime = new Date(`${bookingDate}T${startTime}:00`);
    const endDateTime = new Date(`${bookingDate}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setBookingError('Invalid date or time values.');
      return;
    }

    // Allow 2-minute buffer for client clock
    if (startDateTime < new Date(Date.now() - 120000)) {
      setBookingError('Booking start time cannot be in the past.');
      return;
    }

    if (endDateTime <= startDateTime) {
      setBookingError('End time must be strictly after start time.');
      return;
    }

    const durationMinutes = (endDateTime - startDateTime) / 60000;
    if (durationMinutes < 15) {
      setBookingError('Booking duration must be at least 15 minutes.');
      return;
    }

    if (!bookingPurpose || bookingPurpose.trim().length < 5) {
      setBookingError('Please describe the purpose of your booking (at least 5 characters).');
      return;
    }

    const maxUnits = resource.quantity || 1;
    const reqUnits = parseInt(bookingQuantity, 10);
    if (isNaN(reqUnits) || reqUnits < 1 || reqUnits > maxUnits) {
      setBookingError(`Quantity must be between 1 and ${maxUnits}.`);
      return;
    }

    setIsSubmittingBooking(true);

    try {
      const response = await createBooking(
        {
          resourceId: resource._id || resource.id,
          startAt: startDateTime.toISOString(),
          endAt: endDateTime.toISOString(),
          quantity: reqUnits,
          purpose: bookingPurpose.trim(),
        },
        token
      );

      if (response?.data) {
        setBookingSuccess(response.data);
      } else {
        setBookingError('Booking could not be confirmed.');
      }
    } catch (err) {
      setBookingError(err.message || 'Failed to submit booking request.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <>
      <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <Link to="/resources" className="hover:text-white transition-colors">
            Catalog
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
            {title}
          </span>
        </nav>

        {/* Hero Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant={badgeVariant} size="md">
                {availabilityText}
              </Badge>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {resource.category}
              </span>
              {resource.subcategory && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800/60">
                  {resource.subcategory}
                </span>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
                {resource.resourceType === 'space' ? 'Facility Space' : 'Specialized Equipment'}
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  !isLiveDatabase
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                    : resource.isSample
                    ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                }`}
              >
                {!isLiveDatabase
                  ? 'Offline Mode'
                  : resource.isSample
                  ? 'Institutional Facility'
                  : 'Verified Listing'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {title}
            </h1>

            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{institution}</span>
            </p>
          </div>

          {/* Quick Booking CTA Card */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isOwner ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled
                className="opacity-70 cursor-not-allowed"
              >
                You Own This Resource
              </Button>
            ) : !isAvailableForBooking ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled
                className="opacity-70 cursor-not-allowed"
              >
                Currently Unavailable
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                icon={Calendar}
                onClick={handleOpenBooking}
              >
                Request Booking
              </Button>
            )}
            <Button to="/resources" variant="outline" size="lg" icon={ArrowLeft}>
              Back to Catalog
            </Button>
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Media Gallery + Overview + Technical Specs */}
          <div className="lg:col-span-8 space-y-8">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="card-surface aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                <img
                  src={images[activeImageIndex] || images[0]}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Overview */}
            <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Equipment Overview & Capabilities
              </h2>
              <div className="text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-line">
                {description}
              </div>
            </div>

            {/* Technical Specifications */}
            {specsEntries.length > 0 && (
              <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Technical Specifications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  {specsEntries.map(([key, val], idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between"
                    >
                      <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        {key}
                      </span>
                      <span className="text-white font-medium mt-1">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Academic & Course Information */}
            {resource.academicMetadata &&
              Object.values(resource.academicMetadata).some((v) => Boolean(v && String(v).trim())) && (
                <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <span>Academic & Course Information</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    {resource.academicMetadata.subject && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          Subject / Topic
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.subject}
                        </span>
                      </div>
                    )}
                    {resource.academicMetadata.branch && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          Department / Branch
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.branch}
                        </span>
                      </div>
                    )}
                    {resource.academicMetadata.author && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          Author / Creator
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.author}
                        </span>
                      </div>
                    )}
                    {resource.academicMetadata.edition && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          Edition / Academic Year
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.edition}
                        </span>
                      </div>
                    )}
                    {resource.academicMetadata.course && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          Course / Class
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.course}
                        </span>
                      </div>
                    )}
                    {resource.academicMetadata.semester && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          Semester / Year
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.semester}
                        </span>
                      </div>
                    )}
                    {resource.academicMetadata.isbn && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                          ISBN
                        </span>
                        <span className="text-white font-medium mt-1 block">
                          {resource.academicMetadata.isbn}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Usage Conditions */}
            <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Institutional Usage Conditions
              </h2>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                {usageConditions.map((cond, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column (4 cols): Location, Access Prerequisites, Custodian Information */}
          <div className="lg:col-span-4 space-y-6">
            {/* Facility Location */}
            <div className="card-surface p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-slate-300">
                Facility Location
              </h3>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">{campus}</p>
                    <p className="text-slate-400">{building}</p>
                    <p className="text-slate-500 font-mono text-xs">{room}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-slate-800/80">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Operating Hours</p>
                    <p className="text-slate-400 text-xs">
                      {resource.operatingHours || 'Monday – Friday: 08:30 – 18:00'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Available Quantity:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span>{resource.quantity || 1} units</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Access Prerequisites & Safety Level */}
            <div className="card-surface p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                  Access Prerequisites
                </h3>
                <Badge variant={resource.safetyLevel === 'Restricted Tier-2' ? 'warning' : 'info'} size="sm">
                  {resource.safetyLevel || 'Standard'}
                </Badge>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                {accessRequirements.map((req, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Custodian / Owner Profile Card */}
            <div className="card-surface p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                Equipment Custodian
              </h3>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {resource.owner?.name || 'Facility Coordinator'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {resource.owner?.email ? (
                      <span className="flex items-center gap-1 mt-0.5 text-slate-400">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{resource.owner.email}</span>
                      </span>
                    ) : (
                      'Designated Department Lead'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => {
          if (!isSubmittingBooking) {
            setBookingModalOpen(false);
            setBookingSuccess(null);
            setBookingError('');
          }
        }}
        title={bookingSuccess ? 'Booking Request Confirmed' : `Request Booking: ${title}`}
      >
        {bookingSuccess ? (
          <div className="space-y-5 text-sm text-slate-300 py-1">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-200">
                  Request Submitted Successfully!
                </p>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  Your reservation request is now pending review by the equipment custodian.
                  You can track status updates and approvals in your dashboard.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Request ID:</span>
                <span className="font-mono text-slate-300">{bookingSuccess._id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <Badge variant="warning" size="sm">
                  Pending Approval
                </Badge>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Scheduled Date:</span>
                <span className="text-white font-medium">{bookingDate}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Time Window:</span>
                <span className="text-white font-medium">
                  {startTime} – {endTime} ({userTimeZone})
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Units Requested:</span>
                <span className="text-white font-medium">
                  {bookingSuccess.quantity || bookingQuantity} unit(s)
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block mb-1">Stated Purpose:</span>
                <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 italic">
                  "{bookingSuccess.purpose || bookingPurpose}"
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBookingModalOpen(false);
                  setBookingSuccess(null);
                }}
              >
                Close
              </Button>
              <Button
                to={`/chat?booking=${bookingSuccess._id || bookingSuccess.id}`}
                variant="primary"
                size="sm"
                icon={MessageSquare}
              >
                Chat & Coordination
              </Button>
              <Button
                to="/dashboard"
                variant="outline"
                size="sm"
              >
                View in My Bookings
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs sm:text-sm">
            {/* Resource summary header banner */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-slate-400 mt-0.5">
                  {campus} • {building}
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Capacity:</span>
                <span className="text-blue-400 font-bold">
                  {resource.availableQuantity !== undefined
                    ? `${resource.availableQuantity} of ${resource.quantity || 1} units available`
                    : `${resource.quantity || 1} units available`}
                </span>
              </div>
            </div>

            {/* Timezone pill */}
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Times evaluated in your local timezone: <strong className="text-slate-300">{userTimeZone}</strong></span>
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <label htmlFor="bookingDate" className="block text-xs font-medium text-slate-300">
                Reservation Date <span className="text-rose-400">*</span>
              </label>
              <input
                id="bookingDate"
                type="date"
                min={todayDateString}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Start and End Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="startTime" className="block text-xs font-medium text-slate-300">
                  Start Time <span className="text-rose-400">*</span>
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="endTime" className="block text-xs font-medium text-slate-300">
                  End Time <span className="text-rose-400">*</span>
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quantity Input (if resource has more than 1 unit) */}
            {(resource.quantity || 1) > 1 && (
              <div className="space-y-1.5">
                <label htmlFor="bookingQuantity" className="block text-xs font-medium text-slate-300">
                  Quantity Required (Max: {resource.quantity}) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="bookingQuantity"
                  type="number"
                  min="1"
                  max={resource.quantity}
                  value={bookingQuantity}
                  onChange={(e) => setBookingQuantity(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Purpose Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="bookingPurpose" className="block text-xs font-medium text-slate-300">
                Research / Operational Purpose <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="bookingPurpose"
                rows={3}
                minLength={5}
                maxLength={500}
                value={bookingPurpose}
                onChange={(e) => setBookingPurpose(e.target.value)}
                required
                placeholder="Explain the project or course activity requiring this equipment/space..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <p className="text-[11px] text-slate-500 text-right">
                {bookingPurpose.length}/500 characters
              </p>
            </div>

            {/* Error Message Alert */}
            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-rose-200">Unable to submit booking</p>
                  <p className="text-xs leading-relaxed">{bookingError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSubmittingBooking}
                onClick={() => {
                  setBookingModalOpen(false);
                  setBookingError('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingBooking}
                icon={isSubmittingBooking ? Loader2 : Calendar}
                className={isSubmittingBooking ? 'opacity-80' : ''}
              >
                {isSubmittingBooking ? 'Submitting Request...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
