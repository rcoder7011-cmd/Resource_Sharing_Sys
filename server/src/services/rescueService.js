/**
 * Smart Resource Rescue Service (Part 11)
 *
 * Implements deterministic utilization analytics, operating hours parsing,
 * multi-capacity booking calculations, classification heuristics,
 * and rule-based actionable recommendations for underused campus equipment & spaces.
 */

const Resource = require('../models/Resource');
const Booking = require('../models/Booking');

/**
 * Standard working day definitions
 */
const DAY_MAP = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Parse an operating hours string into daily active hours and operating days of week.
 *
 * Examples:
 * - "Monday – Friday: 08:30 – 18:00" => 9.5 hours/day, days [1, 2, 3, 4, 5]
 * - "24/7" or "Daily: 00:00 - 23:59" => 24 hours/day, days [0..6]
 * - "Monday - Saturday: 09:00 - 17:00" => 8 hours/day, days [1, 2, 3, 4, 5, 6]
 */
function parseOperatingHours(operatingHoursStr) {
  const fallback = {
    dailyHours: 8,
    operatingDays: [1, 2, 3, 4, 5], // Mon-Fri
    isContinuous247: false,
    parsedString: operatingHoursStr || 'Monday – Friday: 08:30 – 18:00',
  };

  if (!operatingHoursStr || typeof operatingHoursStr !== 'string') {
    return fallback;
  }

  const str = operatingHoursStr.trim();
  const lower = str.toLowerCase();

  // 24/7 continuous operation
  if (lower.includes('24/7') || lower.includes('24 hours') || lower.includes('24-7')) {
    return {
      dailyHours: 24,
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
      isContinuous247: true,
      parsedString: str,
    };
  }

  // Parse Days of week
  let operatingDays = [1, 2, 3, 4, 5]; // default Mon-Fri
  if (lower.includes('daily') || lower.includes('every day') || lower.includes('everyday')) {
    operatingDays = [0, 1, 2, 3, 4, 5, 6];
  } else if (lower.includes('monday') && (lower.includes('saturday') || lower.includes('sat'))) {
    operatingDays = [1, 2, 3, 4, 5, 6];
  } else if (lower.includes('weekend')) {
    operatingDays = [0, 6];
  }

  // Parse Time Range: e.g. "08:30 – 18:00", "8:30 - 18:00", "09:00 - 17:00", "8:00 AM - 5:00 PM"
  const timeRegex = /(\d{1,2}):(\d{2})(?:\s*(am|pm))?\s*[–\-to]+\s*(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i;
  const match = str.match(timeRegex);

  if (match) {
    let startHour = parseInt(match[1], 10);
    const startMin = parseInt(match[2], 10);
    const startMeridiem = match[3] ? match[3].toLowerCase() : null;

    let endHour = parseInt(match[4], 10);
    const endMin = parseInt(match[5], 10);
    const endMeridiem = match[6] ? match[6].toLowerCase() : null;

    if (startMeridiem === 'pm' && startHour < 12) startHour += 12;
    if (startMeridiem === 'am' && startHour === 12) startHour = 0;
    if (endMeridiem === 'pm' && endHour < 12) endHour += 12;
    if (endMeridiem === 'am' && endHour === 12) endHour = 0;

    const startTotalHours = startHour + startMin / 60;
    const endTotalHours = endHour + endMin / 60;

    let diffHours = endTotalHours - startTotalHours;
    if (diffHours <= 0) diffHours += 24; // wraps overnight

    return {
      dailyHours: Math.min(24, Math.max(1, Math.round(diffHours * 10) / 10)),
      operatingDays,
      isContinuous247: false,
      parsedString: str,
    };
  }

  return fallback;
}

/**
 * Calculate the total available operating unit-minutes for a resource within a given measurement window.
 * Takes operating days, daily hours, and resource inventory quantity into account.
 */
function calculateAvailableUnitMinutes(resource, windowStart, windowEnd) {
  const quantity = Math.max(1, resource.quantity || 1);
  const parsedHours = parseOperatingHours(resource.operatingHours);

  // If resource is marked permanently unavailable or decommissioned
  if (resource.availabilityStatus === 'unavailable') {
    // Still calculate theoretical capacity for rescue evaluation
  }

  const startDate = new Date(windowStart);
  const endDate = new Date(windowEnd);

  let totalOperatingMinutesPerUnit = 0;

  if (parsedHours.isContinuous247) {
    const totalMinutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    return totalMinutes * quantity;
  }

  // Iterate day by day across the window
  const current = new Date(startDate);
  // normalize current to start of day
  current.setHours(0, 0, 0, 0);

  const endDay = new Date(endDate);
  endDay.setHours(23, 59, 59, 999);

  while (current <= endDay) {
    const dayOfWeek = current.getDay();
    if (parsedHours.operatingDays.includes(dayOfWeek)) {
      totalOperatingMinutesPerUnit += parsedHours.dailyHours * 60;
    }
    current.setDate(current.getDate() + 1);
  }

  // Minimum safety fallback to prevent divide-by-zero
  if (totalOperatingMinutesPerUnit <= 0) {
    totalOperatingMinutesPerUnit = 60 * 8; // at least 8 hours
  }

  return Math.round(totalOperatingMinutesPerUnit * quantity);
}

/**
 * Calculate deterministic utilization metrics for a resource over a defined time window.
 *
 * @param {Object} resource - Mongoose Resource document or plain object
 * @param {Array} bookings - Array of Booking documents related to this resource
 * @param {number} windowDays - Window duration in days (default: 30)
 * @returns {Object} Deterministic metrics including utilizationRate, classification, unit-hours, etc.
 */
function calculateResourceUtilization(resource, bookings = [], windowDays = 30) {
  const now = new Date();
  const windowEnd = now;

  // Window cannot start earlier than the resource's listing creation date
  const resourceCreated = resource.createdAt ? new Date(resource.createdAt) : now;
  const theoreticalStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const windowStart = new Date(Math.max(resourceCreated.getTime(), theoreticalStart.getTime()));

  const daysSinceCreation = Math.max(
    0.1,
    Math.round(((now.getTime() - resourceCreated.getTime()) / (24 * 60 * 60 * 1000)) * 10) / 10
  );
  const effectiveWindowDays = Math.max(
    0.1,
    Math.round(((windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000)) * 10) / 10
  );

  // Calculate available capacity in unit-minutes
  const totalAvailableUnitMinutes = calculateAvailableUnitMinutes(resource, windowStart, windowEnd);
  const totalAvailableUnitHours = Math.round((totalAvailableUnitMinutes / 60) * 10) / 10;

  // Tally confirmed/completed bookings vs pending vs excluded
  let utilizedUnitMinutes = 0;
  let pendingDemandUnitMinutes = 0;
  let confirmedBookingsCount = 0;
  let pendingBookingsCount = 0;
  let rejectedCancelledCount = 0;

  const validStatuses = ['approved', 'checked_in', 'completed'];

  for (const booking of bookings) {
    const status = booking.status;

    if (status === 'rejected' || status === 'cancelled') {
      rejectedCancelledCount += 1;
      continue;
    }

    const bStart = new Date(booking.startAt).getTime();
    const bEnd = new Date(booking.endAt).getTime();

    // Calculate overlap with measurement window [windowStart, windowEnd]
    const overlapStart = Math.max(bStart, windowStart.getTime());
    const overlapEnd = Math.min(bEnd, windowEnd.getTime());

    if (overlapEnd > overlapStart) {
      const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);
      const bookingQuantity = Math.max(1, booking.quantity || 1);
      const bookedUnitMinutes = overlapMinutes * bookingQuantity;

      if (validStatuses.includes(status)) {
        utilizedUnitMinutes += bookedUnitMinutes;
        confirmedBookingsCount += 1;
      } else if (status === 'pending') {
        pendingDemandUnitMinutes += bookedUnitMinutes;
        pendingBookingsCount += 1;
      }
    }
  }

  // Cap utilized minutes at total available capacity (100% saturation ceiling)
  const clampedUtilizedUnitMinutes = Math.min(utilizedUnitMinutes, totalAvailableUnitMinutes);
  const utilizedUnitHours = Math.round((clampedUtilizedUnitMinutes / 60) * 10) / 10;
  const pendingDemandHours = Math.round((pendingDemandUnitMinutes / 60) * 10) / 10;

  // Calculate utilization percentage
  let utilizationRate = 0;
  if (totalAvailableUnitMinutes > 0) {
    utilizationRate = Math.min(
      100,
      Math.round((clampedUtilizedUnitMinutes / totalAvailableUnitMinutes) * 1000) / 10
    );
  }

  // Determine Data Confidence
  let confidence = 'high';
  if (daysSinceCreation < 7) {
    confidence = 'low';
  } else if (daysSinceCreation < 30) {
    confidence = 'medium';
  }

  // Rule-based classification
  let classification = 'moderate';
  if (daysSinceCreation < 7 && confirmedBookingsCount === 0) {
    classification = 'insufficient_data';
  } else if (totalAvailableUnitMinutes <= 0) {
    classification = 'insufficient_data';
  } else if (utilizationRate < 20) {
    classification = 'underused';
  } else if (utilizationRate <= 60) {
    classification = 'moderate';
  } else {
    classification = 'well_used';
  }

  const parsedHours = parseOperatingHours(resource.operatingHours);

  return {
    resourceId: resource._id || resource.id,
    title: resource.title || resource.name,
    category: resource.category,
    resourceType: resource.resourceType || 'equipment',
    quantity: resource.quantity || 1,
    availabilityStatus: resource.availabilityStatus || 'available',
    condition: resource.condition || 'good',
    moderationStatus: resource.moderationStatus || 'approved',
    safetyLevel: resource.safetyLevel || 'Standard',
    location: resource.location,
    operatingHours: resource.operatingHours,
    parsedDailyHours: parsedHours.dailyHours,
    windowDays: Math.round(effectiveWindowDays),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    daysSinceCreation,
    totalAvailableUnitHours,
    totalAvailableUnitMinutes,
    utilizedUnitHours,
    utilizedUnitMinutes: clampedUtilizedUnitMinutes,
    rawUtilizedUnitMinutes: utilizedUnitMinutes,
    pendingDemandHours,
    confirmedBookingsCount,
    pendingBookingsCount,
    rejectedCancelledCount,
    utilizationRate,
    classification,
    confidence,
  };
}

