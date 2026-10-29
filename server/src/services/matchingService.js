/**
 * Need-First Smart Resource Matching Service (Part 13 & Phase 3)
 * Resource Sharing Platform — CodeHack India 2026
 *
 * Implements:
 * 1. Rule-based, transparent natural-language need parsing (no external AI/LLMs)
 * 2. Academic metadata parsing (branch, semester, subject, book, items, quantity)
 * 3. Hard eligibility, moderation, owner-suspension, and overlap availability filtering
 * 4. Deterministic 0-100 scoring engine with evidence-backed explainable criteria
 * 5. Deterministic ranking and alternative recommendations when constraints bind
 * 6. Smart Resource Rescue (Part 11) underutilization integration
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
    'exam pad', 'clip board', 'highlighter', 'stapler', 'sticky notes', 'sharpener', 'eraser'
  ],
  'Books & Study Materials': [
    'book', 'books', 'textbook', 'textbooks', 'study material', 'notes', 'handwritten notes',
    'lecture notes', 'assignment', 'assignments', 'lab manual', 'manuals', 'question paper',
    'previous year', 'pyq', 'pyqs', 'semester book', 'exam book', 'gate', 'cat', 'upsc',
    'practical file', 'drawing sheet', 'project file', 'reference book', 'handbook', 'syllabus',
    'question bank', 'guide'
  ],
  'Design, Drawing & Architecture': [
    'drafter', 'mini drafter', 'drafting', 'drafting tool', 'drawing', 'engineering drawing',
    'geometry box', 'compass', 'divider', 'ruler', 'scale', 'set square', 'drawing board',
    'sketchbook', 'sketch book', 'drawing pencils', 'markers', 'color set', 'acrylic',
    'drawing tablet', 'graphic tablet', 'wacom', 'architecture', 'model making', 'charcoal',
    't-square', 'french curve', 'protractor', 'tracing paper', 'canvas'
  ],
  'Gadgets & Accessories': [
    'gadget', 'gadgets', 'headphone', 'headphones', 'earphones', 'headset', 'mouse',
    'keyboard', 'charger', 'fast charger', 'adapter', 'power bank', 'usb', 'usb drive',
    'pen drive', 'flash drive', 'type-c', 'hdmi cable', 'aux cable', 'dongle', 'hub',
    'otg', 'webcam', 'extension cord', 'bluetooth'
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
    'lab', 'laboratory', 'laboratories', 'lab equipment', 'apparatus', 'chemistry', 'biology',
    'fume hood', 'centrifuge', 'microscope', 'spectroscopy', 'incubator', 'pipette', 'chemical',
    'bench', 'wet lab', 'autoclave', 'cleanroom', 'glassware', 'test tube', 'beaker'
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
 * Subcategory Dictionary mapping keywords to canonical subcategories
 */
const SUBCATEGORY_MAPPINGS = [
  { subcategory: 'Calculators', terms: ['calculator', 'scientific calculator', 'calci', 'casio'] },
  { subcategory: 'Drafters and Drafting Tools', terms: ['mini drafter', 'drafter', 'drafting tool'] },
  { subcategory: 'Technical Drawing Boards', terms: ['drawing board', 'drafting board'] },
  { subcategory: 'Geometry Boxes', terms: ['geometry box', 'compass', 'divider', 'set square'] },
  { subcategory: 'Engineering Textbooks', terms: ['engineering textbook', 'textbook', 'textbooks'] },
  { subcategory: 'Subject-Wise Handwritten Notes', terms: ['handwritten notes', 'lecture notes', 'class notes', 'notes'] },
  { subcategory: 'Lab Manuals', terms: ['lab manual', 'manuals', 'practical file'] },
  { subcategory: 'Previous-Year Question Papers', terms: ['pyq', 'pyqs', 'previous year question', 'question paper'] },
  { subcategory: 'Water Bottles', terms: ['water bottle', 'bottle', 'sipper'] },
  { subcategory: 'Bags & Backpacks', terms: ['backpack', 'bag', 'bags', 'college bag'] },
  { subcategory: 'Umbrellas and Raincoats', terms: ['umbrella', 'raincoat'] },
  { subcategory: 'Computer Mice and Keyboards', terms: ['keyboard', 'mouse', 'wireless keyboard', 'mechanical keyboard', 'wireless mouse'] },
  { subcategory: 'Chargers and Adapters', terms: ['charger', 'fast charger', 'adapter', 'power bank'] },
  { subcategory: 'USB Drives', terms: ['usb', 'usb drive', 'pen drive', 'flash drive'] },
  { subcategory: 'Headphones', terms: ['headphone', 'headphones', 'earphones', 'headset', 'earbuds'] },
];

