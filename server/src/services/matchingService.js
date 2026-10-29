/**
 * Need-First Smart Resource Matching Service (Part 13)
 * Resource Sharing Platform — CodeHack India 2026
 *
 * Implements:
 * 1. Rule-based, transparent natural-language need parsing (no external AI/LLMs)
 * 2. Hard eligibility, capacity, and overlap availability filtering
 * 3. Deterministic 0-100 scoring engine with explainable criteria
 * 4. Alternative recommendations when exact matches are unavailable
 * 5. Smart Resource Rescue (Part 11) underutilization integration
 */

const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const { calculateResourceUtilization } = require('./rescueService');

/**
 * Supported Category Dictionary & Synonyms
 */
const CATEGORY_SYNONYMS = {
  'Student Essentials': [
    'essential', 'essentials', 'student essential', 'watch', 'watches', 'water bottle',
    'bottle', 'sipper', 'backpack', 'bag', 'bags', 'umbrella', 'raincoat', 'calculator',
    'scientific calculator', 'calci', 'stationery', 'pen', 'pencil', 'lunch box', 'tiffin',
    'notebook', 'notebooks', 'register', 'registers', 'folder', 'folders', 'file', 'files',
    'exam pad', 'clip board', 'highlighter', 'stapler'
  ],
  'Books & Study Materials': [
    'book', 'books', 'textbook', 'textbooks', 'study material', 'notes', 'handwritten notes',
    'lecture notes', 'assignment', 'assignments', 'lab manual', 'manuals', 'question paper',
    'previous year', 'pyq', 'pyqs', 'semester book', 'exam book', 'gate', 'cat', 'upsc',
    'practical file', 'drawing sheet', 'project file', 'reference book', 'handbook'
  ],
  'Design, Drawing & Architecture': [
    'drafter', 'mini drafter', 'drafting', 'drafting tool', 'drawing', 'engineering drawing',
    'geometry box', 'compass', 'divider', 'ruler', 'scale', 'set square', 'drawing board',
    'sketchbook', 'sketch book', 'drawing pencils', 'markers', 'color set', 'acrylic',
    'drawing tablet', 'graphic tablet', 'wacom', 'architecture', 'model making', 'charcoal'
  ],
  'Gadgets & Accessories': [
    'gadget', 'gadgets', 'headphone', 'headphones', 'earphones', 'headset', 'mouse',
    'keyboard', 'charger', 'fast charger', 'adapter', 'power bank', 'usb', 'usb drive',
    'pen drive', 'flash drive', 'type-c', 'hdmi cable', 'aux cable', 'dongle', 'hub'
  ],
  Cameras: [
    'camera', 'cameras', 'dslr', 'dslrs', 'lens', 'lenses', 'tripod', 'tripods',
    'photography', 'photo', 'photos', 'video', 'videography', 'filming', 'shoot',
    'recording', 'cinematography', 'camcorder', 'gimbal', 'microphone', 'audio recorder'
  ],
  Computers: [
    'computer', 'computers', 'laptop', 'laptops', 'workstation', 'workstations',
    'pc', 'desktop', 'gpu', 'gpus', 'server', 'coding', 'programming', 'software',
    'machine learning', 'simulation', 'macbook', 'linux', 'compute', 'rendering'
  ],
  Laboratories: [
    'lab', 'laboratory', 'laboratories', 'chemistry', 'biology', 'fume hood',
    'centrifuge', 'microscope', 'spectroscopy', 'incubator', 'pipette', 'chemical',
    'bench', 'wet lab', 'autoclave', 'cleanroom'
  ],
  'Meeting Rooms': [
    'meeting', 'meetings', 'meeting room', 'conference', 'conference room', 'boardroom',
    'discussion', 'presentation', 'seminar', 'group study', 'collab', 'collaboration'
  ],
  'Testing Equipment': [
    'testing', 'oscilloscope', 'multimeter', 'spectrum analyzer', 'signal generator',
    'waveform', 'sensor', 'probe', 'calibrator', 'hardware test', 'bench meter'
  ],
  Electronics: [
    'electronics', 'circuit', 'circuits', 'breadboard', 'soldering', 'microcontroller',
    'arduino', 'raspberry pi', 'esp32', 'resistor', 'pcb', 'robotics', 'iot'
  ],
  'Workshop Tools': [
    'tool', 'tools', 'workshop', 'fabrication', '3d printer', 'cnc', 'lathe',
    'laser cutter', 'drill', 'saw', 'wrench', 'screwdriver', 'power tool', 'maker'
  ],
  'Study Spaces': [
    'study', 'study space', 'quiet study', 'reading', 'desk', 'library', 'workspace',
    'individual study', 'cubicle', 'silent room'
  ],
};