/**
 * Generate actionable, deterministic rescue recommendations for a resource based on its attributes and utilization metrics.
 *
 * @param {Object} resource - Resource document
 * @param {Object} metrics - Utilization metrics computed by calculateResourceUtilization
 * @returns {Array} List of actionable recommendations sorted by priority
 */
function generateRescueRecommendations(resource, metrics) {
  const recommendations = [];

  const isUnderused = metrics.classification === 'underused';
  const isModerate = metrics.classification === 'moderate';
  const isWellUsed = metrics.classification === 'well_used';
  const isInsufficient = metrics.classification === 'insufficient_data';

  // RULE 1: Decommissioned / Maintenance Flag
  if (resource.availabilityStatus === 'maintenance') {
    recommendations.push({
      id: 'REC_MAINTENANCE',
      title: 'Active Maintenance Standstill',
      description:
        'Resource is currently marked under maintenance. Expedite servicing and restore status to "available" to resume reservations.',
      category: 'maintenance',
      priority: 'urgent',
      impact: 'Restores 100% booking capability',
      suggestedAction: 'Update availability status to "available" once verified',
    });
  }

  // RULE 2: Inadequate / Brief Description or Missing Specs
  const descLength = resource.description ? resource.description.trim().length : 0;
  const specsCount = resource.specs ? (resource.specs instanceof Map ? resource.specs.size : Object.keys(resource.specs).length) : 0;

  if (descLength < 60 || specsCount === 0) {
    recommendations.push({
      id: 'REC_SPECS',
      title: 'Enhance Technical Specifications & Search Keywords',
      description:
        'Listing has minimal technical parameters or a brief description. Adding detailed instrument model numbers, compatible software, and research use cases increases catalog visibility.',
      category: 'discoverability',
      priority: isUnderused ? 'high' : 'medium',
      impact: '+25–35% catalog click-through rate',
      suggestedAction: 'Edit listing to add comprehensive specs and research keywords',
    });
  }

  // RULE 3: Prerequisite Access & Safety Barrier
  const hasStrictSafety = resource.safetyLevel && ['restricted', 'high', 'specialized training required'].includes(resource.safetyLevel.toLowerCase());
  const hasMultiplePrereqs = Array.isArray(resource.eligibility) && resource.eligibility.length > 1;

  if ((hasStrictSafety || hasMultiplePrereqs) && isUnderused) {
    recommendations.push({
      id: 'REC_ACCESS_BARRIER',
      title: 'Streamline Prerequisite Access Barrier',
      description:
        'Strict prerequisite clearance or high safety classifications may be deterring student researchers. Consider organizing monthly safety briefings or peer-led certification cohorts.',
      category: 'access',
      priority: 'high',
      impact: '+30–45% increase in eligible verified users',
      suggestedAction: 'Schedule an open orientation session or publish a fast-track training checklist',
    });
  }

  // RULE 4: Narrow Operational Hours Bottleneck
  if (metrics.parsedDailyHours <= 5 && (isUnderused || isModerate)) {
    recommendations.push({
      id: 'REC_EXPAND_HOURS',
      title: 'Broaden Operational Booking Windows',
      description:
        `Operating window is currently restricted to ~${metrics.parsedDailyHours} hours/day. Extending reservation slots into evening hours or weekend access captures off-peak researcher demand.`,
      category: 'scheduling',
      priority: 'medium',
      impact: '+20–30% increase in weekly bookable slots',
      suggestedAction: 'Update operating hours to include evening or weekend access windows',
    });
  }

  // RULE 5: Zero Bookings Promotional Rescue
  if (metrics.confirmedBookingsCount === 0 && !isInsufficient) {
    recommendations.push({
      id: 'REC_CAMPUS_PROMO',
      title: 'Campus Spotlight & Departmental Cross-Promotion',
      description:
        'Zero confirmed bookings recorded in the active measurement cycle. Feature this asset in departmental bulletins, research lab digests, and hackathon channels.',
      category: 'promotion',
      priority: 'high',
      impact: 'Initial booking activation & user engagement',
      suggestedAction: 'Highlight in Campus Spotlight or share direct resource link with relevant departments',
    });
  }

  // RULE 6: Pending Booking Backlog Conversion
  if (metrics.pendingBookingsCount > 0 && metrics.utilizationRate < 30) {
    recommendations.push({
      id: 'REC_PENDING_CONVERSION',
      title: 'Resolve Pending Booking Backlog',
      description:
        `Owner has ${metrics.pendingBookingsCount} pending booking request(s) awaiting review (${metrics.pendingDemandHours} unit-hours). Promptly reviewing pending requests immediately activates utilization.`,
      category: 'operations',
      priority: 'high',
      impact: `Immediate +${Math.round((metrics.pendingDemandHours / Math.max(1, metrics.totalAvailableUnitHours)) * 100)}% active utilization boost`,
      suggestedAction: 'Review and approve pending requests in the owner dashboard',
    });
  }

  // RULE 7: High Utilization Capacity Scaling
  if (isWellUsed) {
    recommendations.push({
      id: 'REC_CAPACITY_SCALING',
      title: 'High Demand Asset: Consider Capacity Scaling',
      description:
        `Asset is experiencing heavy campus demand (${metrics.utilizationRate}% utilization). Consider adding duplicate inventory units or instituting peak-hour time slot limits to allow wider access.`,
      category: 'capacity',
      priority: 'info',
      impact: 'Prevents resource bottlenecks & extends researcher throughput',
      suggestedAction: 'Increase inventory quantity or pair with complementary department equipment',
    });
  }

  // Fallback for underused resource with no other flags
  if (isUnderused && recommendations.length === 0) {
    recommendations.push({
      id: 'REC_GENERAL_AUDIT',
      title: 'Conduct Physical Resource Audit',
      description:
        'Verify physical lab access, signage, equipment calibration, and post a QR code linking directly to this reservation page at the physical workstation.',
      category: 'audit',
      priority: 'medium',
      impact: 'Improves on-campus visibility and spontaneous bookings',
      suggestedAction: 'Affix platform reservation QR code to physical equipment',
    });
  }

  // Fallback for new listings
  if (isInsufficient) {
    recommendations.push({
      id: 'REC_INSUFFICIENT_DATA',
      title: 'Listing In Calibration Period',
      description:
        'This resource was recently added to the institutional catalog. Recommendations and confidence scores will stabilize after 7–14 days of operational availability.',
      category: 'calibration',
      priority: 'info',
      impact: 'Establishes baseline utilization telemetry',
      suggestedAction: 'Allow the initial 7-day observation window to accumulate booking data',
    });
  }

  // Priority sort order: urgent > high > medium > info
  const priorityOrder = { urgent: 0, high: 1, medium: 2, info: 3 };
  recommendations.sort((a, b) => {
    const pA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 99;
    const pB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 99;
    return pA - pB;
  });

  return recommendations;
}