/**
 * Academic Branches Dictionary
 */
const BRANCH_PATTERNS = [
  { key: 'Computer Science & Engineering (CSE)', code: 'CSE', terms: ['cse', 'computer science', 'comp sci', 'cs branch'] },
  { key: 'Information Technology (IT)', code: 'IT', terms: ['information technology', 'it branch'] },
  { key: 'Mechanical Engineering', code: 'Mechanical', terms: ['mechanical engineering', 'mechanical', 'mech'] },
  { key: 'Civil Engineering', code: 'Civil', terms: ['civil engineering', 'civil', 'structural engineering'] },
  { key: 'Electronics & Communication Engineering (ECE)', code: 'ECE', terms: ['electronics & communication', 'electronics and communication', 'ece'] },
  { key: 'Electrical & Electronics Engineering (EEE)', code: 'EEE', terms: ['electrical & electronics', 'electrical and electronics', 'eee', 'electrical engineering', 'electrical'] },
  { key: 'Chemical Engineering', code: 'Chemical', terms: ['chemical engineering', 'chemical'] },
  { key: 'Biotechnology & Life Sciences', code: 'Biotechnology', terms: ['biotechnology', 'biotech', 'life sciences'] },
  { key: 'Architecture & Planning', code: 'Architecture', terms: ['architecture', 'b.arch', 'planning', 'architectural'] },
  { key: 'Basic Sciences (Physics / Chemistry / Maths)', code: 'Basic Sciences', terms: ['basic sciences', 'applied physics', 'applied chemistry', 'engineering mathematics'] },
  { key: 'Management & Humanities', code: 'Management', terms: ['management', 'mba', 'bba', 'humanities'] },
];

/**
 * Academic Subjects Dictionary
 */
const SUBJECT_KEYWORDS = [
  { key: 'Data Structures & Algorithms', terms: ['dsa', 'data structures', 'algorithms', 'data structure', 'trees and graphs'] },
  { key: 'Mathematics & Calculus', terms: ['maths', 'mathematics', 'calculus', 'linear algebra', 'discrete maths', 'discrete mathematics', 'differential equations'] },
  { key: 'Engineering Drawing & Graphics', terms: ['engineering drawing', 'engineering graphics', 'edg', 'technical drawing', 'machine drawing'] },
  { key: 'Physics', terms: ['physics', 'applied physics', 'optics', 'electromagnetics'] },
  { key: 'Chemistry', terms: ['chemistry', 'organic chemistry', 'inorganic chemistry'] },
  { key: 'Operating Systems', terms: ['operating systems', 'os', 'linux kernel', 'unix'] },
  { key: 'Database Management Systems', terms: ['dbms', 'database', 'sql', 'databases'] },
  { key: 'Computer Networks', terms: ['computer networks', 'networking', 'tcp/ip'] },
  { key: 'Machine Learning & AI', terms: ['machine learning', 'artificial intelligence', 'deep learning', 'ml', 'ai'] },
  { key: 'Digital Electronics & Logic', terms: ['digital electronics', 'logic design', 'digital logic', 'vlsi'] },
  { key: 'Electronic Circuits & Devices', terms: ['circuits', 'electronic devices', 'analog circuits', 'edc'] },
  { key: 'Thermodynamics & Fluid Mechanics', terms: ['thermodynamics', 'fluid mechanics', 'heat transfer', 'som', 'strength of materials'] },
  { key: 'Theory of Computation', terms: ['theory of computation', 'toc', 'automata'] },
  { key: 'Compiler Design', terms: ['compiler design', 'compiler'] },
  { key: 'Structural Analysis', terms: ['structural analysis', 'surveying', 'geotechnical'] },
];

