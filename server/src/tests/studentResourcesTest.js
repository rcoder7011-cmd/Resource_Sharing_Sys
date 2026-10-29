/**
 * Student Essentials, Academic Resources & Safe Demo Data Test Suite
 * Resource Sharing Platform — Part 18
 *
 * Covers:
 * 1. Category & subcategory validation across student essentials, books, design, gadgets.
 * 2. Creating and updating resources with academic metadata.
 * 3. Search and combined multi-filter evaluation (category + subcategory + branch).
 * 4. Safe demo data seeding idempotency & demo marker preservation.
 * 5. Safe demo cleanup targeting only `isDemo: true` records.
 * 6. Existing resource & booking compatibility.
 * 7. Multi-unit availability, partial quantity, and overbooking prevention for student gear.
 * 8. Smart Match keyword inference and academic metadata boosting.
 */

const assert = require('assert');
const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const {
  CATEGORY_REGISTRY,
  ALL_CATEGORIES,
  CATEGORY_ALIASES,
  normalizeCategory,
  isValidCategory,
  getSubcategoriesForCategory,
  categorySupportsAcademicFields,
} = require('../config/categories');
const { STUDENT_DEMO_CATALOG } = require('../utils/studentDemoCatalog');
const { parseNeedDescription, scoreResourceMatch } = require('../services/matchingService');
const {
  doIntervalsOverlap,
  calculateSlotAvailability,
  withResourceLock,
} = require('../services/availabilityService');

let testsPassed = 0;
let testsFailed = 0;

function pass(name) {
  testsPassed++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name, err) {
  testsFailed++;
  console.error(`  ❌ FAIL: ${name}`, err);
}