/**
 * Campus & Location Keywords
 */
const LOCATION_KEYWORDS = [
  { key: 'North Campus', terms: ['north campus', 'north', 'physics hall', 'science complex'] },
  { key: 'South Campus', terms: ['south campus', 'south', 'engineering block', 'design studio'] },
  { key: 'Central Campus', terms: ['central campus', 'main campus', 'main', 'central library', 'administration'] },
  { key: 'Tech Innovation Center', terms: ['tech center', 'innovation center', 'incubator', 'research park'] },
];

/**
 * Intent Keywords to refine matching
 */
const INTENT_TERMS = [
  'event', 'presentation', 'workshop', 'recording', 'coding', 'study',
  'research', 'hackathon', 'filming', 'experiment', 'test', 'testing', 'thesis',
  'project', 'class', 'lecture', 'competition'
];

/**
 * 1. Parse Need Description
 * Extracts categories, location clues, intent terms, and resourceType without external AI.
 * Explicit structured overrides take priority.
 */
function parseNeedDescription(text = '') {
  const normalized = (text || '').toLowerCase().trim();
  const tokens = normalized.split(/[^a-zA-Z0-9_\-]+/).filter((t) => t.length > 1);

  const matchedCategories = [];
  const matchedLocations = [];
  const matchedIntents = [];

  // Match categories via synonyms
  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const syn of synonyms) {
      if (syn.includes(' ')) {
        if (normalized.includes(syn)) {
          if (!matchedCategories.includes(category)) matchedCategories.push(category);
        }
      } else {
        if (tokens.includes(syn)) {
          if (!matchedCategories.includes(category)) matchedCategories.push(category);
        }
      }
    }
  }

  // Match location clues
  for (const loc of LOCATION_KEYWORDS) {
    for (const term of loc.terms) {
      if (normalized.includes(term)) {
        if (!matchedLocations.includes(loc.key)) matchedLocations.push(loc.key);
      }
    }
  }

  // Match intent terms
  for (const intent of INTENT_TERMS) {
    if (tokens.includes(intent) || normalized.includes(intent)) {
      if (!matchedIntents.includes(intent)) matchedIntents.push(intent);
      if (intent === 'test' && !matchedIntents.includes('testing')) matchedIntents.push('testing');
    }
  }

  // Resource type inference (space vs equipment)
  let inferredResourceType = null;
  const spaceKeywords = ['room', 'hall', 'space', 'studio', 'lab', 'facility', 'bench', 'boardroom', 'office'];
  const equipKeywords = ['camera', 'dslr', 'tripod', 'lens', 'laptop', 'computer', 'workstation', 'device', 'tool', 'printer', 'oscilloscope', 'kit', 'sensor', 'probe'];

  if (
    tokens.some((t) => spaceKeywords.includes(t)) ||
    matchedCategories.some((c) => ['Meeting Rooms', 'Laboratories', 'Study Spaces'].includes(c))
  ) {
    inferredResourceType = 'space';
  } else if (
    tokens.some((t) => equipKeywords.includes(t)) ||
    matchedCategories.some((c) => ['Cameras', 'Computers', 'Testing Equipment', 'Electronics', 'Workshop Tools'].includes(c))
  ) {
    inferredResourceType = 'equipment';
  }

  return {
    rawText: text,
    tokens,
    inferredCategories: matchedCategories,
    inferredCategory: matchedCategories[0] || null,
    inferredLocations: matchedLocations,
    inferredLocation: matchedLocations[0] || null,
    inferredIntents: matchedIntents,
    inferredResourceType,
  };
}

/**
 * 2. Calculate Real-Time Overlapping Capacity
 * Reuses Part 5's exact interval overlap algorithm:
 * Two intervals [A_start, A_end] and [B_start, B_end] overlap iff A_start < B_end AND A_end > B_start.
 */