/**
 * Specific Common Items for direct entity extraction
 */
const SPECIFIC_ITEMS = [
  { name: 'Scientific Calculator', terms: ['scientific calculator', 'calculator', 'calci', 'fx-991', 'casio calculator'] },
  { name: 'Mini Drafter', terms: ['mini drafter', 'drafter', 'drafting machine'] },
  { name: 'Drawing Board', terms: ['drawing board', 'drafting board', 'imperial drawing board'] },
  { name: 'Geometry Box', terms: ['geometry box', 'compass set', 'instrument box'] },
  { name: 'Textbook', terms: ['textbook', 'text book', 'reference book', 'handbook'] },
  { name: 'Handwritten Notes', terms: ['handwritten notes', 'lecture notes', 'class notes', 'notes'] },
  { name: 'Lab Manual', terms: ['lab manual', 'practical file', 'experiment manual'] },
  { name: 'Previous Year Papers', terms: ['pyq', 'pyqs', 'previous year question', 'question paper', 'past papers'] },
  { name: 'Water Bottle', terms: ['water bottle', 'bottle', 'sipper', 'flask'] },
  { name: 'Backpack', terms: ['backpack', 'bag', 'bags', 'college bag', 'laptop bag'] },
  { name: 'Umbrella', terms: ['umbrella', 'raincoat'] },
  { name: 'Keyboard', terms: ['keyboard', 'mechanical keyboard', 'wireless keyboard'] },
  { name: 'Mouse', terms: ['mouse', 'wireless mouse', 'optical mouse'] },
  { name: 'Headphones', terms: ['headphones', 'earphones', 'headset', 'earbuds'] },
  { name: 'Charger', terms: ['charger', 'fast charger', 'power adapter', 'type-c charger'] },
  { name: 'USB Drive', terms: ['usb drive', 'pen drive', 'flash drive', 'pendrive'] },
  { name: 'Laptop', terms: ['laptop', 'notebook computer', 'macbook'] },
  { name: 'DSLR Camera', terms: ['dslr', 'dslr camera', 'camera', 'mirrorless camera'] },
  { name: 'Oscilloscope', terms: ['oscilloscope', 'cro', 'dso'] },
  { name: 'Multimeter', terms: ['multimeter', 'digital multimeter', 'dmm'] },
  { name: 'Microscope', terms: ['microscope', 'compound microscope'] },
];

/**
 * Campus & Location Keywords (inclusive of Part 13 and Phase 2 campus names)
 */
const LOCATION_KEYWORDS = [
  {
    key: 'Main Academic Campus',
    terms: [
      'main campus', 'main academic campus', 'academic campus', 'central library',
      'administration', 'main building', 'near my campus', 'my campus', 'campus'
    ],
  },
  {
    key: 'North Research Campus',
    terms: [
      'north research campus', 'north campus', 'physics hall', 'science complex',
      'north research', 'north'
    ],
  },
  {
    key: 'Technology Innovation Hub',
    terms: [
      'technology innovation hub', 'tech hub', 'innovation hub', 'tech center',
      'innovation center', 'incubator', 'cs block', 'tech innovation', 'tech'
    ],
  },
  {
    key: 'Innovation Arts Campus',
    terms: [
      'innovation arts campus', 'arts campus', 'design studio', 'architecture building',
      'south campus', 'arts studio', 'creative wing', 'south'
    ],
  },
  // Backward compatibility keys
  { key: 'North Campus', terms: ['north campus', 'north', 'physics hall', 'science complex'] },
  { key: 'South Campus', terms: ['south campus', 'south', 'engineering block', 'design studio'] },
  { key: 'Central Campus', terms: ['central campus', 'main campus', 'main', 'central library', 'administration'] },
  { key: 'Tech Innovation Center', terms: ['tech center', 'innovation center', 'incubator', 'research park'] },
];

