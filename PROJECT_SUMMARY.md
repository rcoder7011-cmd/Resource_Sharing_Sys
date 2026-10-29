# Project Summary: Resource Sharing Platform
## “Unlock Underused Equipment and Spaces”
### CodeHack India 2026 Hackathon

---

## 1. Project Overview

- **Project Name:** Resource Sharing Platform
- **Tagline:** *“Unlock Underused Equipment and Spaces — Transparent Custody, Verified Access, Zero Scheduling Conflicts.”*
- **Track:** Sustainable Campus Infrastructure & Smart Institutional Resource Sharing
- **Repository Path:** `C:\Users\Asus\Desktop\Hackathons\Resourcce sharing platform\`

---

## 2. Problem Statement

Across universities, research institutes, makerspaces, and community innovation hubs, millions of dollars worth of specialized equipment (high-end electron microscopes, multi-GPU computing clusters, spectrometry instruments, audio/video production kits, and specialized laboratory benches) sit idle for over 70% of the academic calendar. 

At the same time, student innovators, interdisciplinary researchers, and cross-departmental teams face severe access hurdles:
1. **Discovery Fragmentation:** No centralized catalog exists; valuable assets remain hidden in departmental silos.
2. **Scheduling Collisions:** Manual email threads or basic spreadsheets fail to prevent double-booking across multi-unit inventories or enforce strict time-window boundaries.
3. **Liability & Dispute Anxiety:** Facility managers and custodians hesitate to loan expensive apparatus due to the lack of an objective, verifiable condition history. When an item is returned damaged, there is no proof of whether degradation occurred before or during the loan period.
4. **Chronic Underutilization:** Departments frequently request budget for new equipment that identical labs across campus already own but underuse.

---

## 3. Target Users

| User Persona | Context | Key Pain Point Addressed |
|---|---|---|
| **Borrowers (Students & Researchers)** | Students, doctoral researchers, and visiting scholars needing temporary access to high-end assets. | Eliminates bureaucratic gatekeeping; provides transparent slot reservation with verifiable custody receipts. |
| **Resource Custodians (Lab Managers & Owners)** | Faculty, laboratory managers, and equipment technicians responsible for asset maintenance. | Protects assets with verified condition handovers, clear research justifications, and automated capacity enforcement. |
| **Institutional Administrators** | Deans of research, department chairs, and campus facilities directors. | Provides platform-wide utilization metrics, audit logs, and actionable intelligence to identify and salvage underused capital. |

---

## 4. Proposed Solution & Value Proposition

The **Resource Sharing Platform** is a full-stack, trust-first institutional custody and sharing platform. It transforms idle physical capital into shared, discoverable community assets through:
- **Centralized Multi-Campus Catalog:** Rich specifications, dynamic filtering, real-time availability badges, and offline-resilient browsing.
- **Mathematical Interval Scheduling:** Strict backend validation that rejects overlapping time-windows and respects multi-unit capacities.
- **Two-Point Verifiable Handover:** Photo-documented pickup and return condition checks with non-punitive wear-and-tear classification.
- **Active Utilization Intelligence:** Algorithmic identification of underused assets to actively boost campus asset efficiency.
- **Explainable Need-First Matching:** Deterministic natural language need parsing that connects students directly to available equipment.

---

## 5. Core User Workflow

```
[Borrower / Researcher]
       │
       ▼
1. Discover & Match
   • Enter natural language prompt ("DSLR camera tomorrow at North Campus")
   • System tokenizes intent, queries real-time availability, and returns 0–100 ranked matches
       │
       ▼
2. Slot Reservation
   • Select date, start/end time window, quantity, and research purpose
   • Backend verifies non-overlapping interval capacity -> Creates `pending` booking
       │
       ▼
3. Custodian Review & Real-Time Push
   • Custodian receives instant Socket.IO push notification
   • Reviews purpose & capacity -> Approves booking -> Status: `approved`
       │
       ▼
4. Pickup & Handover Proof (Check-In)
   • Parties meet at physical facility
   • Borrower records initial condition ('excellent', 'good', 'fair') + photo evidence
   • Server timestamps event -> Status: `checked_in` (Active Custody)
       │
       ▼
5. Return & Automated Condition Diff (Check-Out)
   • Equipment returned after usage window
   • Return condition + return photo recorded
   • System calculates degradation diff (`none`, `improved`, `deteriorated`)
   • Status: `completed` -> Inventory immediately released for next borrower
       │
       ▼