function calculateAvailableCapacity(resource, activeBookings, requestedStart, requestedEnd) {
  const totalCapacity = Number(resource.quantity) || 1;

  if (!requestedStart || !requestedEnd) {
    return {
      totalCapacity,
      currentlyBooked: 0,
      availableCapacity: totalCapacity,
      isFullyAvailable: true,
      hasOverlap: false,
    };
  }

  const reqStartMs = new Date(requestedStart).getTime();
  const reqEndMs = new Date(requestedEnd).getTime();

  // Find bookings on this specific resource that overlap the requested window
  const resourceBookings = activeBookings.filter((b) => {
    const resId = b.resource?._id ? b.resource._id.toString() : b.resource?.toString();
    const targetId = resource._id ? resource._id.toString() : resource.id?.toString();
    if (resId !== targetId) return false;

    // Status check: only confirmed approved or checked_in bookings reserve capacity
    if (!['approved', 'checked_in'].includes(b.status)) return false;

    const bStartMs = new Date(b.startAt).getTime();
    const bEndMs = new Date(b.endAt).getTime();

    // Strict overlap formula
    return bStartMs < reqEndMs && bEndMs > reqStartMs;
  });

  const currentlyBooked = resourceBookings.reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
  const availableCapacity = Math.max(0, totalCapacity - currentlyBooked);

  return {
    totalCapacity,
    currentlyBooked,
    availableCapacity,
    isFullyAvailable: availableCapacity >= 1,
    hasOverlap: currentlyBooked > 0,
  };
}

/**
 * 3. Deterministic Explainable Scoring Model (0 - 100 points)
 * Weights:
 * - Category / Type Relevance: 35 points
 * - Description & Keyword Relevance: 30 points (adapted from budget, as university items are non-monetary)
 * - Location Proximity: 20 points
 * - Availability & Capacity Margin: 15 points
 */
function scoreResourceMatch(resource, criteria, parsedSignals, capacityInfo) {
  let score = 0;
  const explanations = [];

  const effectiveCategory = criteria.category && criteria.category !== 'All Categories'
    ? criteria.category
    : parsedSignals.inferredCategories[0] || null;

  const effectiveLocation = criteria.location && criteria.location !== 'All Campuses'
    ? criteria.location
    : parsedSignals.inferredLocations[0] || null;

  const resourceTitle = (resource.title || '').toLowerCase();
  const resourceDesc = (resource.description || '').toLowerCase();
  const resourceCat = resource.category || '';
  const resourceCampus = resource.location?.campus || '';

  // --- Criterion 1: Category & Resource Type Match (Max 35 points) ---
  if (effectiveCategory) {
    if (resourceCat.toLowerCase() === effectiveCategory.toLowerCase()) {
      score += 35;
      explanations.push(`Exact category match: "${resourceCat}".`);
    } else {
      // Related category check
      const relatedGroups = [
        ['Cameras', 'Electronics'],
        ['Testing Equipment', 'Electronics', 'Laboratories'],
        ['Computers', 'Electronics', 'Laboratories'],
        ['Workshop Tools', 'Electronics'],
        ['Meeting Rooms', 'Study Spaces'],
      ];
      const isRelated = relatedGroups.some(
        (g) => g.includes(resourceCat) && g.includes(effectiveCategory)
      );
      if (isRelated) {
        score += 20;
        explanations.push(`Related category match: "${resourceCat}" complements your need for "${effectiveCategory}".`);
      } else if (criteria.resourceType && resource.resourceType === criteria.resourceType) {
        score += 10;
        explanations.push(`Matches preferred facility type (${resource.resourceType}).`);
      }
    }
  } else if (criteria.resourceType && resource.resourceType === criteria.resourceType) {
    score += 15;
    explanations.push(`Matches requested resource type (${resource.resourceType}).`);
  }

  // --- Criterion 2: Description & Keyword Relevance (Max 30 points) ---
  const queryTokens = parsedSignals.tokens.filter(
    (t) => !['need', 'want', 'looking', 'for', 'the', 'and', 'with', 'from', 'near', 'tomorrow', 'today'].includes(t)
  );

  let matchedTokenCount = 0;
  const subcat = (resource.subcategory || '').toLowerCase();
  const acad = resource.academicMetadata || {};
  const subjectStr = (acad.subject || '').toLowerCase();
  const branchStr = (acad.branch || '').toLowerCase();
  const bookStr = (acad.bookTitle || '').toLowerCase();
  const authorStr = (acad.author || '').toLowerCase();

  for (const token of queryTokens) {
    if (
      resourceTitle.includes(token) ||
      resourceDesc.includes(token) ||
      subcat.includes(token) ||
      subjectStr.includes(token) ||
      branchStr.includes(token) ||
      bookStr.includes(token) ||
      authorStr.includes(token)
    ) {
      matchedTokenCount++;
    }
  }

  if (queryTokens.length > 0) {
    const tokenFraction = Math.min(1, matchedTokenCount / Math.min(queryTokens.length, 4));
    const tokenScore = Math.round(tokenFraction * 20);
    score += tokenScore;
    if (matchedTokenCount > 0) {
      explanations.push(`Matches ${matchedTokenCount} relevant term(s) in title or description.`);
    }
  }

  // Intent matching (event, study, filming, coding)
  const matchedIntents = parsedSignals.inferredIntents.filter(
    (intent) => resourceTitle.includes(intent) || resourceDesc.includes(intent)
  );
  if (matchedIntents.length > 0) {
    score += 10;
    explanations.push(`Supports stated activity: "${matchedIntents.join(', ')}".`);
  }

  // --- Criterion 3: Location Match (Max 20 points) ---
  if (effectiveLocation) {
    if (resourceCampus.toLowerCase().includes(effectiveLocation.toLowerCase())) {
      score += 20;
      explanations.push(`Located at your target campus (${resourceCampus}).`);
    } else {
      score += 5; // Campus reachable across institution
    }
  } else {
    score += 15; // Neutral location score when location is unconstrained
    explanations.push(`Convenient institutional location (${resourceCampus}).`);
  }

  // --- Criterion 4: Availability & Capacity Margin (Max 15 points) ---
  const requestedQty = Number(criteria.quantity) || 1;
  if (capacityInfo.availableCapacity >= requestedQty) {
    if (capacityInfo.availableCapacity > requestedQty) {
      score += 15;
      explanations.push(`Fully available with capacity cushion (${capacityInfo.availableCapacity} units free).`);
    } else {
      score += 12;
      explanations.push(`Available for your requested quantity (${capacityInfo.availableCapacity} unit).`);
    }
  } else {
    score += 0;
  }

  // Clamp strictly between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, score));

  return {
    score: normalizedScore,
    explanations,
  };
}

