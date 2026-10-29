/**
 * Repeatable, Safe Demo Data Seeder for Hackathon Presentations
 * 
 * Purpose:
 *   Seeds a curated set of realistic resources across multiple categories, availability
 *   states, and booking transaction stages (Pending, Approved, Checked-In, Completed, Issue-Reported).
 * 
 * Safety Guarantees:
 *   - NEVER runs automatically during application startup.
 *   - NEVER deletes real user accounts or real listings.
 *   - Uses stable slugs/keys for idempotence (re-running refreshes or skips existing records).
 *   - Clearly flags all demo resources with `isSample: true` and designated institutional demo emails.
 *   - Supports `--clean-demo-only` to reset only demo records without impacting user data.
 * 
 * Usage:
 *   node src/scripts/seedDemoData.js
 *   node src/scripts/seedDemoData.js --clean-demo-only
 */

const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

// Configure reliable DNS servers for Atlas SRV lookup on Windows
try {
  if (process.platform === 'win32' || process.env.ENABLE_CUSTOM_DNS === 'true') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
} catch (err) {
  console.warn('⚠️ [DNS Warning] Failed to configure custom DNS:', err.message);
}

// Load server environment
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const User = require('../models/User');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { INITIAL_SAMPLE_CATALOG } = require('../utils/seedResources');
const { STUDENT_DEMO_CATALOG } = require('../utils/studentDemoCatalog');

// Standard demo account definitions
const DEMO_ACCOUNTS = {
  custodian: {
    name: 'Facility Equipment Custodian',
    email: 'custodian@institutional-sharing.edu',
    password: process.env.DEMO_CUSTODIAN_PASSWORD || 'InstitutionalCustodianSecret2026!',
    role: 'user',
  },
  borrower: {
    name: 'Dr. Anya Sharma (Visiting Researcher)',
    email: 'borrower.demo@institutional-sharing.edu',
    password: process.env.DEMO_BORROWER_PASSWORD || 'DemoBorrowerSecret2026!',
    role: 'user',
  },
};

/**
 * Verify environment safety before permitting any database writes
 */
function verifyEnvironmentSafety(uri) {
  const isProdEnv = process.env.NODE_ENV === 'production';
  const isProdUri = uri.toLowerCase().includes('production') || uri.toLowerCase().includes('prod');
  const allowProd = process.env.ALLOW_PRODUCTION_DEMO_SEED === 'true' || process.argv.includes('--force-prod');

  if ((isProdEnv || isProdUri) && !allowProd) {
    console.error('🛑 [SAFETY GUARD BLOCKED] Target appears to be a PRODUCTION environment.');
    console.error('   Demo data seeding is strictly disabled on production by default.');
    console.error('   To override explicitly for authorized testing, pass --force-prod or set ALLOW_PRODUCTION_DEMO_SEED=true.');
    return false;
  }
  return true;
}

