/**
 * Part 13 Need-First Smart Resource Matching Test Suite
 * Resource Sharing Platform — CodeHack India 2026
 *
 * Verifies:
 * 1. Natural language need parser (synonym mapping, location clues, activity intents, resourceType inference)
 * 2. Explicit form selections overriding parsed text signals
 * 3. Exact capacity and interval overlap calculations (reusing Part 5 logic)
 * 4. Cancelled and rejected bookings do not block capacity
 * 5. Deterministic 0-100 scoring model, normalization, and truthfulness of explanations
 * 6. Hard eligibility & moderation filtering (hidden, flagged, maintenance excluded)
 * 7. Self-booking exclusion (owners cannot match their own resources)
 * 8. Validation of dates, times, and quantities (past dates, start >= end, quantity bounds)
 * 9. Part 11 Smart Resource Rescue integration (underused badges and secondary tie-breaking)
 * 10. Alternative recommendations generation when exact constraints fail
 * 11. No duplicates in match or alternative results
 * 12. Database disconnection (503 Service Unavailable) offline guards
 * 13. Public / optional authentication handling
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const User = require('../models/User');

const {
  parseNeedDescription,
  calculateAvailableCapacity,
  scoreResourceMatch,
  findSmartMatches,
  CATEGORY_SYNONYMS,
} = require('../services/matchingService');

const {
  matchNeeds,
  parseNeed,
} = require('../controllers/recommendationController');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

function createMockReqRes({
  method = 'POST',
  url = '/api/recommendations/match',
  query = {},
  params = {},
  headers = {},
  body = {},
  user = null,
} = {}) {
  const req = {
    method,
    url,
    query: { ...query },
    params: { ...params },
    headers: { ...headers },
    body: { ...body },
    user,
    originalUrl: url,
  };

  let statusCode = 200;
  let jsonResponse = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonResponse() {
      return jsonResponse;
    },
  };

  return { req, res };
}

async function runMatchingTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 13 Need-First Smart Matching Test Suite');
  console.log('====================================================\n');

  // Test identities
  const studentUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Aarav Patel (Student)',
    email: 'apatel@university.edu',
    role: 'user',
  };

  const labAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Dr. Sharma (Lab Custodian)',
    email: 'sharma@university.edu',
    role: 'user',
  };

  // --- Test Suite 1: Rule-Based Need Parsing Engine ---
  console.log('--- Test Suite 1: Rule-Based Need Parsing Engine ---');

  // 1. Camera synonym extraction
  const cameraParse = parseNeedDescription('I need a high-end DSLR and a tripod for college fest recording');
  assert(cameraParse.inferredCategories.includes('Cameras'), 'Parser extracts "Cameras" category from "DSLR" and "tripod"');
  assert(cameraParse.inferredIntents.includes('recording'), 'Parser identifies activity intent "recording"');
  assert(cameraParse.inferredResourceType === 'equipment', 'Parser infers resourceType as "equipment"');

  // 2. Computers & coding synonym extraction
  const compParse = parseNeedDescription('Looking for a GPU workstation or laptop for coding and simulations');
  assert(compParse.inferredCategories.includes('Computers'), 'Parser extracts "Computers" from "GPU workstation" and "laptop"');
  assert(compParse.inferredIntents.includes('coding'), 'Parser extracts "coding" intent');

  // 3. Testing Equipment synonym extraction
  const testEquipParse = parseNeedDescription('Oscilloscope and signal generator for hardware frequency test');
  assert(testEquipParse.inferredCategories.includes('Testing Equipment'), 'Parser extracts "Testing Equipment" from "oscilloscope"');
  assert(testEquipParse.inferredIntents.includes('testing'), 'Parser extracts "testing" intent');

  // 4. Meeting rooms & spaces extraction
  const spaceParse = parseNeedDescription('Need a quiet conference room for a project presentation tomorrow at North Campus');
  assert(spaceParse.inferredCategories.includes('Meeting Rooms'), 'Parser extracts "Meeting Rooms" from "conference room"');
  assert(spaceParse.inferredLocations.includes('North Campus'), 'Parser extracts "North Campus" location');
  assert(spaceParse.inferredResourceType === 'space', 'Parser infers "space" facility type');

  // 5. Clean handling of ambiguous / empty input
  const emptyParse = parseNeedDescription('');
  assert(Array.isArray(emptyParse.inferredCategories) && emptyParse.inferredCategories.length === 0, 'Empty string produces empty inferred category array without error');
  assert(emptyParse.tokens.length === 0, 'Empty string produces zero tokens');

  // --- Test Suite 2: Real-Time Availability & Overlap Capacity Engine ---
  console.log('\n--- Test Suite 2: Real-Time Availability & Overlap Capacity Engine ---');

  const sampleResource = {
    _id: new mongoose.Types.ObjectId(),
    quantity: 3,
  };

  const slotStart = new Date('2026-11-01T10:00:00Z');
  const slotEnd = new Date('2026-11-01T14:00:00Z');

  // 1. Fully available resource (no bookings)
  const cap1 = calculateAvailableCapacity(sampleResource, [], slotStart, slotEnd);
  assert(cap1.totalCapacity === 3, 'Total capacity reflects resource quantity (3 units)');
  assert(cap1.availableCapacity === 3, 'Available capacity is 3 when no bookings exist');
  assert(cap1.isFullyAvailable === true, 'Resource is marked isFullyAvailable: true');
  assert(cap1.hasOverlap === false, 'hasOverlap is false with zero bookings');

  // 2. Partially booked resource (1 of 3 booked)
  const activeBookings = [
    {
      resource: sampleResource._id,
      status: 'approved',
      quantity: 1,
      startAt: new Date('2026-11-01T09:00:00Z'),
      endAt: new Date('2026-11-01T12:00:00Z'), // Overlaps slotStart (10:00) to 12:00
    },
  ];
  const cap2 = calculateAvailableCapacity(sampleResource, activeBookings, slotStart, slotEnd);
  assert(cap2.currentlyBooked === 1, 'Calculates 1 unit currently booked during overlapping period');
  assert(cap2.availableCapacity === 2, 'Available capacity correctly reduced to 2 units (3 - 1)');
  assert(cap2.hasOverlap === true, 'hasOverlap is true');

  // 3. Fully booked resource (all 3 units booked)
  const fullBookings = [
    {
      resource: sampleResource._id,
      status: 'approved',
      quantity: 2,
      startAt: new Date('2026-11-01T10:00:00Z'),
      endAt: new Date('2026-11-01T14:00:00Z'),
    },
    {
      resource: sampleResource._id,
      status: 'checked_in', // Active in-use booking reserves capacity
      quantity: 1,
      startAt: new Date('2026-11-01T11:00:00Z'),
      endAt: new Date('2026-11-01T13:00:00Z'),
    },
  ];
  const cap3 = calculateAvailableCapacity(sampleResource, fullBookings, slotStart, slotEnd);
  assert(cap3.currentlyBooked === 3, 'Total 3 units booked (approved + checked_in)');
  assert(cap3.availableCapacity === 0, 'Available capacity is 0 when fully occupied');
  assert(cap3.isFullyAvailable === false, 'isFullyAvailable is false when 0 units remain');

  // 4. Cancelled and rejected bookings DO NOT reduce available capacity
  const inactiveBookings = [
    {
      resource: sampleResource._id,
      status: 'cancelled',
      quantity: 2,
      startAt: slotStart,
      endAt: slotEnd,
    },
    {
      resource: sampleResource._id,
      status: 'rejected',
      quantity: 1,
      startAt: slotStart,
      endAt: slotEnd,
    },
  ];
  const cap4 = calculateAvailableCapacity(sampleResource, inactiveBookings, slotStart, slotEnd);
  assert(cap4.availableCapacity === 3, 'Cancelled and rejected bookings do not consume capacity (3 units free)');

  // 5. Adjacent booking (touching start/end without overlapping) does NOT reduce capacity
  const adjacentBookings = [
    {
      resource: sampleResource._id,
      status: 'approved',
      quantity: 3,
      startAt: new Date('2026-11-01T08:00:00Z'),
      endAt: new Date('2026-11-01T10:00:00Z'), // Ends exactly when requested slot begins
    },
  ];
  const cap5 = calculateAvailableCapacity(sampleResource, adjacentBookings, slotStart, slotEnd);
  assert(cap5.availableCapacity === 3, 'Adjacent boundary bookings ([08:00-10:00] and [10:00-14:00]) do not overlap');

  // --- Test Suite 3: Deterministic Explainable Scoring Model ---
  console.log('\n--- Test Suite 3: Deterministic Explainable Scoring Model ---');

  const testResource = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Sony Alpha A7 IV Full-Frame Mirrorless DSLR',
    description: 'Professional high-resolution full-frame camera kit with 28-70mm lens and tripod for video and photo shoots.',
    category: 'Cameras',
    resourceType: 'equipment',
    location: { campus: 'North Campus', building: 'Physics Hall', room: '104' },
    quantity: 2,
  };

  const parsedNeed = parseNeedDescription('I need a camera with tripod for campus fest recording at North Campus');
  const availableCap = { totalCapacity: 2, currentlyBooked: 0, availableCapacity: 2 };

  // 1. Scoring exact match
  const scoreResult1 = scoreResourceMatch(
    testResource,
    { category: 'Cameras', location: 'North Campus', quantity: 1 },
    parsedNeed,
    availableCap
  );
  assert(scoreResult1.score >= 80, `Exact match achieves high score (${scoreResult1.score}/100)`);
  assert(scoreResult1.score <= 100, 'Score is normalized and does not exceed 100');
  assert(scoreResult1.explanations.length >= 3, 'Generates multiple truthful explanations');
  assert(
    scoreResult1.explanations.some((e) => e.includes('Exact category match')),
    'Includes exact category match explanation'
  );
  assert(
    scoreResult1.explanations.some((e) => e.includes('target campus')),
    'Includes location match explanation'
  );

  // 2. Mismatched category scoring
  const scoreResult2 = scoreResourceMatch(
    { ...testResource, category: 'Study Spaces', location: { campus: 'South Campus' } },
    { category: 'Cameras', location: 'North Campus', quantity: 1 },
    parsedNeed,
    availableCap
  );
  assert(scoreResult2.score < scoreResult1.score, 'Mismatched category and campus receives lower score');

  // --- Test Suite 4: Database Disconnection (503) Offline Guard ---
  console.log('\n--- Test Suite 4: Database Disconnection (503) Offline Guard ---');

  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const { req: offReq, res: offRes } = createMockReqRes({
    body: { description: 'Need DSLR camera for recording' },
  });
  await matchNeeds(offReq, offRes);
  assert(offRes.statusCode === 503, 'POST /api/recommendations/match returns 503 when MongoDB is offline');

  // Restore simulated online state
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // --- Test Suite 5: Full Smart Match Integration Simulation ---
  console.log('\n--- Test Suite 5: Full Smart Match Integration Simulation ---');

  // In-memory repositories for simulated database queries
  const resourceRepo = new Map();
  const bookingRepo = new Map();

  const fixtureOwner = new mongoose.Types.ObjectId();

  const res1CameraNorth = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_camera_north',
    title: 'Sony Alpha DSLR Camera Kit',
    description: 'High-resolution mirrorless DSLR camera with tripod, optimal for college events, presentations, and video shoots.',
    category: 'Cameras',
    resourceType: 'equipment',
    location: { campus: 'North Campus', building: 'Media Center', room: '101' },
    quantity: 2,
    availabilityStatus: 'available',
    moderationStatus: 'approved',
    owner: fixtureOwner,
    createdAt: new Date(Date.now() - 40 * 24 * 3600000), // 40 days old
  };

  const res2WorkstationSouth = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_workstation_south',
    title: 'Dell Precision High-Performance Workstation',
    description: 'Dual GPU computing workstation with PyTorch and CUDA for deep learning and simulations.',
    category: 'Computers',
    resourceType: 'equipment',
    location: { campus: 'South Campus', building: 'CS Block', room: '302' },
    quantity: 4,
    availabilityStatus: 'available',
    moderationStatus: 'approved',
    owner: fixtureOwner,
    createdAt: new Date(Date.now() - 40 * 24 * 3600000),
  };

  const res3MeetingCentral = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_meeting_central',
    title: 'Executive Conference & Meeting Room',
    description: 'Conference room equipped with projector and whiteboard for team presentations and discussions.',
    category: 'Meeting Rooms',
    resourceType: 'space',
    location: { campus: 'Central Campus', building: 'Student Union', room: '204' },
    quantity: 1,
    availabilityStatus: 'available',
    moderationStatus: 'approved',
    owner: studentUser._id, // Owned by studentUser (to test self-booking exclusion)
    createdAt: new Date(Date.now() - 40 * 24 * 3600000),
  };

  const res4MaintenanceCamera = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_camera_maint',
    title: 'Canon EOS 80D Camera',
    description: 'Camera currently under sensor calibration maintenance.',
    category: 'Cameras',
    resourceType: 'equipment',
    location: { campus: 'North Campus' },
    quantity: 1,
    availabilityStatus: 'maintenance', // Maintenance: should be excluded
    moderationStatus: 'approved',
    owner: fixtureOwner,
    createdAt: new Date(Date.now() - 40 * 24 * 3600000),
  };

  const res5HiddenCamera = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_camera_hidden',
    title: 'Flagged / Hidden Camera Kit',
    description: 'Camera hidden due to moderation audit.',
    category: 'Cameras',
    resourceType: 'equipment',
    location: { campus: 'North Campus' },
    quantity: 1,
    availabilityStatus: 'available',
    moderationStatus: 'hidden', // Hidden: should be excluded
    owner: fixtureOwner,
    createdAt: new Date(Date.now() - 40 * 24 * 3600000),
  };

  const testResources = [res1CameraNorth, res2WorkstationSouth, res3MeetingCentral, res4MaintenanceCamera, res5HiddenCamera];
  testResources.forEach((r) => resourceRepo.set(r._id.toString(), r));

  // Mock Resource.find
  Resource.find = function (filter = {}) {
    let results = Array.from(resourceRepo.values());

    if (filter.moderationStatus) {
      results = results.filter((r) => r.moderationStatus === filter.moderationStatus);
    }
    if (filter.availabilityStatus && filter.availabilityStatus.$ne) {
      results = results.filter((r) => r.availabilityStatus !== filter.availabilityStatus.$ne);
    }
    if (filter.owner && filter.owner.$ne) {
      results = results.filter((r) => r.owner.toString() !== filter.owner.$ne.toString());
    }

    const queryObj = {
      populate: function () {
        return queryObj;
      },
      lean: function () {
        return Promise.resolve(results);
      },
      then: function (resolve, reject) {
        return Promise.resolve(results).then(resolve, reject);
      },
    };
    return queryObj;
  };

  // Mock Booking.find
  Booking.find = function (filter = {}) {
    let results = Array.from(bookingRepo.values());

    if (filter.status && filter.status.$in) {
      results = results.filter((b) => filter.status.$in.includes(b.status));
    }

    const queryObj = {
      populate: function () {
        return queryObj;
      },
      lean: function () {
        return Promise.resolve(results);
      },
      then: function (resolve, reject) {
        return Promise.resolve(results).then(resolve, reject);
      },
    };
    return queryObj;
  };

  // 1. Exact match test: natural language camera search
  const matchResult1 = await findSmartMatches({
    description: 'I need a DSLR camera with tripod for campus fest recording tomorrow at North Campus',
    startAt: '2026-11-02T10:00:00Z',
    endAt: '2026-11-02T14:00:00Z',
    quantity: 1,
  });

  assert(matchResult1.matches.length > 0, 'Finds at least one match for camera query');
  assert(matchResult1.matches[0].resource.category === 'Cameras', 'Top ranked match is in Cameras category');
  assert(matchResult1.matches[0].resource.location.campus === 'North Campus', 'Top ranked match is located on North Campus');
  assert(matchResult1.matches[0].matchScore >= 80, 'Top match achieves score >= 80');

  // 2. Explicit form selection overrides ambiguous text
  // Text says "camera", but explicit category is "Computers"
  const overrideResult = await findSmartMatches({
    description: 'I need camera accessories',
    category: 'Computers', // Explicit override
  });

  assert(overrideResult.matches.length > 0, 'Override search returns results');
  assert(
    overrideResult.matches[0].resource.category === 'Computers',
    'Explicit category "Computers" takes strict precedence over text mention of "camera"'
  );

  // 3. Maintenance and Hidden resources are excluded
  const allMatchedIds = matchResult1.matches.map((m) => m.resource._id.toString());
  assert(!allMatchedIds.includes(res4MaintenanceCamera._id.toString()), 'Resource under maintenance is strictly excluded');
  assert(!allMatchedIds.includes(res5HiddenCamera._id.toString()), 'Hidden / moderated resource is strictly excluded');

  // 4. Self-booking exclusion: owner cannot receive their own resource as a valid match
  const selfMatchResult = await findSmartMatches(
    { description: 'conference room for presentation' },
    studentUser // studentUser owns res3MeetingCentral
  );
  const selfMatchedIds = selfMatchResult.matches.map((m) => m.resource._id.toString());
  assert(
    !selfMatchedIds.includes(res3MeetingCentral._id.toString()),
    'Resource owned by requesting user is strictly excluded (self-booking prevention)'
  );

  // 5. Overlapping bookings capacity enforcement
  // Add confirmed booking occupying both units of res1CameraNorth for 2026-11-03
  const conflictBooking = {
    _id: new mongoose.Types.ObjectId(),
    resource: res1CameraNorth._id,
    status: 'approved',
    quantity: 2, // Consumes all 2 units
    startAt: new Date('2026-11-03T10:00:00Z'),
    endAt: new Date('2026-11-03T14:00:00Z'),
  };
  bookingRepo.set(conflictBooking._id.toString(), conflictBooking);

  const capacityMatchResult = await findSmartMatches({
    description: 'camera for photoshoot',
    category: 'Cameras',
    startAt: '2026-11-03T10:00:00Z',
    endAt: '2026-11-03T14:00:00Z',
    quantity: 1,
  });

  const capMatchedIds = capacityMatchResult.matches.map((m) => m.resource._id.toString());
  assert(
    !capMatchedIds.includes(res1CameraNorth._id.toString()),
    'Resource with 100% overlapping booking capacity is excluded from direct available matches'
  );

  // 6. Conflicted resource is returned in alternative recommendations with clear reason
  const altIds = capacityMatchResult.alternatives.map((a) => a.resource._id.toString());
  assert(
    altIds.includes(res1CameraNorth._id.toString()),
    'Fully booked resource is offered in alternative recommendations'
  );
  const altEntry = capacityMatchResult.alternatives.find((a) => a.resource._id.toString() === res1CameraNorth._id.toString());
  assert(
    altEntry.constraintReason.includes('Capacity unavailable'),
    'Alternative identifies capacity constraint reason truthfully'
  );

  // 7. Validation: Past start date rejected
  try {
    await findSmartMatches({
      description: 'camera',
      startAt: '2020-01-01T10:00:00Z',
      endAt: '2020-01-01T14:00:00Z',
    });
    assert(false, 'Should throw error for past dates');
  } catch (err) {
    assert(err.message.includes('past'), 'Rejects booking start time in the past');
  }

  // 8. Validation: End before start rejected
  try {
    const futureDate = new Date(Date.now() + 86400000);
    const earlierFutureDate = new Date(Date.now() + 43200000);
    await findSmartMatches({
      description: 'camera',
      startAt: futureDate.toISOString(),
      endAt: earlierFutureDate.toISOString(),
    });
    assert(false, 'Should throw error when end time is before start time');
  } catch (err) {
    assert(err.message.includes('strictly after'), 'Rejects end time earlier than start time');
  }

  // 9. Validation: Invalid quantity (>1000) rejected
  try {
    await findSmartMatches({
      description: 'camera',
      quantity: 5000,
    });
    assert(false, 'Should throw error for excessive quantity');
  } catch (err) {
    assert(err.message.includes('exceeds maximum limit'), 'Rejects quantity exceeding 1000');
  }

  // 10. Part 11 Smart Resource Rescue badge
  // Res1 has 0 bookings in the last 30 days, so utilization is <20% (underused)
  const rescueMatch = matchResult1.matches.find((m) => m.resource._id.toString() === res1CameraNorth._id.toString());
  assert(rescueMatch && rescueMatch.isUnderused === true, 'Part 11 Smart Resource Rescue classifies 0-booking resource as isUnderused: true');
  assert(
    rescueMatch.explanations.some((e) => e.includes('Smart Resource Rescue')),
    'Includes Smart Resource Rescue explanation badge'
  );

  // 11. No duplicates in results
  const resultIds = matchResult1.matches.map((m) => m.resource._id.toString());
  const uniqueResultIds = Array.from(new Set(resultIds));
  assert(resultIds.length === uniqueResultIds.length, 'Results list contains zero duplicate resources');

  // --- Test Suite 6: Controller Validation & HTTP Contract ---
  console.log('\n--- Test Suite 6: Controller Validation & HTTP Contract ---');

  // 1. Controller rejects empty search (no description, category, or location)
  const { req: emptyReq, res: emptyRes } = createMockReqRes({
    body: {},
  });
  await matchNeeds(emptyReq, emptyRes);
  assert(emptyRes.statusCode === 400, 'POST /api/recommendations/match returns 400 when no search criteria provided');

  // 2. Controller returns valid 200 payload
  const { req: validReq, res: validRes } = createMockReqRes({
    body: { description: 'high performance workstation for simulations' },
  });
  await matchNeeds(validReq, validRes);
  assert(validRes.statusCode === 200, 'POST /api/recommendations/match returns 200 OK for valid query');
  assert(validRes.jsonResponse.success === true, 'Response contains success: true');
  assert(Array.isArray(validRes.jsonResponse.data), 'Response data is an array of matches');
  assert(typeof validRes.jsonResponse.count === 'number', 'Response contains count property');
  assert(validRes.jsonResponse.query !== undefined, 'Response echoes query criteria');

  // 3. Controller parse-need endpoint
  const { req: parseReq, res: parseRes } = createMockReqRes({
    body: { text: 'I need a DSLR camera for college event tomorrow at North Campus' },
  });
  await parseNeed(parseReq, parseRes);
  assert(parseRes.statusCode === 200, 'POST /api/recommendations/parse-need returns 200 OK');
  assert(parseRes.jsonResponse.data.inferredCategories.includes('Cameras'), 'parse-need extracts Cameras category');

  // --- Test Suite 7: Phase 3 Student Need Matching & Academic Intelligence ---
  console.log('\n--- Test Suite 7: Phase 3 Student Need Matching & Academic Intelligence ---');

  // 1. Natural Language Scenario: Scientific calculator for exam
  const calcNeed = parseNeedDescription('I need a scientific calculator for my maths exam tomorrow');
  assert(calcNeed.inferredCategory === 'Student Essentials', 'Extracts Student Essentials for calculator query');
  assert(calcNeed.itemKeywords.includes('Scientific Calculator'), 'Extracts "Scientific Calculator" specific item');
  assert(calcNeed.inferredAcademic.subject === 'Mathematics & Calculus', 'Extracts "Mathematics & Calculus" academic subject');
  assert(calcNeed.inferredIntents.includes('exam'), 'Extracts "exam" activity intent');

  // 2. Natural Language Scenario: DSA textbook for CSE semester 3
  const dsaNeed = parseNeedDescription('Looking for a second-hand DSA textbook for CSE semester 3');
  assert(dsaNeed.inferredCategory === 'Books & Study Materials', 'Extracts Books & Study Materials for DSA query');
  assert(dsaNeed.inferredAcademic.branch === 'CSE', 'Extracts "CSE" academic branch');
  assert(dsaNeed.inferredAcademic.semester === 'Semester 3', 'Extracts "Semester 3" academic semester');
  assert(dsaNeed.inferredAcademic.subject === 'Data Structures & Algorithms', 'Extracts "Data Structures & Algorithms" subject');

  // 3. Natural Language Scenario: Mini drafter and drawing board
  const drafterNeed = parseNeedDescription('Need a mini drafter and drawing board for engineering drawing');
  assert(drafterNeed.inferredCategory === 'Design, Drawing & Architecture', 'Extracts Design, Drawing & Architecture');
  assert(drafterNeed.itemKeywords.includes('Mini Drafter'), 'Extracts "Mini Drafter" item');
  assert(drafterNeed.itemKeywords.includes('Drawing Board'), 'Extracts "Drawing Board" item');
  assert(drafterNeed.inferredAcademic.subject === 'Engineering Drawing & Graphics', 'Extracts Engineering Drawing subject');

  // 4. Natural Language Scenario: Laptop for project
  const laptopNeed = parseNeedDescription('I need a laptop for a project');
  assert(laptopNeed.inferredCategory === 'Computers', 'Extracts Computers for laptop query');
  assert(laptopNeed.inferredResourceType === 'equipment', 'Infers resourceType "equipment"');
  assert(laptopNeed.inferredIntents.includes('project'), 'Extracts "project" activity intent');

  // 5. Natural Language Scenario: Lab equipment near campus
  const labNeed = parseNeedDescription('Looking for lab equipment near my campus');
  assert(labNeed.inferredCategories.includes('Laboratories'), 'Extracts Laboratories category for lab equipment');
  assert(labNeed.inferredLocations.includes('Main Academic Campus'), 'Extracts "Main Academic Campus" from "near my campus"');

  // 6. Natural Language Scenario: Quantity extraction
  const qtyNeed = parseNeedDescription('Need 3 mini drafters for the graphics workshop');
  assert(qtyNeed.inferredQuantity === 3, 'Extracts quantity 3 from "Need 3 mini drafters"');

  // 7. Academic Metadata Scoring Boosting
  const dsaBookResource = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_dsa_cormen',
    title: 'Introduction to Algorithms (CLRS)',
    description: 'Comprehensive DSA textbook covering algorithms, data structures, graphs, and sorting.',
    category: 'Books & Study Materials',
    subcategory: 'Engineering Textbooks',
    academicMetadata: {
      subject: 'Data Structures & Algorithms',
      branch: 'Computer Science & Engineering (CSE)',
      semester: 'Semester 3',
      bookTitle: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
    },
    location: { campus: 'Main Academic Campus' },
    quantity: 3,
  };

  const dsaScoreResult = scoreResourceMatch(
    dsaBookResource,
    { category: 'Books & Study Materials', quantity: 1 },
    dsaNeed,
    { totalCapacity: 3, currentlyBooked: 0, availableCapacity: 3 }
  );

  assert(dsaScoreResult.score >= 80, `DSA resource achieves high match score (${dsaScoreResult.score}/100)`);
  assert(
    dsaScoreResult.explanations.some((e) => e.includes('Data Structures & Algorithms')),
    'Includes explanation for academic subject match'
  );
  assert(
    dsaScoreResult.explanations.some((e) => e.includes('Computer Science & Engineering')),
    'Includes explanation for academic branch match'
  );
  assert(
    dsaScoreResult.explanations.some((e) => e.includes('Semester 3')),
    'Includes explanation for academic semester match'
  );

  // 8. Grounded, Non-Fabricated Explanations Assertion
  // Strict rule: Zero fake ratings, zero fake popularity, zero synthetic savings
  const forbiddenPatterns = ['stars', 'rated', 'savings', 'trust score', 'popularity rank', 'saved $'];
  const hasFabricatedExplanation = dsaScoreResult.explanations.some((exp) =>
    forbiddenPatterns.some((pattern) => exp.toLowerCase().includes(pattern))
  );
  assert(!hasFabricatedExplanation, 'Recommendations contain strictly zero fabricated ratings, trust scores, or synthetic savings');

  // 9. Hard Eligibility: Suspended Owner Exclusion
  const suspendedOwnerId = new mongoose.Types.ObjectId();
  const resSuspendedOwner = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_suspended_owner',
    title: 'Casio fx-991ES Plus Scientific Calculator',
    description: 'High precision scientific calculator for engineering examinations.',
    category: 'Student Essentials',
    subcategory: 'Calculators',
    location: { campus: 'Main Academic Campus' },
    quantity: 2,
    availabilityStatus: 'available',
    moderationStatus: 'approved',
    owner: {
      _id: suspendedOwnerId,
      name: 'Suspended Student',
      email: 'suspended@campus.edu',
      status: 'suspended',
      isSuspended: true,
    },
    createdAt: new Date(),
  };

  resourceRepo.set(resSuspendedOwner._id.toString(), resSuspendedOwner);

  const suspendedTestResult = await findSmartMatches({
    description: 'I need a scientific calculator for maths exam',
    category: 'Student Essentials',
  });
  const matchedResourceIds = suspendedTestResult.matches.map((m) => m.resource.id);
  const altResourceIds = suspendedTestResult.alternatives.map((a) => a.resource.id);
  assert(
    !matchedResourceIds.includes(resSuspendedOwner.id) && !altResourceIds.includes(resSuspendedOwner.id),
    'Resources owned by suspended users are strictly excluded from both matches and alternatives'
  );

  // Clean up fixture
  resourceRepo.delete(resSuspendedOwner._id.toString());

  // 10. Multi-unit booking capacity constraint and alternative diversion
  const multiUnitCalc = {
    _id: new mongoose.Types.ObjectId(),
    id: 'res_multi_calc',
    title: 'Casio Scientific Calculator Kit',
    description: 'Calculators for mathematics examinations and tutorials.',
    category: 'Student Essentials',
    subcategory: 'Calculators',
    location: { campus: 'Main Academic Campus' },
    quantity: 5, // 5 units total
    availabilityStatus: 'available',
    moderationStatus: 'approved',
    owner: fixtureOwner,
    createdAt: new Date(),
  };
  resourceRepo.set(multiUnitCalc._id.toString(), multiUnitCalc);

  // Add 3 bookings consuming 3 of the 5 units for slot
  const calcBooking = {
    _id: new mongoose.Types.ObjectId(),
    resource: multiUnitCalc._id,
    status: 'approved',
    quantity: 3,
    startAt: new Date('2026-11-04T10:00:00Z'),
    endAt: new Date('2026-11-04T14:00:00Z'),
  };
  bookingRepo.set(calcBooking._id.toString(), calcBooking);

  // Request 2 units (available = 5 - 3 = 2 units) -> Should match!
  const fitResult = await findSmartMatches({
    description: 'scientific calculator for maths',
    category: 'Student Essentials',
    startAt: '2026-11-04T10:00:00Z',
    endAt: '2026-11-04T14:00:00Z',
    quantity: 2,
  });
  const fitMatch = fitResult.matches.find((m) => m.resource._id.toString() === multiUnitCalc._id.toString());
  assert(fitMatch !== undefined, 'Multi-unit resource with 2 remaining units matches request for 2 units');
  assert(fitMatch && fitMatch.capacity.availableCapacity === 2, 'Available capacity reflects 2 units remaining');

  // Request 3 units (available = 2 < 3) -> Should be diverted to alternatives!
  const overResult = await findSmartMatches({
    description: 'scientific calculator for maths',
    category: 'Student Essentials',
    startAt: '2026-11-04T10:00:00Z',
    endAt: '2026-11-04T14:00:00Z',
    quantity: 3,
  });
  const overMatch = overResult.matches.find((m) => m.resource._id.toString() === multiUnitCalc._id.toString());
  const overAlt = overResult.alternatives.find((a) => a.resource._id.toString() === multiUnitCalc._id.toString());
  assert(overMatch === undefined, 'Resource with insufficient capacity (2 available vs 3 requested) excluded from direct matches');
  assert(overAlt !== undefined, 'Capacity-constrained resource diverted to alternative recommendations');
  assert(overAlt && overAlt.constraintReason.includes('Capacity unavailable'), 'Alternative carries truthful capacity constraint explanation');

  // Clean up
  resourceRepo.delete(multiUnitCalc._id.toString());
  bookingRepo.delete(calcBooking._id.toString());

  // --- Test Suite 8: Security, Sanitization & Edge-Case Regressions ---
  console.log('\n--- Test Suite 8: Security, Sanitization & Edge-Case Regressions ---');

  // 1. NoSQL operator injection in description safely neutralized
  const { req: injReq, res: injRes } = createMockReqRes({
    body: { description: { $ne: null } },
  });
  await matchNeeds(injReq, injRes);
  assert(injRes.statusCode === 400, 'Rejects NoSQL operator object in description and returns 400 Bad Request');

  // 2. NoSQL operator injection in parse-need text safely neutralized
  const { req: injParseReq, res: injParseRes } = createMockReqRes({
    body: { text: { $gt: '' } },
  });
  await parseNeed(injParseReq, injParseRes);
  assert(injParseRes.statusCode === 200, 'parseNeed safely handles non-string object without crashing');
  assert(injParseRes.jsonResponse.data.tokens.length === 0, 'Non-string payload produces empty token array safely');

  // 3. Overlong description (> 1000 chars) bounded safely to 500 chars
  const superLongDesc = 'I need a scientific calculator for maths exam '.repeat(30);
  const overlongParse = parseNeedDescription(superLongDesc);
  assert(overlongParse.rawText.length > 500, 'Raw text reflects long input');
  assert(overlongParse.inferredCategory === 'Student Essentials', 'Overlong input parses category safely');

  // 4. Semester number is NOT misinterpreted as quantity
  const semCheck = parseNeedDescription('Looking for a second-hand DSA textbook for CSE semester 3');
  assert(semCheck.inferredQuantity === null, 'Semester 3 is NOT misinterpreted as quantity 3');

  // 5. Academic year is NOT misinterpreted as quantity
  const yrCheck = parseNeedDescription('Need notes for 2nd year civil engineering');
  assert(yrCheck.inferredQuantity === null, '2nd year is NOT misinterpreted as quantity 2');

  // 6. Model numbers are NOT misinterpreted as quantity
  const modelCheck = parseNeedDescription('looking for casio fx-991 calculator');
  assert(modelCheck.inferredQuantity === null, 'Model number 991 is NOT misinterpreted as quantity 991');

  // 7. Empty query returns clean 400 response
  const { req: blankReq, res: blankRes } = createMockReqRes({
    body: { description: '   ' },
  });
  await matchNeeds(blankReq, blankRes);
  assert(blankRes.statusCode === 400, 'Whitespace-only description returns 400 Bad Request');

  // --- Final Results ---
  console.log('\n====================================================');
  console.log(`Part 13 Test Summary: Passed: ${testsPassed}, Failed: ${testsFailed}`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runMatchingTestSuite().catch((err) => {
  console.error('Fatal error in matching test suite:', err);
  process.exit(1);
});