/**
 * 4. Need-First Matching Engine
 * Main orchestration function that filters, scores, and ranks resources.
 */
async function findSmartMatches(params = {}, user = null) {
  const {
    description = '',
    category = '',
    location = '',
    resourceType = '',
    startAt,
    endAt,
    quantity = 1,
    includeRescueBoost = true,
  } = params;

  // 1. Validation
  const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
  if (parsedQuantity > 1000) {
    throw new Error('Requested quantity exceeds maximum limit of 1000');
  }

  let requestedStart = null;
  let requestedEnd = null;

  if (startAt || endAt) {
    if (!startAt || !endAt) {
      throw new Error('Both start date and end date are required when specifying a booking time window');
    }
    requestedStart = new Date(startAt);
    requestedEnd = new Date(endAt);

    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
      throw new Error('Invalid date/time format provided');
    }

    if (requestedStart >= requestedEnd) {
      throw new Error('End date/time must be strictly after start date/time');
    }

    if (requestedStart.getTime() < Date.now() - 60000) {
      throw new Error('Booking start time cannot be in the past');
    }
  }

  // 2. Parse text signals
  const parsedSignals = parseNeedDescription(description);

  // 3. Query all eligible, approved, active resources from MongoDB
  const query = {
    moderationStatus: 'approved',
    availabilityStatus: { $ne: 'maintenance' },
  };

  // Prevent self-booking if user is authenticated
  if (user && user._id) {
    query.owner = { $ne: user._id };
  }

  const allResources = await Resource.find(query)
    .populate('owner', 'name email role')
    .lean();

  if (!allResources || allResources.length === 0) {
    return {
      query: { description, category, location, quantity: parsedQuantity, startAt, endAt },
      parsedSignals,
      matches: [],
      alternatives: [],
      totalEvaluated: 0,
    };
  }

  // 4. Batch fetch confirmed overlapping bookings for the requested time slot
  let activeBookings = [];
  if (requestedStart && requestedEnd) {
    activeBookings = await Booking.find({
      status: { $in: ['approved', 'checked_in'] },
      startAt: { $lt: requestedEnd },
      endAt: { $gt: requestedStart },
    }).lean();
  }

  // 5. Pre-fetch 30-day historical bookings for Part 11 Smart Resource Rescue badges
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const historicalBookings = await Booking.find({
    status: { $in: ['approved', 'checked_in', 'completed'] },
    startAt: { $gte: thirtyDaysAgo },
  }).lean();

  const historicalByResource = {};
  for (const b of historicalBookings) {
    const resId = b.resource?.toString();
    if (resId) {
      if (!historicalByResource[resId]) historicalByResource[resId] = [];
      historicalByResource[resId].push(b);
    }
  }

  // 6. Evaluate and score each resource
  const scoredMatches = [];
  const alternativeCandidates = [];

  const effectiveCriteria = {
    category,
    location,
    resourceType,
    quantity: parsedQuantity,
    startAt: requestedStart,
    endAt: requestedEnd,
  };

  for (const resource of allResources) {
    const capacityInfo = calculateAvailableCapacity(
      resource,
      activeBookings,
      requestedStart,
      requestedEnd
    );

    // Hard eligibility checks
    const hasSufficientCapacity = capacityInfo.availableCapacity >= parsedQuantity;

    // Smart Resource Rescue classification check (Part 11)
    const resBookings = historicalByResource[resource._id.toString()] || [];
    const utilizationMetrics = calculateResourceUtilization(resource, resBookings, 30);
    const isUnderused = utilizationMetrics.classification === 'underused';

    const { score, explanations } = scoreResourceMatch(
      resource,
      effectiveCriteria,
      parsedSignals,
      capacityInfo
    );

    const matchEntry = {
      resource: {
        _id: resource._id,
        id: resource._id.toString(),
        title: resource.title,
        name: resource.title,
        description: resource.description,
        category: resource.category,
        resourceType: resource.resourceType,
        location: resource.location,
        images: resource.images,
        quantity: resource.quantity,
        condition: resource.condition,
        operatingHours: resource.operatingHours,
        owner: resource.owner ? { _id: resource.owner._id, name: resource.owner.name } : null,
      },
      matchScore: score,
      explanations,
      capacity: capacityInfo,
      isUnderused,
      rescueMetrics: isUnderused
        ? {
            classification: utilizationMetrics.classification,
            confidence: utilizationMetrics.confidence,
            utilizationRate: utilizationMetrics.utilizationRate,
          }
        : null,
    };

    if (isUnderused) {
      matchEntry.explanations.push('Smart Resource Rescue: Underutilized asset (<20% booked).');
    }

    // Direct match criteria: sufficient capacity and score threshold
    if (hasSufficientCapacity && score >= 25) {
      scoredMatches.push(matchEntry);
    } else {
      // Store potential alternative candidate with constraint reason
      let constraintReason = 'Low relevance to search criteria';
      if (!hasSufficientCapacity) {
        constraintReason = `Capacity unavailable for requested time (${capacityInfo.currentlyBooked}/${capacityInfo.totalCapacity} units booked)`;
      } else if (score < 25) {
        constraintReason = 'Different category or distant location';
      }

      alternativeCandidates.push({
        ...matchEntry,
        constraintReason,
      });
    }
  }

  // 7. Deterministic Sorting & Tie-Breaking
  // Priority: (1) Match Score DESC -> (2) Underused Resource tie-breaker -> (3) Available Capacity DESC -> (4) ID ASC
  const sortComparator = (a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // Secondary tie-breaker: promote underutilized resources
    if (includeRescueBoost && a.isUnderused !== b.isUnderused) {
      return a.isUnderused ? -1 : 1;
    }
    // Tertiary tie-breaker: capacity cushion
    if (b.capacity.availableCapacity !== a.capacity.availableCapacity) {
      return b.capacity.availableCapacity - a.capacity.availableCapacity;
    }
    // Strict deterministic tie-breaker
    return a.resource.id.localeCompare(b.resource.id);
  };

  scoredMatches.sort(sortComparator);
  alternativeCandidates.sort(sortComparator);

  return {
    query: {
      description,
      category: category || null,
      location: location || null,
      quantity: parsedQuantity,
      startAt: requestedStart ? requestedStart.toISOString() : null,
      endAt: requestedEnd ? requestedEnd.toISOString() : null,
    },
    parsedSignals: {
      inferredCategories: parsedSignals.inferredCategories,
      inferredLocations: parsedSignals.inferredLocations,
      inferredIntents: parsedSignals.inferredIntents,
    },
    count: scoredMatches.length,
    matches: scoredMatches,
    alternatives: alternativeCandidates.slice(0, 4), // Top 4 closest alternatives
    totalEvaluated: allResources.length,
  };
}

module.exports = {
  parseNeedDescription,
  calculateAvailableCapacity,
  scoreResourceMatch,
  findSmartMatches,
  CATEGORY_SYNONYMS,
  LOCATION_KEYWORDS,
  INTENT_TERMS,
};