/**
 * Intent Keywords to refine matching
 */
const INTENT_TERMS = [
  'exam', 'maths exam', 'lab exam', 'practical', 'project', 'assignment',
  'presentation', 'study', 'research', 'coding', 'hackathon', 'filming',
  'recording', 'experiment', 'test', 'testing', 'competition', 'thesis',
  'workshop', 'class', 'lecture', 'event'
];

/**
 * Helper to safely extract quantity from text
 * Hardened to prevent misinterpreting semesters, academic years, model numbers, or chapters.
 */
function extractQuantityFromText(text = '') {
  if (!text) return null;
  const patterns = [
    /(?:need|want|get|borrow|require|looking for|reserve)\s+(\d{1,3})\s+(?:(?!semester|sem|year|yr|term|edition|class|level|room|floor|model|chapter)\w+\s+)?(?:units?|calculators?|drafters?|boards?|books?|textbooks?|notes?|laptops?|pieces?|gadgets?|bottles?|bags?|items?|copies?|sets?|kits?|devices?|drives?|chargers?)\b/i,
    /(?<!sem\s*|semester\s*|year\s*|yr\s*|grade\s*|class\s*|chapter\s*|model\s*|edition\s*|fx-|\d)\b(\d{1,3})\s+(?:(?!semester|sem|year|yr|term|edition|class|level|room|floor|model|chapter)\w+\s+)?(?:units?|calculators?|drafters?|boards?|books?|textbooks?|notes?|laptops?|pieces?|gadgets?|bottles?|bags?|items?|copies?|sets?|kits?|devices?|drives?|chargers?)\b/i,
    /(?:quantity|qty)[:\s]+(\d{1,3})\b/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (val >= 1 && val <= 1000) return val;
    }
  }
  return null;
}

/**
 * 1. Parse Need Description
 * Extracts categories, subcategories, academic metadata, specific items,
 * locations, quantities, intent terms, and resourceType without external AI.
 */