/**
 * Service function to retrieve rescue summary metrics across the entire platform.
 * (For Admin Dashboard Smart Resource Rescue tab)
 */
async function getPlatformRescueSummary(windowDays = 30) {
  // Query all active non-hidden resources
  const resources = await Resource.find({ moderationStatus: { $ne: 'hidden' } })
    .populate('owner', 'name email institution')
    .lean();

  if (!resources || resources.length === 0) {
    return {
      windowDays,
      totalAnalyzed: 0,
      underusedCount: 0,
      moderateCount: 0,
      wellUsedCount: 0,
      insufficientDataCount: 0,
      averageUtilizationRate: 0,
      categoryDistribution: {},
      underusedPercentage: 0,
    };
  }

  const resourceIds = resources.map((r) => r._id);

  // Fetch bookings in window
  const windowLimit = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const bookings = await Booking.find({
    resource: { $in: resourceIds },
    endAt: { $gte: windowLimit },
  }).lean();

  // Group bookings by resource
  const bookingsByResource = {};
  for (const b of bookings) {
    const resId = b.resource.toString();
    if (!bookingsByResource[resId]) {
      bookingsByResource[resId] = [];
    }
    bookingsByResource[resId].push(b);
  }

  let totalAnalyzed = 0;
  let underusedCount = 0;
  let moderateCount = 0;
  let wellUsedCount = 0;
  let insufficientDataCount = 0;
  let utilizationSum = 0;
  const categoryDistribution = {};

  for (const resource of resources) {
    const resBookings = bookingsByResource[resource._id.toString()] || [];
    const metrics = calculateResourceUtilization(resource, resBookings, windowDays);

    totalAnalyzed += 1;
    utilizationSum += metrics.utilizationRate;

    if (metrics.classification === 'underused') underusedCount += 1;
    else if (metrics.classification === 'moderate') moderateCount += 1;
    else if (metrics.classification === 'well_used') wellUsedCount += 1;
    else if (metrics.classification === 'insufficient_data') insufficientDataCount += 1;

    const cat = resource.category || 'Other';
    if (!categoryDistribution[cat]) {
      categoryDistribution[cat] = { total: 0, underused: 0, avgUtilization: 0, sumUtil: 0 };
    }
    categoryDistribution[cat].total += 1;
    if (metrics.classification === 'underused') categoryDistribution[cat].underused += 1;
    categoryDistribution[cat].sumUtil += metrics.utilizationRate;
  }

  // Calculate averages for categories
  for (const cat of Object.keys(categoryDistribution)) {
    const item = categoryDistribution[cat];
    item.avgUtilization = item.total > 0 ? Math.round((item.sumUtil / item.total) * 10) / 10 : 0;
    delete item.sumUtil;
  }

  const averageUtilizationRate =
    totalAnalyzed > 0 ? Math.round((utilizationSum / totalAnalyzed) * 10) / 10 : 0;
  const underusedPercentage =
    totalAnalyzed > 0 ? Math.round((underusedCount / totalAnalyzed) * 1000) / 10 : 0;

  return {
    windowDays,
    totalAnalyzed,
    underusedCount,
    moderateCount,
    wellUsedCount,
    insufficientDataCount,
    averageUtilizationRate,
    underusedPercentage,
    categoryDistribution,
  };
}