async function seedDemoData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined. Cannot seed demo data.');
    console.error('   Please provide a valid connection string in server/.env.');
    process.exit(1);
  }

  if (!verifyEnvironmentSafety(uri)) {
    process.exit(1);
  }

  const isCleanOnly = process.argv.includes('--clean-demo-only');
  const isConfirmed = process.argv.includes('--confirm');
  const isDryRun = process.argv.includes('--dry-run');
  const isLiveCheck = process.argv.includes('--live');

  try {
    console.log('====================================================');
    console.log('🌱 Starting Resource Sharing Platform Demo Seeder');
    console.log('====================================================\n');

    // Dry Run Simulation Mode (Fast, zero-network schema & catalog simulation by default)
    if (isDryRun && !isLiveCheck) {
      console.log('🔍 [DRY RUN MODE ACTIVATED] Simulating demo data seeding without making database writes...\n');
      let dryCount = 0;

      for (const item of INITIAL_SAMPLE_CATALOG) {
        dryCount++;
        console.log(`  [DRY RUN] Would verify institutional resource: ${item.title} (${item.category})`);
      }

      for (const item of STUDENT_DEMO_CATALOG) {
        dryCount++;
        console.log(`  [DRY RUN] Would seed/verify demo item [${item.demoSeedKey}]: ${item.title}`);
      }

      console.log('\n====================================================');
      console.log('📊 DRY RUN AUDIT SUMMARY');
      console.log('====================================================');
      console.log(`  - Total items evaluated: ${INITIAL_SAMPLE_CATALOG.length + STUDENT_DEMO_CATALOG.length}`);
      console.log(`  - Institutional items:   ${INITIAL_SAMPLE_CATALOG.length}`);
      console.log(`  - Student demo items:    ${STUDENT_DEMO_CATALOG.length}`);
      console.log('  - Real user accounts:    0 touched (Strictly protected)');
      console.log('  - Real user resources:   0 touched (Strictly protected)');
      console.log('  - Database state:        UNTOUCHED (0 writes performed)');
      console.log('====================================================\n');
      process.exit(0);
    }

    await mongoose.connect(uri, {
      dbName: 'ResourceSharingDb',
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ Connected to database: ${mongoose.connection.host}/${mongoose.connection.name}`);

    // If live dry-run mode requested
    if (isDryRun && isLiveCheck) {
      console.log('🔍 [LIVE DRY RUN] Comparing demo catalog against live database...\n');
      let dryInsert = 0;
      let dryUpdate = 0;

      for (const item of INITIAL_SAMPLE_CATALOG) {
        const exists = await Resource.findOne({ slug: item.slug }).select('_id');
        if (exists) {
          dryUpdate++;
          console.log(`  [DRY RUN] Exists in DB (would update): ${item.title}`);
        } else {
          dryInsert++;
          console.log(`  [DRY RUN] New item (would insert):    ${item.title}`);
        }
      }

      for (const item of STUDENT_DEMO_CATALOG) {
        const exists = await Resource.findOne({ demoSeedKey: item.demoSeedKey }).select('_id');
        if (exists) {
          dryUpdate++;
          console.log(`  [DRY RUN] Exists in DB (would update): ${item.title}`);
        } else {
          dryInsert++;
          console.log(`  [DRY RUN] New item (would insert):    ${item.title}`);
        }
      }

      console.log('\n====================================================');
      console.log('📊 LIVE DRY RUN AUDIT SUMMARY');
      console.log('====================================================');
      console.log(`  - Total items evaluated: ${INITIAL_SAMPLE_CATALOG.length + STUDENT_DEMO_CATALOG.length}`);
      console.log(`  - Would insert:          ${dryInsert}`);
      console.log(`  - Would update:          ${dryUpdate}`);
      console.log('  - Real user accounts:    0 touched (Strictly protected)');
      console.log('  - Real user resources:   0 touched (Strictly protected)');
      console.log('  - Database state:        UNTOUCHED (0 writes performed)');
      console.log('====================================================\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    // 1. If clean-only mode, remove only demo-tagged records with explicit confirmation
    if (isCleanOnly) {
      console.log('🧹 Preparing Safe Demo Data Cleanup...');
      const custodianUser = await User.findOne({ email: DEMO_ACCOUNTS.custodian.email });
      const borrowerUser = await User.findOne({ email: DEMO_ACCOUNTS.borrower.email });
      const userIds = [custodianUser?._id, borrowerUser?._id].filter(Boolean);

      const demoResourcesCount = await Resource.countDocuments({
        $or: [{ isDemo: true }, { isSample: true, owner: { $in: userIds } }],
      });
      const demoBookingsCount = await Booking.countDocuments({
        $or: [{ requester: { $in: userIds } }, { owner: { $in: userIds } }],
      });
      const demoNotificationsCount = await Notification.countDocuments({
        recipient: { $in: userIds },
      });

      console.log('\nTarget Records Identified for Safe Cleanup:');
      console.log(`  - Demo Resources (isDemo / isSample): ${demoResourcesCount}`);
      console.log(`  - Demo Bookings:                     ${demoBookingsCount}`);
      console.log(`  - Demo Notifications:                ${demoNotificationsCount}`);
      console.log('  - Real User Accounts:                0 (Protected — NEVER modified or deleted)');
      console.log('  - Real User Resources:               0 (Protected — NEVER modified or deleted)');

      if (!isConfirmed) {
        console.log('\n⚠️  Execution safety check: Confirmation flag missing.');
        console.log('   Run with: "node src/scripts/seedDemoData.js --clean-demo-only --confirm"');
        console.log('   to execute the deletion of ONLY these identified demo records.\n');
        await mongoose.connection.close();
        process.exit(0);
      }

      if (userIds.length > 0 || demoResourcesCount > 0) {
        const deletedBookings = await Booking.deleteMany({
          $or: [{ requester: { $in: userIds } }, { owner: { $in: userIds } }],
        });
        const deletedNotifications = await Notification.deleteMany({
          recipient: { $in: userIds },
        });
        const deletedResources = await Resource.deleteMany({
          $or: [{ isDemo: true }, { isSample: true, owner: { $in: userIds } }],
        });

        console.log(`\n  - Removed ${deletedBookings.deletedCount} demo bookings`);
        console.log(`  - Removed ${deletedNotifications.deletedCount} demo notifications`);
        console.log(`  - Removed ${deletedResources.deletedCount} demo resources`);
      }

      console.log('✅ Demo records cleaned safely. Real user records were preserved.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    // 2. Ensure Demo Custodian & Demo Borrower accounts exist
    let custodian = await User.findOne({ email: DEMO_ACCOUNTS.custodian.email });
    if (!custodian) {
      custodian = await User.create(DEMO_ACCOUNTS.custodian);
      console.log(`✅ Created demo custodian: ${custodian.email}`);
    } else {
      console.log(`ℹ️  Found existing demo custodian: ${custodian.email}`);
    }

    let borrower = await User.findOne({ email: DEMO_ACCOUNTS.borrower.email });
    if (!borrower) {
      borrower = await User.create(DEMO_ACCOUNTS.borrower);
      console.log(`✅ Created demo borrower: ${borrower.email}`);
    } else {
      console.log(`ℹ️  Found existing demo borrower: ${borrower.email}`);
    }

    // 3. Upsert Sample Resources (Institutional Catalog)
    console.log('\n🏛️  Seeding Institutional Equipment & Labs Catalog...');
    const resourceMap = {};
    let totalInserted = 0;
    let totalUpdated = 0;

    for (const item of INITIAL_SAMPLE_CATALOG) {
      let resDoc = await Resource.findOne({ slug: item.slug });
      if (!resDoc) {
        resDoc = await Resource.create({
          ...item,
          owner: custodian._id,
          isSample: true,
          isDemo: false,
        });
        totalInserted++;
        console.log(`  + Seeded institutional resource: ${item.title}`);
      } else {
        resDoc.owner = custodian._id;
        resDoc.isSample = true;
        await resDoc.save();
        totalUpdated++;
      }
      resourceMap[item.slug] = resDoc;
    }

    // 4. Upsert Student Essentials, Books & Academic Materials
    console.log('\n📚 Seeding Student Essentials, Books & Academic Materials...');
    for (const item of STUDENT_DEMO_CATALOG) {
      let resDoc = await Resource.findOne({ demoSeedKey: item.demoSeedKey });
      if (!resDoc) {
        resDoc = await Resource.create({
          ...item,
          owner: custodian._id,
          isDemo: true,
          isSample: false,
          moderationStatus: 'approved',
        });
        totalInserted++;
        console.log(`  + Seeded [${item.category} / ${item.subcategory}]: ${item.title}`);
      } else {
        Object.assign(resDoc, item);
        resDoc.owner = custodian._id;
        resDoc.isDemo = true;
        resDoc.isSample = false;
        resDoc.moderationStatus = 'approved';
        await resDoc.save();
        totalUpdated++;
        console.log(`  ↻ Updated demo item: ${item.title}`);
      }
      resourceMap[item.demoSeedKey] = resDoc;
    }

    // 4. Seed Demonstrative Bookings Across Workflow Stages
    console.log('\n📅 Seeding demonstrative booking scenarios...');

    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // SCENARIO 1: PENDING BOOKING (Ready for Owner Review / Approval demo)
    const specResource = resourceMap['biomol-spec-02'];
    if (specResource) {
      const pendingStart = new Date(now.getTime() + 4 * oneHour);
      const pendingEnd = new Date(pendingStart.getTime() + 2 * oneHour);

      let pendingBooking = await Booking.findOne({
        resource: specResource._id,
        requester: borrower._id,
        status: 'pending',
      });

      if (!pendingBooking) {
        pendingBooking = await Booking.create({
          resource: specResource._id,
          requester: borrower._id,
          owner: custodian._id,
          startAt: pendingStart,
          endAt: pendingEnd,
          quantity: 1,
          purpose: 'Absorbance spectra measurement for organic semiconductor thin films.',
          status: 'pending',
        });
        console.log('  ✅ Seeded PENDING booking (Ready for Owner Approval demo)');

        // Notification to custodian
        await Notification.create({
          recipient: custodian._id,
          sender: borrower._id,
          type: 'booking_created',
          title: 'New Booking Request',
          message: `${borrower.name} requested booking for "${specResource.title}".`,
          booking: pendingBooking._id,
          resource: specResource._id,
          link: '/dashboard?tab=incoming-requests',
        });
      }
    }

    // SCENARIO 2: APPROVED BOOKING (Ready for Borrower Pickup / Check-in demo)
    const cameraResource = resourceMap['sony-cinema-05'];
    if (cameraResource) {
      const approvedStart = new Date(now.getTime() - 30 * 60 * 1000); // started 30 mins ago
      const approvedEnd = new Date(now.getTime() + 3 * oneHour);

      let approvedBooking = await Booking.findOne({
        resource: cameraResource._id,
        requester: borrower._id,
        status: 'approved',
      });

      if (!approvedBooking) {
        approvedBooking = await Booking.create({
          resource: cameraResource._id,
          requester: borrower._id,
          owner: custodian._id,
          startAt: approvedStart,
          endAt: approvedEnd,
          quantity: 1,
          purpose: 'Filming laboratory micro-fluids experiment for conference submission.',
          status: 'approved',
          reviewedAt: new Date(now.getTime() - 2 * oneHour),
        });
        console.log('  ✅ Seeded APPROVED booking (Ready for Borrower Check-In demo)');

        // Notification to borrower
        await Notification.create({
          recipient: borrower._id,
          sender: custodian._id,
          type: 'booking_approved',
          title: 'Booking Approved',
          message: `Your booking for "${cameraResource.title}" was approved by the facility custodian.`,
          booking: approvedBooking._id,
          resource: cameraResource._id,
          link: '/dashboard?tab=my-bookings',
        });
      }
    }

    // SCENARIO 3: CHECKED-IN BOOKING (Ready for Borrower Return / Check-out demo)
    const semResource = resourceMap['sem-nanotech-01'];
    if (semResource) {
      const checkedInStart = new Date(now.getTime() - 2 * oneHour);
      const checkedInEnd = new Date(now.getTime() + 2 * oneHour);

      let checkedInBooking = await Booking.findOne({
        resource: semResource._id,
        requester: borrower._id,
        status: 'checked_in',
      });

      if (!checkedInBooking) {
        checkedInBooking = await Booking.create({
          resource: semResource._id,
          requester: borrower._id,
          owner: custodian._id,
          startAt: checkedInStart,
          endAt: checkedInEnd,
          quantity: 1,
          purpose: 'High-resolution surface topography analysis of etched silicon wafers.',
          status: 'checked_in',
          reviewedAt: new Date(now.getTime() - 5 * oneHour),
          checkIn: {
            checkedInAt: new Date(now.getTime() - 2 * oneHour),
            condition: 'good',
            notes: 'Secondary electron detector calibrated. Apertures aligned and vacuum chamber clean.',
            photos: [],
          },
        });
        console.log('  ✅ Seeded CHECKED-IN booking (Ready for Return & Condition Comparison demo)');
      }
    }

    // SCENARIO 4: COMPLETED BOOKING WITH AUDIT TRAIL (Shows condition comparison)
    const collabResource = resourceMap['collab-space-06'];
    if (collabResource) {
      const completedStart = new Date(now.getTime() - 2 * oneDay);
      const completedEnd = new Date(completedStart.getTime() + 3 * oneHour);

      let completedBooking = await Booking.findOne({
        resource: collabResource._id,
        requester: borrower._id,
        status: 'completed',
      });

      if (!completedBooking) {
        completedBooking = await Booking.create({
          resource: collabResource._id,
          requester: borrower._id,
          owner: custodian._id,
          startAt: completedStart,
          endAt: completedEnd,
          quantity: 1,
          purpose: 'Cross-campus robotics research sprint and demonstration.',
          status: 'completed',
          reviewedAt: new Date(completedStart.getTime() - oneDay),
          checkIn: {
            checkedInAt: completedStart,
            condition: 'excellent',
            notes: 'Room pristine, 85-inch digital whiteboard fully functional with pens present.',
            photos: [],
          },
          checkOut: {
            checkedOutAt: completedEnd,
            condition: 'good',
            notes: 'Cleaned and reset furniture arrangement. Whiteboard wiped.',
            photos: [],
          },
          conditionComparison: {
            isWorsened: false,
            difference: 'none',
          },
        });
        console.log('  ✅ Seeded COMPLETED booking (With full check-in/out audit history)');
      }
    }

    // SCENARIO 5: BOOKING WITH OPEN ISSUE REPORT (Ready for Admin/Owner Issue Resolution demo)
    const gpuResource = resourceMap['gpu-workstation-03'];
    if (gpuResource) {
      const issueStart = new Date(now.getTime() - oneDay);
      const issueEnd = new Date(issueStart.getTime() + 8 * oneHour);

      let issueBooking = await Booking.findOne({
        resource: gpuResource._id,
        'issueReport.hasIssue': true,
      });

      if (!issueBooking) {
        issueBooking = await Booking.create({
          resource: gpuResource._id,
          requester: borrower._id,
          owner: custodian._id,
          startAt: issueStart,
          endAt: issueEnd,
          quantity: 1,
          purpose: 'Distributed LLM parameter-efficient fine-tuning on PyTorch 2.4.',
          status: 'completed',
          reviewedAt: new Date(issueStart.getTime() - 4 * oneHour),
          checkIn: {
            checkedInAt: issueStart,
            condition: 'excellent',
            notes: 'All 4x RTX 4090 GPUs idle at 34C. Docker environment healthy.',
            photos: [],
          },
          checkOut: {
            checkedOutAt: issueEnd,
            condition: 'fair',
            notes: 'GPU #3 displayed fan oscillation warning and throttling above 80C.',
            photos: [],
          },
          conditionComparison: {
            isWorsened: true,
            difference: 'deteriorated',
          },
          issueReport: {
            hasIssue: true,
            reportedBy: borrower._id,
            description: 'GPU #3 cooling fan produced abnormal rattling vibration under heavy CUDA workload. Needs fan shroud inspection.',
            reportedAt: new Date(issueEnd.getTime() + 15 * 60 * 1000),
            initialCondition: 'excellent',
            finalCondition: 'fair',
            status: 'open',
            resolutionNotes: '',
          },
        });
        console.log('  ✅ Seeded OPEN ISSUE REPORT (Ready for Admin/Custodian Investigation demo)');

        // Notification to custodian about the issue
        await Notification.create({
          recipient: custodian._id,
          sender: borrower._id,
          type: 'booking_issue_reported',
          title: 'Condition Issue Reported',
          message: `${borrower.name} reported a condition issue on "${gpuResource.title}".`,
          booking: issueBooking._id,
          resource: gpuResource._id,
          link: '/admin',
        });
      }
    }

    console.log('\n====================================================');
    console.log('🎉 Demo Seeding Completed Successfully!');
    console.log('====================================================');
    console.log(`  - Total resources evaluated: ${totalInserted + totalUpdated}`);
    console.log(`  - Newly inserted:            ${totalInserted}`);
    console.log(`  - Idempotently updated:      ${totalUpdated}`);
    console.log(`  - Real user listings:        0 modified (Strictly protected)`);
    console.log('\nDemonstration Accounts Ready:');
    console.log(`  1. Custodian / Owner: ${DEMO_ACCOUNTS.custodian.email}`);
    console.log(`  2. Demo Borrower:    ${DEMO_ACCOUNTS.borrower.email}`);
    console.log('\nWorkflow States Available for Live Demo:');
    console.log('  - [Pending Approval]     Lambda 950 Spectrophotometer (Approve/Reject demo)');
    console.log('  - [Approved / Pickup]    Sony FX6 Cinema Camera (Check-in & Condition demo)');
    console.log('  - [Active / Checked-In]  Hitachi SEM Microscope (Return & Checkout demo)');
    console.log('  - [Completed / Audit]    Design Studio (Condition comparison demo)');
    console.log('  - [Open Issue Report]    4x RTX 4090 GPU Rig (Admin Issue Resolution demo)');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Demo seeding failed:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData, DEMO_ACCOUNTS };