6. Dispute Resolution (If Needed)
   • If damaged: Issue report dispatched to Admin Dispute Queue
   • Admin inspects chronological visual timeline and lightbox photo evidence
```

---

## 6. Existing Technology Stack

- **Frontend Client:**
  - **Framework:** React 19 (JavaScript, ES Modules)
  - **Build Tool:** Vite 8.3.5 (Production build compiled in 1.47s)
  - **Routing:** React Router DOM v7 (SPA with Vercel rewrites)
  - **Styling:** Tailwind CSS 3.4 & PostCSS
  - **Icons:** Lucide React (feather-style UI icons)
  - **Animations:** GSAP 3.15 (GreenSock Animation Platform)
  - **Real-Time Client:** Socket.IO Client 4.8.4
  - **Static Analysis:** Oxlint (0 errors)

- **Backend Server:**
  - **Runtime:** Node.js (v20+ LTS recommended)
  - **Framework:** Express 4.21.2
  - **Real-Time Engine:** Socket.IO 4.8.4 (Attached to HTTP server with JWT authentication)
  - **Security:** Helmet-style security headers, CORS origin validation, sliding-window rate limiting (`express-rate-limit`), MongoDB URI sanitization
  - **Cron Reminders:** Native timer checking upcoming booking return deadlines every 10 minutes

- **Database Layer:**
  - **Database:** MongoDB Atlas
  - **ODM:** Mongoose 8.10.1
  - **Indexes:** Compound indexes on booking intervals (`resource`, `status`, `startAt`, `endAt`), search text indexes, and audit logs
  - **Resilience:** Graceful HTTP 503 handling when offline; DNS SRV resolution fallback for Windows environments

- **Deployment Architecture:**
  - **Frontend:** Vercel SPA configuration (`client/vercel.json`) with root rewrite to `/index.html` and security headers
  - **Backend:** Render Web Service blueprint (`render.yaml`) with health check probes (`/api/health` and `/api/health/ready`)

---

## 7. Main Modules

1. **Authentication & Authorization (`server/src/controllers/authController.js`):**
   - JWT authentication (`1d` expiration), bcrypt password hashing (10 salt rounds), secure profile serialization stripping passwords.
   - Strict RBAC middleware: `protect` (authenticated users), `requireAdmin` (system administrators), `optionalProtect` (guest vs authenticated matching).
2. **Resource Catalog (`server/src/controllers/resourceController.js`):**
   - Full CRUD, campus filtering, category classification, multi-image arrays, and inventory quantity management.
3. **Booking Lifecycle Engine (`server/src/controllers/bookingController.js`):**
   - Mathematical overlap collision detection (`startA < endB && endA > startB`), multi-unit capacity tracking, approval, rejection, and cancellation.
4. **Real-Time Notification System (`server/src/controllers/notificationController.js` & `server/src/socket.js`):**
   - Dual-write architecture: notifications persisted in MongoDB and pushed over Socket.IO to private user rooms (`user:<userId>`).
5. **Administrative Governance (`server/src/controllers/adminController.js`):**
   - Aggregated platform analytics, user role updates, account suspension guards, listing moderation, dispute management, and immutable audit logging.

---

## 8. The Three Key Differentiating Features

### Feature A: Smart Resource Rescue (Part 11)
- **What It Does:** Continuously tracks actual booked hours versus declared available hours over 30, 60, and 90-day rolling evaluation windows to uncover underutilized assets.
- **Implementation Mechanics:**
  - Calculates utilization percentage: `(totalBookedHours / totalAvailableHours) * 100`.
  - Classifies resources into three tiers:
    - `well_utilized` (>= 50%)
    - `moderately_utilized` (20% – 49%)
    - `underused` (< 20%)
  - Assigns confidence ratings based on booking volume to avoid false alerts on newly added listings.
  - Automatically generates contextual salvage recommendations (e.g., cross-departmental sharing, extended operating hours, featured discovery promotion).
  - Surfaces underutilized badges directly to custodians on their personal dashboard (`/dashboard`) and gives administrators a macro campus view (`/admin`).

### Feature B: Proof-Based Handover & Return Verification (Part 12)
- **What It Does:** Creates an indisputable, timestamped custody history at both pickup (check-in) and return (check-out) to prevent damage disputes and eliminate equipment loan anxiety.
- **Implementation Mechanics:**
  - **Two-Point Verification:** Mandatory logging of physical condition (`excellent`, `good`, `fair`, `damaged`) and photo evidence at pickup and return.
  - **Automated Condition Diff:** Evaluates condition progression and flags transitions:
    - `none`: Conditions match or show negligible wear.
    - `improved`: Equipment was cleaned or repaired during loan.
    - `deteriorated`: Observable physical degradation detected.
  - **Non-Punitive Degradation Philosophy:** Explicitly distinguishes normal academic wear-and-tear from actionable physical damage, protecting students from unfair financial penalties.
  - **Chronological Visual Timeline:** Assembles a 6-milestone visual audit trail (`booking_requested`, `booking_approved`, `handover_proof_submitted`, `checked_in`, `return_proof_submitted`, `checked_out`).
  - **Lightbox Evidence Inspector:** Full-screen modal allowing administrators and custodians to inspect high-resolution photo evidence, timestamps, and actor roles.

### Feature C: Need-First Smart Resource Matching (Part 13)
- **What It Does:** Allows users to describe what they need in conversational plain text and immediately returns ranked, eligible resources with transparent, explainable match scores.
- **Implementation Mechanics (Transparent Rule-Based Architecture):**
  - **No Black-Box or External AI:** Uses a deterministic, rule-based Natural Language Processing (NLP) tokenizer and keyword intent classifier.
  - **Intent & Category Extraction:** Matches user input against normalized synonym dictionaries to extract categories (`Cameras`, `Computers`, `Laboratories`, etc.), activity intents (`recording`, `testing`, `computing`, `collaboration`), and campus locations.
  - **Deterministic 0–100 Scoring Model:**
    - Category Match: +35 points
    - Activity Intent Overlap: Up to +25 points
    - Campus Proximity: +15 points
    - Availability & Capacity: +15 points
    - Smart Resource Rescue Boost: +10 points (prioritizes underutilized assets to balance campus load)
  - **Live Boundary Capacity Check:** Evaluates overlapping bookings in the requested time window; fully occupied resources are excluded from direct matches and suggested under Alternative Recommendations with honest explanations.

---

## 9. Security, Privacy & Compliance Considerations

- **Defense-in-Depth HTTP Perimeter:** Helmet-compliant security headers (`nosniff`, `DENY` framing, XSS filtering).
- **Brute-Force & Abuse Prevention:** In-memory sliding-window rate limiters on API routes (100 req/15 min) and auth routes (15 req/15 min).
- **Strict Role Isolation:** Public registration cannot assign administrative privileges; admin accounts are provisioned exclusively through secure CLI scripts (`npm run seed:admin`).
- **Administrative Safety Guards:** Prevents self-demotion, self-suspension, or demoting the last active administrator on the platform.
- **Zero Secret Exposure:** Automatic URI redaction in database error logging; `.env` strictly excluded from version control via `.gitignore`.
- **Private Data Protection:** Passwords securely hashed with bcrypt; user serialization strips internal attributes and password hashes before returning HTTP responses.

---

## 10. Current Implementation Status

All 14 implementation and integration phases are complete and verified:
- **Automated Test Results:** **448 Passed, 0 Failed across 11 test suites** (`server/src/tests/index.js`).
- **Frontend Code Quality:** **0 Lint Errors** via Oxlint; production bundle built cleanly in **1.47s** via Vite.
- **Database & Offline Mode:** Live MongoDB Atlas integration verified; offline 503 fallback mode verified.
- **Demo Scenario Readiness:** Repeatable, idempotent demo seeder (`npm run seed:demo`) populated with 3 dedicated personas and 5 distinct booking scenarios.

---

## 11. Known Limitations & Future Roadmap

### Current Limitations
1. **Local Evidence Photo Storage:** Evidence photos are stored on the local filesystem (`server/uploads/evidence/`). On ephemeral cloud containers (e.g., standard free-tier Render instances), local files reset if the container restarts.
2. **Single-Process WebSocket Architecture:** Socket.IO runs within the single Node.js process; horizontal multi-instance scaling requires a Redis adapter.
3. **Email Notifications:** Alerts currently delivered via real-time WebSockets and persistent in-app notifications; transactional SMTP email dispatch is designed for the next release.

### Future Roadmap
1. **Cloud Object Storage (S3 / Cloud Storage):** Presigned URL uploads for direct-to-cloud photo evidence storage.
2. **Physical QR Code Asset Handover:** Mobile QR code generation on booking cards for rapid camera-tap pickup and return verification.
3. **Institutional Single Sign-On (SSO):** SAML 2.0 and OAuth2 integration with Google Workspace for Education and Microsoft Entra ID.
4. **Inter-Departmental Recharge Billing:** Automated internal cost-center accounting for specialized consumable materials.