function parseNeedDescription(text = '') {
  const str = typeof text === 'string' ? text : '';
  const boundedText = str.slice(0, 500);
  const normalized = boundedText.toLowerCase().trim();
  const tokens = normalized.split(/[^a-zA-Z0-9_\-]+/).filter((t) => t.length > 1);

  const matchedCategories = [];
  const matchedSubcategories = [];
  const matchedLocations = [];
  const matchedIntents = [];
  const matchedItems = [];

  // 1. Category extraction via synonyms
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

  // 2. Subcategory extraction
  for (const item of SUBCATEGORY_MAPPINGS) {
    for (const term of item.terms) {
      if (term.includes(' ')) {
        if (normalized.includes(term)) {
          if (!matchedSubcategories.includes(item.subcategory)) matchedSubcategories.push(item.subcategory);
        }
      } else {
        if (tokens.includes(term)) {
          if (!matchedSubcategories.includes(item.subcategory)) matchedSubcategories.push(item.subcategory);
        }
      }
    }
  }

  // 3. Academic Branch extraction
  let inferredBranch = null;
  let inferredBranchKey = null;
  for (const b of BRANCH_PATTERNS) {
    for (const term of b.terms) {
      if (tokens.includes(term) || (term.includes(' ') && normalized.includes(term))) {
        inferredBranch = b.code;
        inferredBranchKey = b.key;
        break;
      }
    }
    if (inferredBranch) break;
  }

  // 4. Academic Semester / Year extraction
  let inferredSemesterNum = null;
  let inferredSemester = null;
  let inferredYear = null;

  const semRegexes = [
    /(?:sem(?:ester)?|term)\s*([1-8])/i,
    /([1-8])(?:st|nd|rd|th)?\s*sem(?:ester)?/i,
    /semester\s*([1-8])/i,
  ];
  for (const rx of semRegexes) {
    const m = normalized.match(rx);
    if (m && m[1]) {
      inferredSemesterNum = parseInt(m[1], 10);
      inferredSemester = `Semester ${inferredSemesterNum}`;
      break;
    }
  }

  const yrRegexes = [
    /(?:year|yr)\s*([1-4])/i,
    /([1-4])(?:st|nd|rd|th)?\s*year/i,
  ];
  for (const rx of yrRegexes) {
    const m = normalized.match(rx);
    if (m && m[1]) {
      const yrNum = parseInt(m[1], 10);
      inferredYear = `Year ${yrNum}`;
      if (!inferredSemester) {
        inferredSemester = inferredYear;
      }
      break;
    }
  }

  // 5. Academic Subject extraction
  let inferredSubject = null;
  for (const s of SUBJECT_KEYWORDS) {
    for (const term of s.terms) {
      if (tokens.includes(term) || (term.includes(' ') && normalized.includes(term))) {
        inferredSubject = s.key;
        break;
      }
    }
    if (inferredSubject) break;
  }

  // 6. Specific Item entity extraction
  for (const item of SPECIFIC_ITEMS) {
    for (const term of item.terms) {
      if (term.includes(' ')) {
        if (normalized.includes(term)) {
          if (!matchedItems.includes(item.name)) matchedItems.push(item.name);
        }
      } else {
        if (tokens.includes(term)) {
          if (!matchedItems.includes(item.name)) matchedItems.push(item.name);
        }
      }
    }
  }

  // 7. Quantity extraction
  const inferredQuantity = extractQuantityFromText(normalized);

  // 8. Location extraction
  for (const loc of LOCATION_KEYWORDS) {
    for (const term of loc.terms) {
      if (normalized.includes(term)) {
        if (!matchedLocations.includes(loc.key)) matchedLocations.push(loc.key);
      }
    }
  }

  // 9. Activity Intent extraction
  for (const intent of INTENT_TERMS) {
    if (tokens.includes(intent) || normalized.includes(intent)) {
      if (!matchedIntents.includes(intent)) matchedIntents.push(intent);
      if (intent === 'test' && !matchedIntents.includes('testing')) matchedIntents.push('testing');
    }
  }

  // 10. Resource type inference (space vs equipment)
  let inferredResourceType = null;
  const spaceKeywords = ['room', 'hall', 'space', 'studio', 'lab', 'facility', 'bench', 'boardroom', 'office'];
  const equipKeywords = [
    'camera', 'dslr', 'tripod', 'lens', 'laptop', 'computer', 'workstation', 'device', 'tool',
    'printer', 'oscilloscope', 'kit', 'sensor', 'probe', 'calculator', 'drafter', 'board', 'textbook',
    'book', 'notes', 'keyboard', 'mouse', 'headphones', 'charger'
  ];

  if (
    tokens.some((t) => spaceKeywords.includes(t)) ||
    matchedCategories.some((c) => ['Meeting Rooms', 'Laboratories', 'Study Spaces'].includes(c))
  ) {
    inferredResourceType = 'space';
  } else if (
    tokens.some((t) => equipKeywords.includes(t)) ||
    matchedCategories.some((c) => [
      'Student Essentials', 'Books & Study Materials', 'Design, Drawing & Architecture',
      'Gadgets & Accessories', 'Cameras', 'Computers', 'Testing Equipment', 'Electronics', 'Workshop Tools'
    ].includes(c))
  ) {
    inferredResourceType = 'equipment';
  }

  return {
    rawText: text,
    tokens,
    inferredCategories: matchedCategories,
    inferredCategory: matchedCategories[0] || null,
    inferredSubcategories: matchedSubcategories,
    inferredSubcategory: matchedSubcategories[0] || null,
    inferredAcademic: {
      subject: inferredSubject,
      branch: inferredBranch,
      branchKey: inferredBranchKey,
      semester: inferredSemester,
      semesterNum: inferredSemesterNum,
      year: inferredYear,
    },
    itemKeywords: matchedItems,
    inferredQuantity,
    inferredLocations: matchedLocations,
    inferredLocation: matchedLocations[0] || null,
    inferredIntents: matchedIntents,
    inferredResourceType,
  };
}

