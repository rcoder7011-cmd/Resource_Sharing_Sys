/**
 * Safe Database Seeder for Resource Sharing Platform
 * Seeds existing Part 2 sample catalog into MongoDB Atlas.
 * 
 * Safety guarantees:
 * - Does NOT run automatically on server boot.
 * - Uses stable slugs/identifiers to prevent duplicate records.
 * - Never deletes or overwrites existing user-created resources.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Resource = require('../models/Resource');

// Initial institutional sample catalog definitions
const INITIAL_SAMPLE_CATALOG = [
  {
    slug: 'sem-nanotech-01',
    title: 'Hitachi S-4800 Scanning Electron Microscope (SEM)',
    category: 'Testing Equipment',
    resourceType: 'equipment',
    institution: 'Nanoscale Science & Characterization Facility',
    location: {
      campus: 'North Research Campus',
      building: 'Materials Science Hall',
      room: 'B-104 (Cleanroom Core)',
    },
    availabilityStatus: 'available',
    images: [
      'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'The Hitachi S-4800 is an advanced cold field emission SEM featuring dual electron detectors for high-resolution secondary and backscattered electron imaging. Ideal for surface morphology, metallurgical grain analysis, and thin-film nanostructures. Equipped with an Oxford Instruments Ultim Max EDX detector for rapid qualitative and quantitative microanalysis.',
    specs: {
      Resolution: '1.0 nm at 15 kV / 2.0 nm at 1 kV',
      Magnification: '20x to 800,000x',
      'Acceleration Voltage': '0.5 to 30 kV (0.1 kV steps)',
    },
    eligibility: [
      'General Nanotechnology Cleanroom Orientation',
      'SEM Level 2 Certified Operator or Staff Operator Assistance',
    ],
    safetyLevel: 'Restricted Tier-2',
    operatingHours: 'Monday – Friday: 08:30 – 20:00',
    maxBookingDuration: '4 hours / day per researcher',
    quantity: 1,
    condition: 'good',
  },
  {
    slug: 'biomol-spec-02',
    title: 'PerkinElmer Lambda 950 UV/Vis/NIR Spectrophotometer',
    category: 'Laboratories',
    resourceType: 'equipment',
    institution: 'Department of Molecular Biophysics',
    location: {
      campus: 'Main Academic Campus',
      building: 'Biosciences Complex',
      room: 'Lab 320',
    },
    availabilityStatus: 'available',
    images: [
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'The Lambda 950 provides ultra-sensitive absorbance, transmittance, and diffuse reflectance measurements spanning ultra-violet, visible, and near-infrared spectra. Suitable for photodynamic dye testing, optical glass coatings, protein structural transitions, and solar cell material characterization.',
    specs: {
      'Spectral Range': '175 nm to 3,300 nm',
      'Optical System': 'Double-beam, double-monochromator ratioing',
    },
    eligibility: [
      'Biosciences Core Safety Training Module B',
      'Cuvette handling and optical surface preservation protocol',
    ],
    safetyLevel: 'Standard',
    operatingHours: 'Daily: 07:00 – 22:00',
    maxBookingDuration: '3 hours / slot',
    quantity: 2,
    condition: 'good',
  },
  {
    slug: 'gpu-workstation-03',
    title: 'Deep Learning Rig (4x NVIDIA RTX 4090 24GB, 256GB RAM)',
    category: 'Computers',
    resourceType: 'equipment',
    institution: 'Center for Computational Intelligence',
    location: {
      campus: 'Technology Innovation Hub',
      building: 'Turing Computer Science Center',
      room: 'Server Bay 2B',
    },
    availabilityStatus: 'available',
    images: [
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'High-throughput deep learning training rig equipped with liquid-cooled quad RTX 4090 GPUs, 24-core AMD Threadripper PRO, 256GB ECC DDR5 RAM, and 15TB NVMe scratch storage. Preconfigured with PyTorch, TensorFlow, CUDA 12, and Docker GPU runtime for large model fine-tuning.',
    specs: {
      GPUs: '4x NVIDIA RTX 4090 24GB VRAM (96GB total)',
      System: 'AMD Threadripper PRO 5965WX (24C/48T)',
    },
    eligibility: ['High-Performance Computing User Agreement'],
    safetyLevel: 'Standard',
    operatingHours: '24/7 Remote SSH & Slurm Job Access',
    maxBookingDuration: '48 hours / run',
    quantity: 1,
    condition: 'new',
  },
  {
    slug: 'laser-cutter-04',
    title: 'Epilog Fusion Pro 48 CO2 Laser Engraver & Cutter (120W)',
    category: 'Workshop Tools',
    resourceType: 'equipment',
    institution: 'School of Industrial Design & Prototyping',
    location: {
      campus: 'Innovation Arts Campus',
      building: 'Design Guild Workshop',
      room: 'Studio 14',
    },
    availabilityStatus: 'unavailable',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Industrial-grade 120W CO2 laser cutting system with a generous 48" x 36" work area and IRIS dual camera positioning. Capable of clean precision cuts through acrylics, hardwoods, delrin, leather, and architectural modeling substrates up to 1/2" thickness.',
    specs: {
      'Work Area': '48" x 36" (1219 x 914 mm)',
      'Laser Source': '120 Watt Waveguide CO2 Laser Tube',
    },
    eligibility: ['Makerspace Level 1 Laser Orientation'],
    safetyLevel: 'Supervised Only',
    operatingHours: 'Monday – Saturday: 09:00 – 21:00',
    maxBookingDuration: '2 hours / session',
    quantity: 1,
    condition: 'good',
  },
  {
    slug: 'sony-cinema-05',
    title: 'Sony FX6 Full-Frame Cinema Camera Kit (w/ 24-70mm G-Master)',
    category: 'Cameras',
    resourceType: 'equipment',
    institution: 'Department of Media Arts & Documentary Studies',
    location: {
      campus: 'Main Academic Campus',
      building: 'Humanities & Film Hall',
      room: 'Equipment Depot C-12',
    },
    availabilityStatus: 'available',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Professional broadcast full-frame cinema package featuring 4K 120p recording, dual base ISO (800 / 12,800), internal electronic variable ND filter, and high-speed autofocus. Kit includes Sony FE 24-70mm f/2.8 GM lens, two 160GB CFexpress Type A cards, three BP-U60 batteries, and custom Pelican case.',
    specs: {
      Sensor: '35mm full-frame 10.2 MP back-illuminated Exmor R CMOS',
      DynamicRange: '15+ stops with S-Log3 / S-Cinetone',
    },
    eligibility: ['Film & Media Equipment Checkout Policy Compliance'],
    safetyLevel: 'Standard',
    operatingHours: 'Depot Checkout Hours: 09:00 – 17:00 (M-F)',
    maxBookingDuration: '72 hours (3 days)',
    quantity: 2,
    condition: 'good',
  },
  {
    slug: 'collab-space-06',
    title: 'Interactive Design Studio & Collaborative Space',
    category: 'Meeting Rooms',
    resourceType: 'space',
    institution: 'Center for Collaborative Learning & Discovery',
    location: {
      campus: 'Main Academic Campus',
      building: 'Student Innovation Pavilion',
      room: 'Room 205 (West Wing)',
    },
    availabilityStatus: 'available',
    images: [
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Configurable collaborative work studio for project squads, multidisciplinary hackathon teams, and seminars. Includes 85" 4K interactive digital whiteboard, moveable wheeled presentation tables, modular acoustic dividers, and integrated Zoom Room teleconferencing.',
    specs: {
      Capacity: '24 seated / 35 standing',
      AV: '85-inch 4K touchscreen interactive whiteboard',
    },
    eligibility: ['Active institutional student or faculty member'],
    safetyLevel: 'Standard',
    operatingHours: 'Daily: 06:00 – 23:00',
    maxBookingDuration: '3 hours / team',
    quantity: 1,
    condition: 'new',
  },
  {
    slug: 'universal-tester-07',
    title: 'Instron 5969 Dual Column Universal Testing System (50 kN)',
    category: 'Testing Equipment',
    resourceType: 'equipment',
    institution: 'Department of Mechanical & Aerospace Engineering',
    location: {
      campus: 'North Research Campus',
      building: 'Aerospace Engineering Lab',
      room: 'Materials Characterization Core',
    },
    availabilityStatus: 'maintenance',
    images: [
      'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'High-precision dual column electromechanical testing frame capable of tension, compression, flexure, and peel testing up to 50 kN load capacity. Integrated with Bluehill Universal software and non-contact video extensometer for true strain mapping.',
    specs: {
      Capacity: '50 kN (11,250 lbf)',
      Speed: '0.001 to 1000 mm/min crosshead speed range',
    },
    eligibility: ['Mechanical Testing SOP Orientation Module'],
    safetyLevel: 'Restricted Tier-2',
    operatingHours: 'Monday – Friday: 08:00 – 18:00',
    maxBookingDuration: '4 hours / slot',
    quantity: 1,
    condition: 'good',
  },
  {
    slug: 'optical-table-08',
    title: 'Vibration-Isolated Optical Research Table (4x8 ft)',
    category: 'Laboratories',
    resourceType: 'space',
    institution: 'Department of Applied Physics & Photonics',
    location: {
      campus: 'North Research Campus',
      building: 'Quantum Optics Building',
      room: 'Darkroom Bay 4',
    },
    availabilityStatus: 'available',
    images: [
      'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Precision stabilized 4 ft x 8 ft honeycomb optical table with tuned pneumatic leg isolators to decouple building vibrations down to 1.5 Hz. Enclosed in a light-tight clean curtain enclosure with laminar flow air filtration for sensitive interferometry and quantum optics.',
    specs: {
      Dimensions: '1.2 m x 2.4 m x 305 mm thick (4 ft x 8 ft)',
      Isolation: '4x Newport S-2000 pneumatic air isolators',
    },
    eligibility: ['Laser Safety Officer (LSO) Class 3B/4 User Certification'],
    safetyLevel: 'Supervised Only',
    operatingHours: 'Monday – Friday: 08:30 – 19:30',
    maxBookingDuration: '6 hours / day',
    quantity: 1,
    condition: 'good',
  },
];

async function seed() {
  console.log('====================================================');
  console.log('🌱 Starting Resource Sharing Platform Safe Seeder');
  console.log('====================================================\n');

  const conn = await connectDB();
  if (!conn) {
    console.error('❌ Database connection unavailable. Aborting seed operation.');
    process.exit(1);
  }

  try {
    // 1. Ensure a designated institutional custodian user exists
    const custodianEmail = 'custodian@institutional-sharing.edu';
    let custodian = await User.findOne({ email: custodianEmail });

    if (!custodian) {
      custodian = await User.create({
        name: 'Facility Equipment Custodian',
        email: custodianEmail,
        password: 'InstitutionalCustodianSecret2026!',
        role: 'user',
      });
      console.log(`✅ Created institutional seed custodian: ${custodian.email}`);
    } else {
      console.log(`ℹ️  Using existing seed custodian: ${custodian.email}`);
    }

    // 2. Insert sample resources safely using slug deduplication
    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of INITIAL_SAMPLE_CATALOG) {
      const existing = await Resource.findOne({ slug: item.slug });

      if (existing) {
        skippedCount++;
      } else {
        await Resource.create({
          ...item,
          owner: custodian._id,
          isSample: true,
        });
        insertedCount++;
        console.log(`  + Seeded: ${item.title}`);
      }
    }

    console.log('\n----------------------------------------------------');
    console.log(`✅ Seeding Complete: ${insertedCount} inserted, ${skippedCount} skipped (already present).`);
    console.log('🔒 Existing user-created listings were preserved untouched.');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed, INITIAL_SAMPLE_CATALOG };