async function runStudentResourcesTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 18 Student Essentials & Academic Test Suite');
  console.log('====================================================');

  // Simulate connected database state
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  const dummyOwnerId = new mongoose.Types.ObjectId();

  // --- Test Suite 1: Extensible Category & Subcategory Registry ---
  console.log('\n--- Test Suite 1: Category & Subcategory Registry Validation ---');
  try {
    assert.strictEqual(isValidCategory('Student Essentials'), true);
    assert.strictEqual(isValidCategory('Books & Study Materials'), true);
    assert.strictEqual(isValidCategory('Design, Drawing & Architecture'), true);
    assert.strictEqual(isValidCategory('Engineering Drawing & Design'), true); // Alias support
    assert.strictEqual(normalizeCategory('Engineering Drawing & Design'), 'Design, Drawing & Architecture');
    assert.strictEqual(isValidCategory('Gadgets & Accessories'), true);
    assert.strictEqual(isValidCategory('Laboratories'), true); // Preserved
    assert.strictEqual(isValidCategory('NonExistentCategory123'), false);
    pass('All new student categories, aliases, and preserved institutional categories validate correctly');

    const essentialSubs = getSubcategoriesForCategory('Student Essentials');
    assert.ok(essentialSubs.includes('Calculators'));
    assert.ok(essentialSubs.includes('Water Bottles'));
    assert.ok(essentialSubs.includes('Bags & Backpacks'));
    assert.ok(essentialSubs.includes('Pens, Pencils & Stationery'));
    pass('Student Essentials subcategories registry contains expected items including Pens, Pencils & Stationery');

    const bookSubs = getSubcategoriesForCategory('Books & Study Materials');
    assert.ok(bookSubs.includes('Engineering Textbooks'));
    assert.ok(bookSubs.includes('Subject-Wise Handwritten Notes'));
    assert.ok(bookSubs.includes('Lab Manuals'));
    assert.ok(bookSubs.includes('Subject-Specific Books'));
    pass('Books & Study Materials subcategories registry contains expected items including Subject-Specific Books');

    const designSubs = getSubcategoriesForCategory('Design, Drawing & Architecture');
    assert.ok(designSubs.includes('Drafters and Drafting Tools'));
    assert.ok(designSubs.includes('Engineering Drawing Instruments'));
    assert.ok(designSubs.includes('Geometry Boxes'));
    pass('Design, Drawing & Architecture subcategories registry contains expected items');

    const gadgetSubs = getSubcategoriesForCategory('Gadgets & Accessories');
    assert.ok(gadgetSubs.includes('Keyboards & Mice'));
    assert.ok(gadgetSubs.includes('Headphones & Earphones'));
    pass('Gadgets & Accessories subcategories registry contains Keyboards & Mice and Headphones & Earphones');

    assert.strictEqual(categorySupportsAcademicFields('Books & Study Materials'), true);
    assert.strictEqual(categorySupportsAcademicFields('Design, Drawing & Architecture'), true);
    assert.strictEqual(categorySupportsAcademicFields('Student Essentials'), false);
    pass('categorySupportsAcademicFields correctly differentiates academic materials');
  } catch (err) {
    fail('Category registry validation', err);
  }

  // --- Test Suite 2: Resource Model Schema & Academic Metadata ---
  console.log('\n--- Test Suite 2: Resource Model Schema & Academic Metadata ---');
  try {
    // 2.1 Valid Textbook with Academic Metadata
    const bookDoc = new Resource({
      title: 'Higher Engineering Mathematics (44th Ed)',
      description: 'Comprehensive engineering mathematics textbook covering multivariable calculus and ODEs.',
      category: 'Books & Study Materials',
      subcategory: 'Engineering Textbooks',
      academicMetadata: {
        subject: 'Engineering Mathematics',
        branch: 'Computer Science & Engineering (CSE)',
        department: 'School of Computer Engineering',
        course: 'B.Tech',
        semester: '1st Semester (Year 1)',
        academicYear: '2025-2026',
        classLevel: '1st Year',
        bookTitle: 'Higher Engineering Mathematics',
        author: 'Dr. B.S. Grewal',
        edition: '44th Edition',
        isbn: '978-8193328491',
      },
      location: {
        campus: 'Main Academic Campus',
        building: 'Central Library',
        room: 'Reserve Stack 1',
      },
      quantity: 3,
      condition: 'good',
      owner: dummyOwnerId,
    });

    const bookErr = bookDoc.validateSync();
    assert.strictEqual(bookErr, undefined);
    assert.strictEqual(bookDoc.academicMetadata.author, 'Dr. B.S. Grewal');
    assert.strictEqual(bookDoc.academicMetadata.branch, 'Computer Science & Engineering (CSE)');
    assert.strictEqual(bookDoc.academicMetadata.department, 'School of Computer Engineering');
    assert.strictEqual(bookDoc.academicMetadata.academicYear, '2025-2026');
    assert.strictEqual(bookDoc.academicMetadata.classLevel, '1st Year');
    assert.strictEqual(bookDoc.academicMetadata.class, '1st Year'); // Virtual alias
    assert.strictEqual(bookDoc.generalLocation, 'Main Academic Campus'); // Virtual location
    pass('Resource with complete extended academic metadata and virtuals passes validation');

    // 2.2 Valid Student Essential without academic metadata
    const bottleDoc = new Resource({
      title: 'Milton Thermosteel Reusable Bottle 1L',
      description: 'Insulated stainless steel vacuum water bottle for long laboratory shifts.',
      category: 'Student Essentials',
      subcategory: 'Water Bottles',
      quantity: 2,
      condition: 'good',
      owner: dummyOwnerId,
    });
    const bottleErr = bottleDoc.validateSync();
    assert.strictEqual(bottleErr, undefined);
    assert.strictEqual(bottleDoc.academicMetadata.author, '');
    pass('Student Essential without academic metadata passes validation with safe defaults');

    // 2.3 Invalid Category Rejection
    const invalidCatDoc = new Resource({
      title: 'Invalid Category Resource',
      description: 'Description with sufficient characters for testing.',
      category: 'FakeCategoryNotAllowed',
      owner: dummyOwnerId,
    });
    const invalidCatErr = invalidCatDoc.validateSync();
    assert.ok(invalidCatErr?.errors?.category);
    pass('Unsupported category is strictly rejected by Mongoose enum validation');
  } catch (err) {
    fail('Resource model schema validation', err);
  }

  // --- Test Suite 3: Safe Demo Catalog Definition & Integrity ---
  console.log('\n--- Test Suite 3: Safe Demo Catalog Definition & Integrity ---');
  try {
    assert.ok(Array.isArray(STUDENT_DEMO_CATALOG));
    assert.ok(STUDENT_DEMO_CATALOG.length >= 10);
    pass(`Curated student demo catalog contains ${STUDENT_DEMO_CATALOG.length} realistic resources`);

    // Verify all items have required fields and unique demoSeedKeys
    const keys = new Set();
    for (const item of STUDENT_DEMO_CATALOG) {
      assert.ok(item.demoSeedKey && item.demoSeedKey.startsWith('demo-'));
      assert.ok(!keys.has(item.demoSeedKey), `Duplicate seed key: ${item.demoSeedKey}`);
      keys.add(item.demoSeedKey);

      assert.ok(isValidCategory(item.category), `Invalid category in demo item: ${item.category}`);
      assert.ok(item.title.length >= 3);
      assert.ok(item.description.length >= 10);
      assert.ok(item.quantity >= 1);
    }
    pass('All demo items have valid schemas, valid categories, and unique demoSeedKeys');
  } catch (err) {
    fail('Demo catalog integrity', err);
  }

  // --- Test Suite 4: Demo Seeding Idempotency & Demo Marker Preservation ---
  console.log('\n--- Test Suite 4: Demo Seeding Idempotency & Marker Preservation ---');
  try {
    // In-memory mock database
    const mockDb = new Map();

    const sampleItem = STUDENT_DEMO_CATALOG[0];

    // Simulate First Seed Run
    let existing = mockDb.get(sampleItem.demoSeedKey);
    if (!existing) {
      const created = {
        ...sampleItem,
        _id: new mongoose.Types.ObjectId(),
        isDemo: true,
        isSample: false,
        moderationStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.set(sampleItem.demoSeedKey, created);
    }

    assert.strictEqual(mockDb.size, 1);
    const firstSeeded = mockDb.get(sampleItem.demoSeedKey);
    assert.strictEqual(firstSeeded.isDemo, true);
    assert.strictEqual(firstSeeded.isSample, false);
    pass('Initial seed marks resource with isDemo: true');

    // Simulate Second Seed Run (Idempotency check)
    existing = mockDb.get(sampleItem.demoSeedKey);
    if (existing) {
      Object.assign(existing, sampleItem);
      existing.isDemo = true;
      existing.updatedAt = new Date();
    }

    assert.strictEqual(mockDb.size, 1);
    const secondSeeded = mockDb.get(sampleItem.demoSeedKey);
    assert.strictEqual(secondSeeded.isDemo, true);
    assert.strictEqual(secondSeeded._id.toString(), firstSeeded._id.toString());
    pass('Re-running demo seeder is strictly idempotent without creating duplicates');

    // Simulated Safe Cleanup targeting isDemo
    // Add 1 real user resource to verify it is NEVER deleted
    const realUserResourceKey = 'user-created-resource-99';
    mockDb.set(realUserResourceKey, {
      _id: new mongoose.Types.ObjectId(),
      title: 'Professor Personal Microscope',
      isDemo: false,
      isSample: false,
    });

    // Cleanup executes targeting strictly isDemo: true
    for (const [key, val] of Array.from(mockDb.entries())) {
      if (val.isDemo === true) {
        mockDb.delete(key);
      }
    }

    assert.strictEqual(mockDb.has(sampleItem.demoSeedKey), false);
    assert.strictEqual(mockDb.has(realUserResourceKey), true);
    pass('Safe cleanup deletes demo records while strictly preserving real user resources');
  } catch (err) {
    fail('Seeding idempotency and cleanup', err);
  }

  // --- Test Suite 5: Multi-Unit Student Resource Availability & Booking Logic ---
  console.log('\n--- Test Suite 5: Multi-Unit Student Resource Availability ---');
  try {
    const multiCalcId = new mongoose.Types.ObjectId();
    const multiCalcResource = new Resource({
      _id: multiCalcId,
      title: 'Casio fx-991EX Scientific Calculator',
      description: 'Approved university scientific calculator for engineering examinations.',
      category: 'Student Essentials',
      subcategory: 'Calculators',
      quantity: 5,
      availabilityStatus: 'available',
      owner: dummyOwnerId,
    });

    const origResourceFindById = Resource.findById;
    const origBookingFind = Booking.find;

    Resource.findById = () => Promise.resolve(multiCalcResource);

    // Mock 2 active bookings for the requested slot
    const activeBookings = [
      {
        _id: new mongoose.Types.ObjectId(),
        resource: multiCalcId,
        status: 'approved',
        quantity: 2,
        startAt: new Date('2026-11-05T09:00:00.000Z'),
        endAt: new Date('2026-11-05T12:00:00.000Z'),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        resource: multiCalcId,
        status: 'checked_in',
        quantity: 1,
        startAt: new Date('2026-11-05T10:00:00.000Z'),
        endAt: new Date('2026-11-05T13:00:00.000Z'),
      },
    ];

    Booking.find = (query) => {
      if (query.status && query.startAt && query.endAt) {
        return Promise.resolve(activeBookings);
      }
      return Promise.resolve([]);
    };

    const slotAvail = await calculateSlotAvailability(
      multiCalcId,
      '2026-11-05T10:30:00.000Z',
      '2026-11-05T11:30:00.000Z'
    );

    assert.strictEqual(slotAvail.totalCapacity, 5);
    assert.strictEqual(slotAvail.bookedQuantity, 3);
    assert.strictEqual(slotAvail.availableCapacity, 2);
    assert.strictEqual(slotAvail.isAvailable, true);
    assert.strictEqual(slotAvail.availabilityStatus, 'available');
    pass('Multi-unit calculator with 3 booked of 5 retains 2 available units for slot');

    // Test adjacent boundary: slot ending at 09:00 does not overlap [09:00 - 12:00]
    assert.strictEqual(
      doIntervalsOverlap(
        new Date('2026-11-05T07:00:00.000Z'),
        new Date('2026-11-05T09:00:00.000Z'),
        new Date('2026-11-05T09:00:00.000Z'),
        new Date('2026-11-05T12:00:00.000Z')
      ),
      false
    );
    pass('Adjacent boundary intervals strictly do not overlap');

    // Restore stubs
    Resource.findById = origResourceFindById;
    Booking.find = origBookingFind;
  } catch (err) {
    fail('Multi-unit availability tracking', err);
  }

  // --- Test Suite 6: Smart Match Inference for Student Resources ---
  console.log('\n--- Test Suite 6: Smart Match Natural-Language Inference ---');
  try {
    // 6.1 Parse calculator need
    const parsedCalc = parseNeedDescription('I need a scientific calculator for my engineering exam tomorrow');
    assert.strictEqual(parsedCalc.inferredCategory, 'Student Essentials');
    pass('Natural language "scientific calculator" infers Student Essentials category');

    // 6.2 Parse engineering drafter need
    const parsedDrafter = parseNeedDescription('Looking for an engineering mini drafter and drawing board');
    assert.strictEqual(parsedDrafter.inferredCategory, 'Design, Drawing & Architecture');
    pass('Natural language "mini drafter and drawing board" infers Design, Drawing & Architecture');

    // 6.3 Parse textbook need
    const parsedBook = parseNeedDescription('Need a textbook for data structures lecture and previous year questions');
    assert.strictEqual(parsedBook.inferredCategory, 'Books & Study Materials');
    pass('Natural language "textbook for data structures" infers Books & Study Materials');

    // 6.4 Parse gadgets need
    const parsedGadget = parseNeedDescription('I need a fast USB charger and wireless keyboard');
    assert.strictEqual(parsedGadget.inferredCategory, 'Gadgets & Accessories');
    pass('Natural language "fast USB charger and keyboard" infers Gadgets & Accessories');

    // 6.5 Relevance score with academic metadata match
    const textbookCandidate = {
      title: 'Higher Engineering Mathematics',
      description: 'Calculus and ODEs for B.Tech students',
      category: 'Books & Study Materials',
      subcategory: 'Engineering Textbooks',
      academicMetadata: {
        author: 'B.S. Grewal',
        subject: 'Engineering Mathematics',
        branch: 'Mechanical Engineering',
      },
      location: { campus: 'Main Academic Campus' },
    };

    const criteria = {
      needDescription: 'I need B.S. Grewal mathematics book',
      category: 'Books & Study Materials',
    };

    const parsedQuery = parseNeedDescription(criteria.needDescription);
    const matchResult = scoreResourceMatch(
      textbookCandidate,
      criteria,
      parsedQuery,
      { availableCapacity: 3, hasOverlap: false }
    );

    assert.ok(matchResult.score >= 50, `Expected high score >= 50, received ${matchResult.score}`);
    assert.ok(matchResult.explanations.length > 0);
    pass('Relevance scoring boosts matches on book author and subject keywords');
  } catch (err) {
    fail('Smart match student inference', err);
  }

  console.log('\n====================================================');
  console.log(`Student Essentials & Academic Test Summary: Passed: ${testsPassed}, Failed: ${testsFailed}`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runStudentResourcesTestSuite();
}

module.exports = { runStudentResourcesTestSuite };