/**
 * 2. Calculate Real-Time Overlapping Capacity
 * Reuses exact interval overlap algorithm:
 * Two intervals [A_start, A_end] and [B_start, B_end] overlap iff A_start < B_end AND A_end > B_start.
 */
function calculateAvailableCapacity(resource, activeBookings, requestedStart, requestedEnd) {
  const totalCapacity = Number(resource.quantity) || 1;

  // Maintenance takes strict precedence
  if (resource.availabilityStatus === 'maintenance') {
    return {
      totalCapacity,
      currentlyBooked: totalCapacity,
      availableCapacity: 0,
      isFullyAvailable: false,
      hasOverlap: true,
    };
  }

  if (!requestedStart || !requestedEnd) {
    const isAvail = resource.availabilityStatus === 'available';
    const availCap = isAvail ? totalCapacity : 0;
    return {
      totalCapacity,
      currentlyBooked: totalCapacity - availCap,
      availableCapacity: availCap,
      isFullyAvailable: availCap >= 1,
      hasOverlap: !isAvail,
    };
  }

  const reqStartMs = new Date(requestedStart).getTime();
  const reqEndMs = new Date(requestedEnd).getTime();

  // Find bookings on this specific resource that overlap the requested window
  const resourceBookings = (activeBookings || []).filter((b) => {
    const resId = b.resource?._id ? b.resource._id.toString() : b.resource?.toString();
    const targetId = resource._id ? resource._id.toString() : resource.id?.toString();
    if (resId !== targetId) return false;

    // Status check: only confirmed approved or checked_in bookings reserve capacity
    if (!['approved', 'checked_in'].includes(b.status)) return false;

    const bStartMs = new Date(b.startAt).getTime();
    const bEndMs = new Date(b.endAt).getTime();

    // Strict mathematical overlap formula
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
 * - Category / Type Relevance: max 35 points
 * - Description & Keyword Relevance & Academic Metadata: max 30 points
 * - Location Proximity: max 20 points
 * - Availability & Capacity Margin: max 15 points
 *
 * Strict Rule: No synthetic signals, no fake ratings, no fabricated metrics.
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

  const resourceTitle = (resource.title || resource.name || '').toLowerCase();
  const resourceDesc = (resource.description || '').toLowerCase();
  const resourceCat = resource.category || '';
  const resourceSubcat = (resource.subcategory || '').toLowerCase();
  const resourceCampus = resource.location?.campus || '';
  const acad = resource.academicMetadata || {};

  // --- Criterion 1: Category & Subcategory Match (Max 35 points) ---
  if (effectiveCategory) {
    if (resourceCat.toLowerCase() === effectiveCategory.toLowerCase()) {
      score += 35;
      if (parsedSignals.inferredSubcategories && parsedSignals.inferredSubcategories.some((s) => resourceSubcat.includes(s.toLowerCase()))) {
        explanations.push(`Exact category "${resourceCat}" & subcategory match: "${resource.subcategory}".`);
      } else {
        explanations.push(`Exact category match: "${resourceCat}".`);
      }
    } else {
      // Related category groups
      const relatedGroups = [
        ['Cameras', 'Electronics'],
        ['Testing Equipment', 'Electronics', 'Laboratories', 'Lab Equipment'],
        ['Computers', 'Electronics', 'Laboratories', 'Gadgets & Accessories'],
        ['Workshop Tools', 'Tools', 'Electronics', 'Design, Drawing & Architecture'],
        ['Meeting Rooms', 'Study Spaces'],
        ['Student Essentials', 'Books & Study Materials', 'Design, Drawing & Architecture', 'Gadgets & Accessories'],
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

  // --- Criterion 2: Description, Keyword Relevance & Academic Metadata (Max 30 points) ---
  const stopWords = ['need', 'want', 'looking', 'for', 'the', 'and', 'with', 'from', 'near', 'tomorrow', 'today', 'my', 'our'];
  const queryTokens = parsedSignals.tokens.filter((t) => !stopWords.includes(t));

  let matchedTokenCount = 0;
  const subjectStr = (acad.subject || '').toLowerCase();
  const branchStr = (acad.branch || '').toLowerCase();
  const deptStr = (acad.department || '').toLowerCase();
  const courseStr = (acad.course || '').toLowerCase();
  const classStr = (acad.classLevel || '').toLowerCase();
  const bookStr = (acad.bookTitle || '').toLowerCase();
  const authorStr = (acad.author || '').toLowerCase();

  for (const token of queryTokens) {
    if (
      resourceTitle.includes(token) ||
      resourceDesc.includes(token) ||
      resourceSubcat.includes(token) ||
      subjectStr.includes(token) ||
      branchStr.includes(token) ||
      deptStr.includes(token) ||
      courseStr.includes(token) ||
      classStr.includes(token) ||
      bookStr.includes(token) ||
      authorStr.includes(token)
    ) {
      matchedTokenCount++;
    }
  }

  let textScore = 0;
  if (queryTokens.length > 0) {
    const tokenFraction = Math.min(1, matchedTokenCount / Math.min(queryTokens.length, 4));
    textScore += Math.round(tokenFraction * 20);
    if (matchedTokenCount > 0) {
      explanations.push(`Matches ${matchedTokenCount} relevant term(s) in title or description.`);
    }
  }

  // Intent matching (exam, study, filming, coding, presentation, recording)
  const matchedIntents = (parsedSignals.inferredIntents || []).filter(
    (intent) => resourceTitle.includes(intent) || resourceDesc.includes(intent)
  );
  if (matchedIntents.length > 0) {
    textScore += 10;
    explanations.push(`Supports stated activity: "${matchedIntents.join(', ')}".`);
  }

  // Academic specific signals bonus
  let academicBonus = 0;
  if (parsedSignals.inferredAcademic?.subject) {
    const targetSubj = parsedSignals.inferredAcademic.subject.toLowerCase();
    if (subjectStr.includes(targetSubj) || targetSubj.includes(subjectStr)) {
      academicBonus += 8;
      explanations.push(`Matches academic subject: "${acad.subject}".`);
    }
  }
  if (parsedSignals.inferredAcademic?.branch) {
    const branchCode = parsedSignals.inferredAcademic.branch.toLowerCase();
    const branchKey = (parsedSignals.inferredAcademic.branchKey || '').toLowerCase();
    if (branchStr.includes(branchCode) || (branchKey && branchStr.includes(branchKey))) {
      academicBonus += 6;
      explanations.push(`Matches academic branch: "${acad.branch}".`);
    }
  }
  if (parsedSignals.inferredAcademic?.semesterNum) {
    const semNumStr = String(parsedSignals.inferredAcademic.semesterNum);
    if ((acad.semester || '').includes(semNumStr) || (acad.academicYear || '').includes(semNumStr)) {
      academicBonus += 4;
      explanations.push(`Matches target semester: "${acad.semester || acad.academicYear}".`);
    }
  }
  if (parsedSignals.itemKeywords && parsedSignals.itemKeywords.length > 0) {
    const matchedItem = parsedSignals.itemKeywords.find(
      (item) => resourceTitle.includes(item.toLowerCase()) || resourceSubcat.includes(item.toLowerCase())
    );
    if (matchedItem) {
      academicBonus += 6;
      explanations.push(`Direct item match: "${matchedItem}".`);
    }
  }

  score += Math.min(30, textScore + academicBonus);

  // --- Criterion 3: Location Match (Max 20 points) ---
  if (effectiveLocation) {
    if (resourceCampus.toLowerCase().includes(effectiveLocation.toLowerCase())) {
      score += 20;
      explanations.push(`Located at your target campus (${resourceCampus || 'Target Campus'}).`);
    } else {
      score += 5; // Campus reachable across institution
    }
  } else {
    score += 15; // Neutral location score when location is unconstrained
    explanations.push(`Convenient institutional location (${resourceCampus || 'Main Academic Campus'}).`);
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
    quantity,
    includeRescueBoost = true,
  } = params;

  // 1. Parse text signals upfront to extract intent and quantities
  const parsedSignals = parseNeedDescription(description);

  // Resolve requested quantity (explicit parameter takes priority; falls back to text inference)
  let parsedQuantity = 1;
  if (quantity !== undefined && quantity !== null && quantity !== '') {
    parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
  } else if (parsedSignals.inferredQuantity) {
    parsedQuantity = parsedSignals.inferredQuantity;
  }

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

  // 2. Query all approved, active resources from MongoDB
  const query = {
    moderationStatus: 'approved',
    availabilityStatus: { $ne: 'maintenance' },
  };

  // Prevent self-booking if user is authenticated
  const requestingUserId = user?._id?.toString() || user?.id?.toString();
  if (user && user._id) {
    query.owner = { $ne: user._id };
  }

  const allResources = await Resource.find(query)
    .populate('owner', 'name email role status isSuspended')
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

  // 3. Batch fetch confirmed overlapping bookings for the requested time slot
  let activeBookings = [];
  if (requestedStart && requestedEnd) {
    activeBookings = await Booking.find({
      status: { $in: ['approved', 'checked_in'] },
      startAt: { $lt: requestedEnd },
      endAt: { $gt: requestedStart },
    }).lean();
  }

  // 4. Pre-fetch 30-day historical bookings for Part 11 Smart Resource Rescue classification
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

  // 5. Evaluate and score each resource
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
    // Defense-in-depth: Exclude suspended owners
    if (resource.owner && (resource.owner.status === 'suspended' || resource.owner.isSuspended === true)) {
      continue;
    }

    // Defense-in-depth: Exclude self-booking
    if (requestingUserId) {
      const ownerId = resource.owner?._id?.toString() || resource.owner?.toString();
      if (ownerId && ownerId === requestingUserId) {
        continue;
      }
    }

    // Defense-in-depth: Exclude maintenance
    if (resource.availabilityStatus === 'maintenance') {
      continue;
    }

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
        subcategory: resource.subcategory || '',
        academicMetadata: resource.academicMetadata || {},
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
      matchEntry.explanations.push('Smart Resource Rescue: Underutilized asset (<20% booked in last 30 days).');
    }

    // Direct match criteria: sufficient capacity and score threshold
    if (hasSufficientCapacity && score >= 25) {
      scoredMatches.push(matchEntry);
    } else {
      // Store potential alternative candidate with clear, distinct constraint reason
      let constraintReason = 'Eligible alternative with lower category/location relevance';
      if (!hasSufficientCapacity) {
        if (requestedStart && requestedEnd) {
          constraintReason = `Capacity unavailable for requested time window (${capacityInfo.currentlyBooked}/${capacityInfo.totalCapacity} units reserved)`;
        } else if (capacityInfo.availableCapacity < parsedQuantity) {
          constraintReason = `Capacity unavailable for requested quantity (${parsedQuantity} requested vs ${capacityInfo.availableCapacity}/${capacityInfo.totalCapacity} units free)`;
        } else {
          constraintReason = 'Capacity unavailable: resource is currently marked unavailable';
        }
      } else if (score < 25) {
        constraintReason = 'Eligible alternative with lower category/location relevance';
      }

      alternativeCandidates.push({
        ...matchEntry,
        isAlternative: true,
        constraintReason,
      });
    }
  }

  // 6. Deterministic Sorting & Tie-Breaking
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
      inferredCategory: parsedSignals.inferredCategory,
      inferredSubcategories: parsedSignals.inferredSubcategories,
      inferredSubcategory: parsedSignals.inferredSubcategory,
      inferredAcademic: parsedSignals.inferredAcademic,
      itemKeywords: parsedSignals.itemKeywords,
      inferredQuantity: parsedSignals.inferredQuantity,
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
  SUBCATEGORY_MAPPINGS,
  BRANCH_PATTERNS,
  SUBJECT_KEYWORDS,
  SPECIFIC_ITEMS,
  LOCATION_KEYWORDS,
  INTENT_TERMS,
};