/**
 * Service function to retrieve detailed rescue intelligence for all resources with filtering and pagination.
 */
async function getPlatformRescueResources({
  windowDays = 30,
  classification,
  category,
  search,
  page = 1,
  limit = 20,
} = {}) {
  const query = { moderationStatus: { $ne: 'hidden' } };

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { 'location.campus': { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const resources = await Resource.find(query)
    .populate('owner', 'name email institution department')
    .sort({ createdAt: -1 })
    .lean();

  if (!resources || resources.length === 0) {
    return {
      resources: [],
      pagination: { total: 0, page: 1, limit, pages: 0 },
    };
  }

  const resourceIds = resources.map((r) => r._id);
  const windowLimit = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const bookings = await Booking.find({
    resource: { $in: resourceIds },
    endAt: { $gte: windowLimit },
  }).lean();

  const bookingsByResource = {};
  for (const b of bookings) {
    const resId = b.resource.toString();
    if (!bookingsByResource[resId]) {
      bookingsByResource[resId] = [];
    }
    bookingsByResource[resId].push(b);
  }

  let analyzedResources = [];

  for (const resource of resources) {
    const resBookings = bookingsByResource[resource._id.toString()] || [];
    const metrics = calculateResourceUtilization(resource, resBookings, windowDays);

    // Filter by classification if requested
    if (classification && classification !== 'all') {
      if (metrics.classification !== classification) {
        continue;
      }
    }

    const recommendations = generateRescueRecommendations(resource, metrics);

    analyzedResources.push({
      ...metrics,
      owner: resource.owner,
      recommendationsCount: recommendations.length,
      primaryRecommendation: recommendations[0] || null,
      recommendations,
    });
  }

  // Sort: underused first, then ascending by utilizationRate
  analyzedResources.sort((a, b) => {
    if (a.classification === 'underused' && b.classification !== 'underused') return -1;
    if (b.classification === 'underused' && a.classification !== 'underused') return 1;
    return a.utilizationRate - b.utilizationRate;
  });

  const total = analyzedResources.length;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = analyzedResources.slice(startIndex, startIndex + limitNum);

  return {
    resources: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Service function to retrieve full in-depth rescue breakdown for a single resource.
 */
async function getSingleResourceRescueDetails(resourceId, windowDays = 30) {
  const resource = await Resource.findById(resourceId)
    .populate('owner', 'name email institution department')
    .lean();

  if (!resource) {
    return null;
  }

  const windowLimit = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const bookings = await Booking.find({
    resource: resource._id,
    endAt: { $gte: windowLimit },
  })
    .populate('requester', 'name email')
    .sort({ startAt: -1 })
    .lean();

  const metrics = calculateResourceUtilization(resource, bookings, windowDays);
  const recommendations = generateRescueRecommendations(resource, metrics);

  return {
    resource,
    metrics,
    recommendations,
    recentBookingsSummary: bookings.slice(0, 10).map((b) => ({
      _id: b._id,
      startAt: b.startAt,
      endAt: b.endAt,
      quantity: b.quantity || 1,
      status: b.status,
      purpose: b.purpose,
      requester: b.requester,
    })),
  };
}

/**
 * Service function to retrieve utilization insights for an authenticated resource owner's own listings.
 * Strictly scoped to `ownerId`.
 */
async function getOwnerResourceUtilization(ownerId, windowDays = 30) {
  const resources = await Resource.find({ owner: ownerId })
    .sort({ createdAt: -1 })
    .lean();

  if (!resources || resources.length === 0) {
    return {
      totalListed: 0,
      underusedCount: 0,
      resources: [],
    };
  }

  const resourceIds = resources.map((r) => r._id);
  const windowLimit = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const bookings = await Booking.find({
    resource: { $in: resourceIds },
    endAt: { $gte: windowLimit },
  }).lean();

  const bookingsByResource = {};
  for (const b of bookings) {
    const resId = b.resource.toString();
    if (!bookingsByResource[resId]) {
      bookingsByResource[resId] = [];
    }
    bookingsByResource[resId].push(b);
  }

  let underusedCount = 0;
  const resourceInsights = [];

  for (const resource of resources) {
    const resBookings = bookingsByResource[resource._id.toString()] || [];
    const metrics = calculateResourceUtilization(resource, resBookings, windowDays);
    const recommendations = generateRescueRecommendations(resource, metrics);

    if (metrics.classification === 'underused') {
      underusedCount += 1;
    }

    resourceInsights.push({
      resourceId: resource._id,
      title: resource.title,
      category: resource.category,
      utilizationRate: metrics.utilizationRate,
      classification: metrics.classification,
      confidence: metrics.confidence,
      bookedHours: metrics.utilizedUnitHours,
      availableHours: metrics.totalAvailableUnitHours,
      confirmedBookingsCount: metrics.confirmedBookingsCount,
      pendingBookingsCount: metrics.pendingBookingsCount,
      primaryRecommendation: recommendations[0] || null,
    });
  }

  return {
    totalListed: resources.length,
    underusedCount,
    resources: resourceInsights,
  };
}

module.exports = {
  parseOperatingHours,
  calculateAvailableUnitMinutes,
  calculateResourceUtilization,
  generateRescueRecommendations,
  getPlatformRescueSummary,
  getPlatformRescueResources,
  getSingleResourceRescueDetails,
  getOwnerResourceUtilization,
};

