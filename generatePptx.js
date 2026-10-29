/**
 * Standalone Generator for Resource_Sharing_Platform_Hackathon.pptx
 * Generates an editable, modern 16:9 widescreen OpenXML presentation package.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const submissionDir = path.join(__dirname, 'submission');
const buildDir = path.join(__dirname, 'pptx_build_temp');
const outputPptx = path.join(submissionDir, 'Resource_Sharing_Platform_Hackathon.pptx');

if (!fs.existsSync(submissionDir)) {
  fs.mkdirSync(submissionDir, { recursive: true });
}

if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Widescreen 16:9 in EMUs: 12,192,000 x 6,858,000
const SLIDE_WIDTH = 12192000;
const SLIDE_HEIGHT = 6858000;

// Palette definitions (Modern Tech Hackathon Dark Theme)
const COLORS = {
  bgDark: '0B1120',      // Slate 950 deep background
  cardBg: '1E293B',      // Slate 800 card fill
  cardBorder: '334155',  // Slate 700 border
  cardBgLight: '0F172A', // Slate 900 sub-card
  primaryBlue: '3B82F6', // Blue 500
  accentPurple: '8B5CF6',// Purple 500
  accentEmerald: '10B981',// Emerald 500
  accentAmber: 'F59E0B', // Amber 500
  textWhite: 'FFFFFF',   // Bright white
  textLight: 'F1F5F9',   // Slate 100
  textMuted: '94A3B8',   // Slate 400
  textDim: '64748B',     // Slate 500
};

// Slide definitions (14-Slide Sequence for CodeHack India 2026)
const SLIDES = [
  // SLIDE 1: Title & Tagline
  {
    title: 'Resource Sharing Platform',
    category: 'CODEHACK INDIA 2026 • HACKATHON SHOWCASE',
    elements: [
      {
        type: 'heroCard',
        x: 1000000,
        y: 1200000,
        cx: 10192000,
        cy: 4500000,
        title: 'Resource Sharing Platform',
        subtitle: 'Unlock Underused Equipment and Spaces',
        tagline: 'Transparent Custody, Verified Access & Zero Scheduling Conflicts',
        badges: [
          { text: 'Full-Stack React 19 + Node.js + MongoDB Atlas', color: COLORS.primaryBlue },
          { text: 'Real-Time Socket.IO Push Notifications', color: COLORS.accentPurple },
          { text: '448 Automated Tests Passing (0 Failures)', color: COLORS.accentEmerald },
        ],
        author: 'Track: Sustainable Campus Infrastructure & Smart Institutional Resource Sharing',
      },
    ],
    notes: 'Welcome judges. The Resource Sharing Platform transforms high-value idle institutional equipment into shared, accountable community assets.',
  },

  // SLIDE 2: Problem Statement
  {
    title: 'The Campus Equipment Paradox',
    category: 'PROBLEM STATEMENT & MOTIVATION',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'BARRIER 1',
        badgeColor: 'EF4444',
        heading: 'Severe Asset Idleness',
        bullets: [
          'High-value specialized apparatus sits idle over 70% of the academic year.',
          'Equipment availability trapped in departmental spreadsheets or word-of-mouth.',
          'Students and researchers face immense gatekeeping and artificial scarcity.',
          'Duplicative grant purchases waste scarce institutional capital.',
        ],
      },
      {
        type: 'card',
        x: 4500000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'BARRIER 2',
        badgeColor: COLORS.accentAmber,
        heading: 'Fear of Damage Disputes',
        bullets: [
          'Custodians hesitate to loan expensive gear due to liability fears.',
          'No standardized digital check-in or photo inspection protocol.',
          'Disputes arise over whether scratches or defects were pre-existing.',
          'Informal paper sign-out clipboards lack verifiable accountability.',
        ],
      },
      {
        type: 'card',
        x: 8000000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'BARRIER 3',
        badgeColor: COLORS.primaryBlue,
        heading: 'Scheduling Collisions',
        bullets: [
          'Simple calendar tools cannot enforce multi-unit inventory capacities.',
          'Overlapping booking requests lead to frustrating double-bookings.',
          'Custodians lack dedicated workflows to review research purposes.',
          'Zero automated alerts when return deadlines are approaching.',
        ],
      },
    ],
    notes: 'The core paradox is that high-end equipment is idle while researchers are blocked. The root blockers are visibility, damage liability, and scheduling math.',
  },

  // SLIDE 3: Target Users & Personas
  {
    title: 'Designed for Institutional Collaboration',
    category: 'TARGET STAKEHOLDERS & PERSONAS',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'BORROWER',
        badgeColor: COLORS.primaryBlue,
        heading: 'Students & Innovators',
        bullets: [
          'Conversational plain-text need matching across campus facilities.',
          'Transparent slot reservation with 15-minute minimum increments.',
          'Clear safety levels, prerequisites, and operating hours.',
          'Server-stamped check-in receipt protects against unfair damage blame.',
        ],
      },
      {
        type: 'card',
        x: 4500000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'CUSTODIAN',
        badgeColor: COLORS.accentEmerald,
        heading: 'Lab Managers & Faculty',
        bullets: [
          'Granular review queue to approve or reject with written justification.',
          'Automated multi-unit capacity enforcement prevents double-bookings.',
          'Initial vs. return condition diff highlights deterioration.',
          'Instant Socket.IO alerts for all booking lifecycle events.',
        ],
      },
      {
        type: 'card',
        x: 8000000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'GOVERNANCE',
        badgeColor: COLORS.accentPurple,
        heading: 'Deans & Administrators',
        bullets: [
          'Campus-wide Smart Resource Rescue intelligence (<20% underused detection).',
          'Platform analytics on utilization trends and category distributions.',
          'Account suspension and role management with self-demotion guards.',
          'Append-only immutable audit trail for governance compliance.',
        ],
      },
    ],
    notes: 'Our platform coordinates three distinct user roles: borrowers get transparent access, custodians get custody protection, and administrators get full governance visibility.',
  },

  // SLIDE 4: Proposed Solution
  {
    title: 'The Unified Resource Sharing Solution',
    category: 'SOLUTION OVERVIEW & VALUE PROPOSITION',
    elements: [
      {
        type: 'featureBox',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 1950000,
        icon: '🔍',
        title: 'Centralized Institutional Catalog',
        desc: 'Discover available scientific, computational, and media resources with multi-campus filters, technical specs, and live availability indicators.',
      },
      {
        type: 'featureBox',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 1950000,
        icon: '🛡️',
        title: 'Mathematical Interval Scheduling',
        desc: 'Calculates active overlapping time windows against declared inventory capacity, completely eliminating double-bookings across multi-unit assets.',
      },
      {
        type: 'featureBox',
        x: 1000000,
        y: 3850000,
        cx: 4900000,
        cy: 1950000,
        icon: '📋',
        title: 'Two-Point Verifiable Handover',
        desc: 'Mandatory pickup and return condition checks with photo evidence, timestamped custody receipts, and automated deterioration detection.',
      },
      {
        type: 'featureBox',
        x: 6300000,
        y: 3850000,
        cx: 4900000,
        cy: 1950000,
        icon: '⚡',
        title: 'Dual-Write Real-Time Alerts',
        desc: 'Socket.IO pushes notifications directly to private user rooms with guaranteed MongoDB persistence, ensuring zero dropped alerts.',
      },
    ],
    notes: 'The solution combines multi-campus discovery, interval capacity scheduling, verifiable condition handover, and persistent real-time notifications.',
  },

  // SLIDE 5: Architecture & Security Perimeter
  {
    title: 'Full-Stack Architecture & Defense-in-Depth',
    category: 'SYSTEM ARCHITECTURE & SECURITY',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'FRONTEND SPA',
        badgeColor: COLORS.primaryBlue,
        heading: 'React 19 + Vite 8',
        bullets: [
          'Tailwind CSS 3.4 + GSAP dynamic animation tokens.',
          'React Router v7 with deep SPA rewrite fallback (vercel.json).',
          'AuthContext (JWT session lifecycle & auto-logout).',
          'NotificationContext (Socket.IO client & unread sync).',
          'Sub-2-second Vite production build (0 errors).',
        ],
      },
      {
        type: 'card',
        x: 4500000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'BACKEND API',
        badgeColor: COLORS.accentEmerald,
        heading: 'Node.js + Express 4.21',
        bullets: [
          'Native OWASP Security Headers (CSP, HSTS, NoSniff).',
          'Sliding-window rate limiters (100 req/15m API, 15 req/15m auth).',
          'Recursive NoSQL injection payload sanitization.',
          'Dual cloud probes: /api/health (liveness) & /ready (readiness).',
          'Centralized URI secret scrubbing [REDACTED_DATABASE_URI].',
        ],
      },
      {
        type: 'card',
        x: 8000000,
        y: 1600000,
        cx: 3200000,
        cy: 4200000,
        badge: 'DATA & REAL-TIME',
        badgeColor: COLORS.accentPurple,
        heading: 'MongoDB Atlas + Socket.IO',
        bullets: [
          'Mongoose 8 schemas: User, Resource, Booking, Notification, AuditLog.',
          'Compound indexes on interval overlap and user dashboard queries.',
          'Configurable Windows c-ares DNS vs Linux container host DNS.',
          'Socket.IO authenticated handshake with user:<userId> room isolation.',
          'Idempotent seed scripts: seedAdmin.js & seedDemoData.js.',
        ],
      },
    ],
    notes: 'Our architecture enforces defense-in-depth: zero-dependency native security middleware, separate cloud probes, and strict persistence before socket delivery.',
  },

  // SLIDE 6: Core User Workflow
  {
    title: 'The Verified Resource Loan Lifecycle',
    category: 'END-TO-END WORKFLOW SOLUTION',
    elements: [
      {
        type: 'stepCard',
        x: 800000,
        y: 1700000,
        cx: 2000000,
        cy: 4000000,
        step: '01',
        title: 'Match',
        desc: 'Enter plain-text prompt. Engine extracts category, intent, and proximity with live availability check.',
      },
      {
        type: 'stepCard',
        x: 3000000,
        y: 1700000,
        cx: 2000000,
        cy: 4000000,
        step: '02',
        title: 'Reserve',
        desc: 'Select date, time window, and stated purpose. Backend validates overlap math against inventory capacity.',
      },
      {
        type: 'stepCard',
        x: 5200000,
        y: 1700000,
        cx: 2000000,
        cy: 4000000,
        step: '03',
        title: 'Approve',
        desc: 'Owner reviews purpose and capacity. Approves or rejects with justification. Live Socket.IO alerts notify borrower.',
      },
      {
        type: 'stepCard',
        x: 7400000,
        y: 1700000,
        cx: 2000000,
        cy: 4000000,
        step: '04',
        title: 'Pickup',
        desc: 'Borrower logs initial condition and attaches photo evidence. Server stamps custody handover into visual timeline.',
      },
      {
        type: 'stepCard',
        x: 9600000,
        y: 1700000,
        cx: 2000000,
        cy: 4000000,
        step: '05',
        title: 'Return',
        desc: 'Borrower logs return condition + photo. System computes degradation diff. Capacity is instantly released.',
      },
    ],
    notes: 'The 5-step lifecycle bridges the trust gap: from self-service reservation to server-certified check-in, custodian approval, and automated return comparison.',
  },

  // SLIDE 7: Differentiator 1 - Smart Resource Rescue
  {
    title: 'Differentiator 1: Smart Resource Rescue',
    category: 'PART 11 • UNDERUSED RESOURCE INTELLIGENCE',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'ACTIVE TELEMETRY',
        badgeColor: COLORS.accentAmber,
        heading: 'Algorithmic Utilization Tracking',
        bullets: [
          'Tracks booked hours against declared available hours over 30, 60, and 90 days.',
          'Classifies assets into well_utilized (>=50%), moderately_utilized (20-49%), and underused (<20%).',
          'Confidence scoring avoids false alarms on newly listed equipment.',
          'Eliminates campus capital waste by highlighting salvageable equipment capacity.',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'PRACTICAL ACTIONS',
        badgeColor: COLORS.accentEmerald,
        heading: 'Data-Driven Salvage Actions',
        bullets: [
          'Cross-Department Promotion: Suggests sharing with adjacent engineering programs.',
          'Schedule Optimization: Recommends expanding evening or weekend operating hours.',
          'Search Prioritization: Automatically injects underused assets into Need-First Matching (+10 pts).',
          'Dual Visibility: Surfaced to custodians on personal dashboards and to deans on Admin portal.',
        ],
      },
    ],
    notes: 'Smart Resource Rescue actively fights campus capital waste by identifying underutilized equipment and providing actionable recommendations to boost utilization.',
  },

  // SLIDE 8: Differentiator 2 - Proof-Based Handover
  {
    title: 'Differentiator 2: Proof-Based Handover',
    category: 'PART 12 • TRANSPARENT CUSTODY & RETURN VERIFICATION',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'TWO-POINT AUDIT',
        badgeColor: COLORS.primaryBlue,
        heading: 'Verifiable Photo Handover',
        bullets: [
          'Mandatory photo evidence and condition rating (excellent/good/fair/damaged) at pickup.',
          'Return check-out captures return condition and return photo evidence.',
          'Server-stamped custody timestamps eliminate client clock spoofing.',
          'Automated diff engine compares states (none, improved, or deteriorated).',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'TRUST PROTOCOL',
        badgeColor: COLORS.accentPurple,
        heading: 'Non-Punitive Wear & Visual Timeline',
        bullets: [
          'Non-punitive philosophy distinguishes normal academic wear from actual physical damage.',
          'Chronological visual timeline aggregates 6 milestones into an indisputable custody record.',
          'Full-screen Lightbox Inspector displays high-resolution photos with metadata.',
          'Structured incident dispute pipeline routes flagged damage directly to admin review.',
        ],
      },
    ],
    notes: 'Proof-Based Handover eliminates loan anxiety. Two-point photo evidence and automated condition comparison create an indisputable audit trail.',
  },

  // SLIDE 9: Differentiator 3 - Need-First Smart Matching
  {
    title: 'Differentiator 3: Need-First Smart Matching',
    category: 'PART 13 • RULE-BASED NLP & CAPACITY ENGINE',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'CONVERSATIONAL NLP',
        badgeColor: COLORS.accentEmerald,
        heading: 'Deterministic Plain-Text Matching',
        bullets: [
          'Students describe needs: "DSLR camera tomorrow at North Campus for event recording".',
          'Rule-based tokenizer extracts category (Cameras), intent (recording), and campus location.',
          'Transparent rule-based engine: 100% deterministic, zero external AI fees, zero hallucination.',
          'Graceful fallback suggestions when queries omit specific attributes.',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'EXPLAINABLE SCORING',
        badgeColor: COLORS.primaryBlue,
        heading: '0–100 Score & Conflict Checking',
        bullets: [
          'Transparent scoring: Category (+35), Intent (+25), Proximity (+15), Availability (+15), Rescue (+10).',
          'Evaluates overlapping reservations in requested window; fully booked items excluded from direct matches.',
          'Alternative recommendations offer available dates or related equipment when top choice is booked.',
          'Direct One-Click Reservation pre-fills booking window directly from search result.',
        ],
      },
    ],
    notes: 'Need-First Smart Matching allows conversational plain-text discovery with an explainable 0-100 score and real-time conflict-free capacity checks.',
  },

  // SLIDE 10: Security & Privacy
  {
    title: 'Institutional Security & Defensible Data',
    category: 'SECURITY PERIMETER & GOVERNANCE',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'PERIMETER DEFENSE',
        badgeColor: COLORS.primaryBlue,
        heading: 'Zero-Dependency Native Security',
        bullets: [
          'Native OWASP Security Headers (nosniff, DENY framing, XSS filtering).',
          'In-memory sliding-window rate limiters (100 req/15m API, 15 req/15m auth).',
          'Recursive NoSQL injection sanitization purges $ and . operator keys.',
          'Centralized error scrubbing redacts connection URIs [REDACTED_DATABASE_URI].',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'GOVERNANCE GUARDS',
        badgeColor: COLORS.accentPurple,
        heading: 'Role Separation & Auditability',
        bullets: [
          'Public registration strictly assigns standard "user" role; admin requires secure CLI seed.',
          'Admin safety guards prevent self-demotion, self-suspension, or demoting the last admin.',
          'Server-stamped timestamps ensure client clocks can never falsify handover records.',
          'Append-only immutable AuditLog records all role, moderation, and dispute actions.',
        ],
      },
    ],
    notes: 'Trust requires absolute security. All timestamps are server-generated, admin accounts are protected, and sensitive URIs are automatically redacted.',
  },

  // SLIDE 11: Testing & Verified Results
  {
    title: 'Testing, Quality & Verified Benchmarks',
    category: 'QUALITY ASSURANCE & EMPIRICAL RESULTS',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'REGRESSION PASS',
        badgeColor: COLORS.accentEmerald,
        heading: '448 Passing Automated Tests',
        bullets: [
          '11 comprehensive test suites: auth, resources, bookings, condition, sockets, admin, security, smoke, rescue, proof, matching.',
          '100% deterministic test execution with zero failures across all suites.',
          'Verifies conflict prevention, multi-capacity math, diff calculations, and NLP matching.',
          'Idempotent demo seeder (seedDemoData.js) provides 5 ready-to-present scenarios.',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'BUILD & RESILIENCE',
        badgeColor: COLORS.primaryBlue,
        heading: 'Frontend Build & Offline Fallback',
        bullets: [
          'Vite 8.3.5 production build compiles in 1.47 seconds with zero build errors.',
          'Oxlint static analysis reports 0 errors across all React JSX files.',
          'Offline Sample Mode banner activates automatically if MongoDB disconnects.',
          'Zero external runtime dependencies for rate limiting, security headers, or matching.',
        ],
      },
    ],
    notes: 'Every workflow is empirically tested. 448 passing tests, clean 1.47s production build, zero lint errors, and seamless offline resilience.',
  },

  // SLIDE 12: Expected Impact & Pilot Metrics
  {
    title: 'Measurable Campus Impact Framework',
    category: '90-DAY PILOT MEASUREMENT PLAN',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'TARGET METRICS',
        badgeColor: COLORS.accentEmerald,
        heading: '90-Day Empirical Pilot Targets',
        bullets: [
          'Capital Efficiency: +35% to +50% increase in average asset operating hours.',
          'Cross-Disciplinary Access: >=40% of loans originating from outside owning department.',
          'Dispute Reduction: <2% unresolved damage disputes through two-point photo evidence.',
          'Discovery Velocity: Reduce booking lead time from multiple days to under 3 minutes.',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'INSTITUTIONAL VALUE',
        badgeColor: COLORS.primaryBlue,
        heading: 'Economic & Environmental Return',
        bullets: [
          'Maximizes institutional capital return without redundant hardware purchases.',
          'Reduces campus electronic waste by extending operational lifespan of equipment.',
          'Democratizes research tools for undergraduate innovators and early-stage researchers.',
          'Eliminates clipboard bureaucracy and saves facility staff hundreds of administrative hours.',
        ],
      },
    ],
    notes: 'Rather than fabricating user counts, we propose an empirical 90-day pilot framework measuring utilization gains, cross-department borrows, and dispute reduction.',
  },

  // SLIDE 13: Limitations & Roadmap
  {
    title: 'Honest Assessment & Future Roadmap',
    category: 'LIMITATIONS & POST-HACKATHON SCOPE',
    elements: [
      {
        type: 'card',
        x: 1000000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'CURRENT REALITIES',
        badgeColor: COLORS.accentAmber,
        heading: 'Current Implementation Boundaries',
        bullets: [
          'Condition Photos: Stored on local container disk; S3 presigned direct uploads planned.',
          'Socket Deployment: Single-server process; Redis adapter designed for horizontal scale.',
          'Email Notifications: In-app Socket.IO push alerts; external SMTP email is planned.',
          'Verified Quality: 448 automated tests passing; 0 linter errors; 1.47s production build.',
        ],
      },
      {
        type: 'card',
        x: 6300000,
        y: 1600000,
        cx: 4900000,
        cy: 4200000,
        badge: 'ROADMAP',
        badgeColor: COLORS.primaryBlue,
        heading: 'Post-Hackathon Development Roadmap',
        bullets: [
          'Phase 1 (30 Days): Direct AWS S3 / Cloudflare R2 multipart presigned photo uploads.',
          'Phase 2 (60 Days): Mobile QR Code & NFC physical equipment tags for instant tap-to-pickup check-in.',
          'Phase 3 (90 Days): Institutional Single Sign-On (SAML 2.0 / OAuth2 with Google & Microsoft).',
          'Phase 4 (6 Months): Inter-departmental recharge accounting and maintenance tracking.',
        ],
      },
    ],
    notes: 'We are transparent about our boundaries. Today inspection photos use local storage, and sockets run within a single process. Next phases include S3 photo uploads, mobile QR tags, and campus SSO.',
  },

  // SLIDE 14: Conclusion & Demo Call to Action
  {
    title: 'Unlocking Sustainable Innovation',
    category: 'CONCLUSION & VALUE SUMMARY',
    elements: [
      {
        type: 'heroCard',
        x: 1000000,
        y: 1200000,
        cx: 10192000,
        cy: 4500000,
        title: 'Unlock Underused Equipment and Spaces',
        subtitle: 'Economic Return • Environmental Sustainability • Community Innovation',
        tagline: '448 Passing Automated Tests • 100% Conflict-Free Scheduling • Fully Demo Ready',
        badges: [
          { text: 'Maximize Institutional Asset ROI', color: COLORS.accentEmerald },
          { text: 'Reduce Campus Electronic Waste', color: COLORS.primaryBlue },
          { text: 'Empower Student Builders & Researchers', color: COLORS.accentPurple },
        ],
        author: 'Thank you, judges! We look forward to your questions.',
      },
    ],
    notes: 'In conclusion, the Resource Sharing Platform takes multi-thousand dollar equipment out of locked closets and turns it into shared community discovery. Thank you!',
  },
];

// OpenXML XML Generation Helpers
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSlideXml(slide, slideIndex) {
  let shapeId = 2;
  let shapesXml = '';

  // Background rectangle
  shapesXml += `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${shapeId++}" name="Background"/>
        <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="${COLORS.bgDark}"/></a:solidFill>
      </p:spPr>
    </p:sp>`;

  // Category Tag (Header Pill)
  if (slide.category) {
    shapesXml += `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${shapeId++}" name="CategoryTag"/>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="1000000" y="450000"/><a:ext cx="8000000" cy="350000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
        <a:lstStyle/>
        <a:p>
          <a:r>
            <a:rPr lang="en-US" sz="1100" b="1">
              <a:solidFill><a:srgbClr val="${COLORS.primaryBlue}"/></a:solidFill>
            </a:rPr>
            <a:t>${escapeXml(slide.category)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>`;
  }

  // Slide Title
  if (slide.title && slide.elements[0]?.type !== 'heroCard') {
    shapesXml += `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${shapeId++}" name="SlideTitle"/>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="1000000" y="800000"/><a:ext cx="10192000" cy="650000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
        <a:lstStyle/>
        <a:p>
          <a:r>
            <a:rPr lang="en-US" sz="2600" b="1">
              <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
            </a:rPr>
            <a:t>${escapeXml(slide.title)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>`;
  }

  // Process specific element types
  for (const el of slide.elements) {
    if (el.type === 'heroCard') {
      // Background Hero Card
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="HeroCardBg"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x}" y="${el.y}"/><a:ext cx="${el.cx}" cy="${el.cy}"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2500"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="${COLORS.cardBg}"/></a:solidFill>
          <a:ln w="25400"><a:solidFill><a:srgbClr val="${COLORS.cardBorder}"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>`;

      // Hero Title & Text Box
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="HeroText"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x + 500000}" y="${el.y + 600000}"/><a:ext cx="${el.cx - 1000000}" cy="3200000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="3800" b="1">
                <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.title)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr" spaceBefore="150000"/>
            <a:r>
              <a:rPr lang="en-US" sz="2200" b="1">
                <a:solidFill><a:srgbClr val="${COLORS.primaryBlue}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.subtitle)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr" spaceBefore="120000"/>
            <a:r>
              <a:rPr lang="en-US" sz="1400">
                <a:solidFill><a:srgbClr val="${COLORS.textMuted}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.tagline)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr" spaceBefore="300000"/>
            <a:r>
              <a:rPr lang="en-US" sz="1200" i="1">
                <a:solidFill><a:srgbClr val="${COLORS.accentEmerald}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.badges.map(b => '✔ ' + b.text).join('   |   '))}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr algn="ctr" spaceBefore="250000"/>
            <a:r>
              <a:rPr lang="en-US" sz="1100">
                <a:solidFill><a:srgbClr val="${COLORS.textDim}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.author)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
    } else if (el.type === 'card') {
      // 3-Column Card Background
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="CardBg"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x}" y="${el.y}"/><a:ext cx="${el.cx}" cy="${el.cy}"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2000"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="${COLORS.cardBg}"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="${COLORS.cardBorder}"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>`;

      // Badge pill
      if (el.badge) {
        shapesXml += `
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="${shapeId++}" name="Badge"/>
            <p:cNvSpPr/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm><a:off x="${el.x + 250000}" y="${el.y + 250000}"/><a:ext cx="1600000" cy="300000"/></a:xfrm>
            <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 5000"/></a:avLst></a:prstGeom>
            <a:solidFill><a:srgbClr val="${el.badgeColor || COLORS.primaryBlue}"/></a:solidFill>
          </p:spPr>
          <p:txBody>
            <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
            <a:lstStyle/>
            <a:p>
              <a:pPr algn="ctr"/>
              <a:r>
                <a:rPr lang="en-US" sz="900" b="1">
                  <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
                </a:rPr>
                <a:t>${escapeXml(el.badge)}</a:t>
              </a:r>
            </a:p>
          </p:txBody>
        </p:sp>`;
      }

      // Card Header
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="CardHeader"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x + 250000}" y="${el.y + 650000}"/><a:ext cx="${el.cx - 500000}" cy="500000"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="1500" b="1">
                <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.heading)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;

      // Card Bullets
      if (el.bullets && el.bullets.length > 0) {
        shapesXml += `
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="${shapeId++}" name="CardBullets"/>
            <p:cNvSpPr/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm><a:off x="${el.x + 250000}" y="${el.y + 1200000}"/><a:ext cx="${el.cx - 500000}" cy="${el.cy - 1400000}"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            <a:noFill/>
          </p:spPr>
          <p:txBody>
            <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
            <a:lstStyle/>
            ${el.bullets.map(b => `
              <a:p>
                <a:pPr spaceBefore="80000" marL="180000" indent="-180000">
                  <a:buChar char="•"/>
                </a:pPr>
                <a:r>
                  <a:rPr lang="en-US" sz="1100">
                    <a:solidFill><a:srgbClr val="${COLORS.textLight}"/></a:solidFill>
                  </a:rPr>
                  <a:t>${escapeXml(b)}</a:t>
                </a:r>
              </a:p>`).join('')}
          </p:txBody>
        </p:sp>`;
      }
    } else if (el.type === 'stepCard') {
      // 5-Step Process Card
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="StepBg"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x}" y="${el.y}"/><a:ext cx="${el.cx}" cy="${el.cy}"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2500"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="${COLORS.cardBg}"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="${COLORS.cardBorder}"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>`;

      // Step Number Circle
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="StepNumber"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x + 200000}" y="${el.y + 250000}"/><a:ext cx="500000" cy="500000"/></a:xfrm>
          <a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="${COLORS.primaryBlue}"/></a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="ctr"/>
            <a:r>
              <a:rPr lang="en-US" sz="1200" b="1">
                <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.step)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;

      // Step Title & Body
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="StepContent"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x + 200000}" y="${el.y + 900000}"/><a:ext cx="${el.cx - 400000}" cy="${el.cy - 1100000}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="1600" b="1">
                <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.title)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr spaceBefore="120000"/>
            <a:r>
              <a:rPr lang="en-US" sz="1050">
                <a:solidFill><a:srgbClr val="${COLORS.textMuted}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.desc)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
    } else if (el.type === 'featureBox') {
      // 2x2 Feature Grid Box
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="FeatureBg"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x}" y="${el.y}"/><a:ext cx="${el.cx}" cy="${el.cy}"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2000"/></a:avLst></a:prstGeom>
          <a:solidFill><a:srgbClr val="${COLORS.cardBg}"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="${COLORS.cardBorder}"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>`;

      // Icon & Content
      shapesXml += `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${shapeId++}" name="FeatureText"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="${el.x + 300000}" y="${el.y + 250000}"/><a:ext cx="${el.cx - 600000}" cy="${el.cy - 500000}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="1600" b="1">
                <a:solidFill><a:srgbClr val="${COLORS.textWhite}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml((el.icon ? el.icon + ' ' : '') + el.title)}</a:t>
            </a:r>
          </a:p>
          <a:p>
            <a:pPr spaceBefore="100000"/>
            <a:r>
              <a:rPr lang="en-US" sz="1150">
                <a:solidFill><a:srgbClr val="${COLORS.textLight}"/></a:solidFill>
              </a:rPr>
              <a:t>${escapeXml(el.desc)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
    }
  }

  // Footer on slides
  shapesXml += `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${shapeId++}" name="SlideFooter"/>
      <p:cNvSpPr/>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm><a:off x="1000000" y="6200000"/><a:ext cx="10192000" cy="300000"/></a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      <a:noFill/>
    </p:spPr>
    <p:txBody>
      <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
      <a:lstStyle/>
      <a:p>
        <a:r>
          <a:rPr lang="en-US" sz="900">
            <a:solidFill><a:srgbClr val="${COLORS.textDim}"/></a:solidFill>
          </a:rPr>
          <a:t>Resource Sharing Platform • CodeHack India 2026 • Slide ${slideIndex + 1} of ${SLIDES.length}</a:t>
        </a:r>
      </a:p>
    </p:txBody>
  </p:sp>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
      ${shapesXml}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function generateSlideRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function buildOpenXmlStructure() {
  console.log('📦 Building OpenXML presentation components...');

  // Create subdirectories
  const dirs = [
    '_rels',
    'docProps',
    'ppt',
    'ppt/_rels',
    'ppt/slides',
    'ppt/slides/_rels',
    'ppt/slideLayouts',
    'ppt/slideLayouts/_rels',
    'ppt/slideMasters',
    'ppt/slideMasters/_rels',
    'ppt/theme',
  ];

  for (const d of dirs) {
    fs.mkdirSync(path.join(buildDir, d), { recursive: true });
  }

  // 1. [Content_Types].xml
  let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
`;
  for (let i = 1; i <= SLIDES.length; i++) {
    contentTypesXml += `  <Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>\n`;
  }
  contentTypesXml += `</Types>`;
  fs.writeFileSync(path.join(buildDir, '[Content_Types].xml'), contentTypesXml, 'utf8');

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  fs.writeFileSync(path.join(buildDir, '_rels', '.rels'), rootRelsXml, 'utf8');

  // 3. docProps/core.xml
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Resource Sharing Platform - Hackathon Presentation Deck</dc:title>
  <dc:creator>CodeHack India 2026 Team</dc:creator>
  <cp:lastModifiedBy>CodeHack India 2026 Team</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-10-28T18:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-28T18:00:00Z</dcterms:modified>
</cp:coreProperties>`;
  fs.writeFileSync(path.join(buildDir, 'docProps', 'core.xml'), coreXml, 'utf8');

  // 4. docProps/app.xml
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <TotalTime>0</TotalTime>
  <Words>0</Words>
  <Application>Microsoft Office PowerPoint</Application>
  <PresentationFormat>Widescreen</PresentationFormat>
  <Paragraphs>0</Paragraphs>
  <Slides>${SLIDES.length}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>Office Theme</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company>Resource Sharing Platform</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;
  fs.writeFileSync(path.join(buildDir, 'docProps', 'app.xml'), appXml, 'utf8');

  // 5. ppt/presentation.xml
  let presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
`;
  for (let i = 1; i <= SLIDES.length; i++) {
    presentationXml += `    <p:sldId id="${255 + i}" r:id="rId${1 + i}"/>\n`;
  }
  presentationXml += `  </p:sldIdLst>
  <p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', 'presentation.xml'), presentationXml, 'utf8');

  // 6. ppt/_rels/presentation.xml.rels
  let presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
`;
  for (let i = 1; i <= SLIDES.length; i++) {
    presRelsXml += `  <Relationship Id="rId${1 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>\n`;
  }
  presRelsXml += `</Relationships>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', '_rels', 'presentation.xml.rels'), presRelsXml, 'utf8');

  // 7. ppt/theme/theme1.xml
  const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Dark Modern Theme">
  <a:themeElements>
    <a:clrScheme name="Dark Modern Scheme">
      <a:dk1><a:srgbClr val="${COLORS.bgDark}"/></a:dk1>
      <a:lt1><a:srgbClr val="${COLORS.textWhite}"/></a:lt1>
      <a:dk2><a:srgbClr val="${COLORS.cardBg}"/></a:dk2>
      <a:lt2><a:srgbClr val="${COLORS.textLight}"/></a:lt2>
      <a:accent1><a:srgbClr val="${COLORS.primaryBlue}"/></a:accent1>
      <a:accent2><a:srgbClr val="${COLORS.accentEmerald}"/></a:accent2>
      <a:accent3><a:srgbClr val="${COLORS.accentPurple}"/></a:accent3>
      <a:accent4><a:srgbClr val="${COLORS.accentAmber}"/></a:accent4>
      <a:accent5><a:srgbClr val="38BDF8"/></a:accent5>
      <a:accent6><a:srgbClr val="F43F5E"/></a:accent6>
      <a:hlink><a:srgbClr val="${COLORS.primaryBlue}"/></a:hlink>
      <a:folHlink><a:srgbClr val="${COLORS.accentPurple}"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Modern Typography">
      <a:majorFont><a:latin typeface="Segoe UI Semibold"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', 'theme', 'theme1.xml'), themeXml, 'utf8');

  // 8. ppt/slideMasters/slideMaster1.xml
  const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', 'slideMasters', 'slideMaster1.xml'), masterXml, 'utf8');

  const masterRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', 'slideMasters', '_rels', 'slideMaster1.xml.rels'), masterRelsXml, 'utf8');

  // 9. ppt/slideLayouts/slideLayout1.xml
  const layoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', 'slideLayouts', 'slideLayout1.xml'), layoutXml, 'utf8');

  const layoutRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
  fs.writeFileSync(path.join(buildDir, 'ppt', 'slideLayouts', '_rels', 'slideLayout1.xml.rels'), layoutRelsXml, 'utf8');

  // 10. Generate each slide XML & rels
  for (let i = 0; i < SLIDES.length; i++) {
    const slide = SLIDES[i];
    const slideNumber = i + 1;
    const slideXml = generateSlideXml(slide, i);
    fs.writeFileSync(path.join(buildDir, 'ppt', 'slides', `slide${slideNumber}.xml`), slideXml, 'utf8');
    fs.writeFileSync(path.join(buildDir, 'ppt', 'slides', '_rels', `slide${slideNumber}.xml.rels`), generateSlideRelsXml(), 'utf8');
  }

  console.log(`✅ Generated ${SLIDES.length} OpenXML slide definitions.`);
}

function packageToPptx() {
  console.log('📦 Compressing OpenXML package into .pptx archive...');
  if (fs.existsSync(outputPptx)) {
    fs.unlinkSync(outputPptx);
  }

  // Use PowerShell to create the ZIP archive with .pptx extension
  const psCommand = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${buildDir.replace(/\\/g, '/')}', '${outputPptx.replace(/\\/g, '/')}')"`;
  
  execSync(psCommand, { stdio: 'inherit' });

  // Clean up temporary build folder
  fs.rmSync(buildDir, { recursive: true, force: true });

  const stats = fs.statSync(outputPptx);
  console.log(`🎉 Successfully created: ${outputPptx}`);
  console.log(`📊 File Size: ${(stats.size / 1024).toFixed(2)} KB`);
}

try {
  buildOpenXmlStructure();
  packageToPptx();
} catch (err) {
  console.error('❌ Failed to generate presentation:', err.message);
  process.exit(1);
}

