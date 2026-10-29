# Resource Sharing Platform — “Unlock Underused Equipment and Spaces”
### CodeHack India 2026 Hackathon Project

A collaborative web platform that enables universities, research institutions, makerspaces, and community organizations to share underused spaces, laboratory equipment, and technical resources safely, sustainably, and efficiently.

---

## 📑 Table of Contents

1. [Platform Overview & Key Features](#-platform-overview--key-features)
2. [Technology Stack](#-technology-stack)
3. [Project Architecture](#-project-architecture)
4. [Installation & Local Setup](#-installation--local-setup)
5. [Starting the Application](#-starting-the-application)
6. [Automated Testing & Verification](#-automated-testing--verification)
7. [Demo Accounts & Safe Seeding](#-demo-accounts--safe-seeding)
8. [Production Deployment (Vercel & Render)](#-production-deployment-vercel--render)
9. [Documentation Directory](#-documentation-directory)
10. [Git Hygiene & Security Guidelines](#-git-hygiene--security-guidelines)

---

## 🌟 Platform Overview & Key Features

- **Multi-Campus Catalog Discovery:** Real-time text search, category filtering, campus location filters, availability status indicators, and graceful offline fallback mode.
- **Intelligent Interval Scheduling:** Backend mathematical interval overlap calculation preventing double-bookings and managing multi-unit inventory capacities.
- **Custodian Review & Approval Workflow:** Dedicated incoming request queue where facility owners review borrower justifications and approve or reject with written reasons.
- **Two-Point Condition Verification Protocol:**
  - *Pickup Check-In:* Borrower records initial condition (`excellent`, `good`, `fair`, `damaged`), notes, and receives a server-certified timestamped custody receipt.
  - *Return Check-Out:* Borrower records return condition; automated diff engine evaluates whether the asset suffered deterioration.
- **Dispute Incident Management:** Structured condition issue logging with severity tracking and administrative resolution notes.
- **Persistent Real-Time Notifications:** MongoDB-backed notification pipeline with synchronized Socket.IO delivery directly to authenticated private rooms (`user:<userId>`).
- **Administrative Portal & Platform Analytics:** Real-time metrics overview, 30-day utilization analytics, user role moderation (self-demotion and last-admin guards), account suspension, listing moderation, and append-only immutable audit logs.
- **Zero-Dependency Security Perimeter:** Native OWASP security headers, sliding-window in-memory IP rate limiting (general API and sensitive auth), recursive NoSQL injection sanitization, centralized URI secret scrubbing, and separate cloud liveness/readiness probes.

---

## 🛠 Technology Stack

### Frontend (`client/`)
- **Framework:** React 19 + Vite 8 (JavaScript)
- **Styling:** Tailwind CSS 3.4 + Custom CSS Design Tokens (Inter Typography)
- **Routing:** React Router v7 with deep SPA rewrites via `client/vercel.json`
- **Real-Time Client:** Socket.IO Client 4.8 with automated reconnection and JWT handshake authentication
- **Icons:** Lucide React

### Backend (`server/`)
- **Runtime:** Node.js 18+ (tested on Node 20 & 24)
- **Framework:** Express.js 4.21
- **Database:** MongoDB Atlas with Mongoose 8
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs (10 salt rounds)
- **Real-Time Engine:** Socket.IO Server 4.8 attached to HTTP server instance
- **Security:** Native zero-dependency Express middleware (OWASP headers, sliding-window rate limiters, NoSQL sanitization)
- **Testing:** Custom zero-dependency test runner with 8 comprehensive integration suites

---

## 📁 Project Architecture

```text
Resourcce sharing platform/
├── client/                     # Frontend React + Vite application
│   ├── public/                 # Static public assets
│   ├── src/
│   │   ├── assets/             # Branding icons and hero imagery
│   │   ├── components/         # Reusable UI components
│   │   │   ├── auth/           # Route guards (ProtectedRoute, AdminRoute)
│   │   │   ├── common/         # Button, Badge, Modal components
│   │   │   ├── home/           # Landing page feature & trust sections
│   │   │   ├── navigation/     # Responsive Navbar & Footer
│   │   │   ├── notifications/  # Real-time NotificationBell dropdown
│   │   │   └── resources/      # ResourceGrid, ResourceCard, Filters, EditModal
│   │   ├── context/            # AuthContext & NotificationContext providers
│   │   ├── data/               # SAMPLE_RESOURCES offline fallback catalog
│   │   ├── layouts/            # MainLayout wrapper
│   │   ├── pages/              # Home, Explore, Details, Dashboard, Admin, Auth, 404
│   │   ├── services/           # API clients (auth, resource, booking, notification, admin)
│   │   └── utils/              # Application constants and helpers
│   ├── .env.example            # Public frontend variable template
│   ├── vercel.json             # Vercel SPA rewrite & header configuration
│   ├── package.json            # Frontend dependencies & scripts
│   └── vite.config.js          # Vite build configuration
│
├── server/                     # Backend Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # Mongoose MongoDB Atlas connection & container DNS
│   │   │   └── env.js          # Boot environment validation & JWT length check
│   │   ├── controllers/        # Health, Auth, Resource, Booking, Notification, Admin
│   │   ├── middleware/         # Security, Auth, Error, NotFound middleware
│   │   ├── models/             # User, Resource, Booking, Notification, AuditLog
│   │   ├── routes/             # Health, Auth, Resource, Booking, Notification, Admin
│   │   ├── scripts/            # seedAdmin.js & seedDemoData.js
│   │   ├── services/           # notificationService.js
│   │   ├── socket/             # Socket.IO connection & room isolation engine
│   │   ├── tests/              # 8 test suites (Parts 3–10) + index.js runner
│   │   ├── app.js              # Express app, security perimeter, parsing
│   │   └── server.js           # Server bootstrap & graceful shutdown
│   ├── .env.example            # Backend environment variable template
│   ├── .gitignore              # Backend secret exclusions (.env)
│   └── package.json            # Backend dependencies & test scripts
│
├── .gitignore                  # Root Git exclusions
├── ARCHITECTURE.md             # In-depth architectural & state diagram document
├── DEMO_GUIDE.md               # 3–5 minute step-by-step presentation script
├── DEPLOYMENT.md               # Cloud deployment guide for Render & Vercel
├── HACKATHON_PITCH.md          # Executive summary, 60-second & 2-minute pitches
├── JUDGE_QA.md                 # 20+ technical answers to evaluator questions
├── PRESENTATION_CONTENT.md     # 10-slide deck content with speaker notes
├── render.yaml                 # Render infrastructure-as-code blueprint
├── SUBMISSION_CHECKLIST.md     # Pre-submission quality assurance checklist
└── package.json                # Monorepo task runner (concurrently)
```

---

## 💻 Installation & Local Setup

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/resource-sharing-platform.git
cd "resource-sharing-platform"

# Install both client and server dependencies
npm run install:all
```

### 2. Configure Environment Variables

**Backend (`server/.env`):**
Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ResourceSharingDb?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_minimum_32_characters_long_for_security!
ENABLE_CUSTOM_DNS=true
```

**Frontend (`client/.env`):**
Create `client/.env` based on `client/.env.example`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Starting the Application

```bash
# Run both frontend and backend concurrently:
npm run dev

# Or run services in separate terminals:
npm run server   # Starts Express + Socket.IO on http://localhost:5000
npm run client   # Starts Vite React dev server on http://localhost:5173
```

Access the application in your browser at `http://localhost:5173`.

---

## 🧪 Automated Testing & Verification

The platform features a zero-dependency automated test runner covering all critical functional paths:

```bash
# Run all 8 test suites:
npm run test:server
```

**Verified Test Suites (290 Tests Passed, 0 Failed):**
- `authTest.js` (Part 3): User schema, bcrypt hashing, JWT validation, suspension lockouts (52 tests).
- `resourceTest.js` (Part 4): Resource model virtuals, campus locations, CRUD authorization (31 tests).
- `bookingTest.js` (Part 5): Multi-unit capacity allocation, overlapping slot math, self-booking rejection (50 tests).
- `conditionTest.js` (Part 6): Check-in/out timestamps, condition diff engine, issue reporting (61 tests).
- `notificationTest.js` (Part 7): Notification persistence, Socket.IO room routing, unread counts (41 tests).
- `adminTest.js` (Part 8): Aggregate metrics, self-demotion guards, last-admin protection, audit logs (22 tests).
- `securityTest.js` (Part 9): OWASP security headers, in-memory rate limiting, NoSQL sanitization (20 tests).
- `integrationTest.js` (Part 10): End-to-end integration contracts, health probes, demo account safety (13 tests).

**Frontend Quality Checks:**
```bash
npm run lint --prefix client    # 0 errors reported by linter
npm run build:client            # Production bundle compiles in under 3 seconds
```

---

## 👥 Demo Accounts & Safe Seeding

To prepare a local or staging database for demonstration with pre-configured resources and distinct booking states (`pending`, `approved`, `checked_in`, `completed`, `issueReport`):

```bash
# Seed non-destructive demo dataset:
npm run seed:demo

# Provision the initial administrator:
ADMIN_EMAIL=admin@institution.edu ADMIN_PASSWORD=SecureAdminPassword123! npm run seed:admin
```

### Pre-Configured Demo Accounts:
| Persona | Email | Password | Primary Purpose |
|---|---|---|---|
| **Borrower** | `borrower.demo@institutional-sharing.edu` | `DemoBorrowerSecret2026!` | Slot reservations, check-in, return handover |
| **Custodian** | `custodian@institutional-sharing.edu` | `InstitutionalCustodianSecret2026!` | Incoming request approvals, real-time alert receipt |
| **Administrator** | `admin@institution.edu` | *(Set via seed command)* | Platform governance, moderation, audit logging |

---

## ☁️ Production Deployment (Vercel & Render)

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for complete cloud setup instructions.

- **Backend (Render):** Automatically configured via [`render.yaml`](render.yaml) with readiness probe at `/api/health/ready`.
- **Frontend (Vercel):** Automatically configured via [`client/vercel.json`](client/vercel.json) with client-side SPA routing rewrites.

---

## 📚 Documentation Directory

- [`HACKATHON_PITCH.md`](HACKATHON_PITCH.md) — Problem statement, solution pillars, value proposition, 60-second and 2-minute spoken pitches.
- [`DEMO_GUIDE.md`](DEMO_GUIDE.md) — Step-by-step 3–5 minute presentation sequence with actions, expected outputs, and fallbacks.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Technical component breakdown, Mermaid topology diagram, and booking lifecycle state machine.
- [`JUDGE_QA.md`](JUDGE_QA.md) — Comprehensive technical defenses for 20+ likely evaluator questions.
- [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) — Pre-submission quality control checklist.
- [`PRESENTATION_CONTENT.md`](PRESENTATION_CONTENT.md) — 10-slide presentation deck content with speaker notes.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Step-by-step cloud production guide with least-privilege Atlas rules.

---

## 🔒 Git Hygiene & Security Guidelines

- `.env` files are excluded by Git (`.gitignore`). Never commit active secrets or database connection strings.
- All request payloads undergo recursive NoSQL sanitization and sliding-window rate limiting.
- Server logs sanitize connection URIs and hide database credentials automatically.
