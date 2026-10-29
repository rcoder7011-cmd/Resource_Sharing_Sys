# Project Submission: Resource Sharing Platform
### CodeHack India 2026 Hackathon

---

## 1. Project Name & Tagline

- **Project Name:** Resource Sharing Platform
- **Tagline:** *“Unlock Underused Equipment and Spaces — Transparent Custody, Verified Access, Zero Scheduling Conflicts.”*

---

## 2. Problem Statement

Across university campuses, research facilities, and community innovation hubs, specialized scientific equipment and technical spaces sit idle up to 70% of the time. Concurrently, student innovators and independent researchers face immense access barriers because they cannot afford six-figure equipment. 

Facility managers hesitate to loan equipment due to the absence of standardized condition verification protocols and fear of unprovable damage disputes. Furthermore, existing calendar tools cannot prevent double-bookings across multi-unit inventories or enforce time-window boundaries.

---

## 3. Solution Overview

The **Resource Sharing Platform** is a full-stack, collaborative custody-management web application engineered for institutions. It bridges the trust gap between asset custodians and researchers through three core pillars:
1. **Mathematical Interval Scheduling:** Enforces multi-unit inventory capacities and rejects overlapping reservation requests on the backend.
2. **Two-Point Condition Handover:** Mandatory check-in (pickup) and check-out (return) condition logs (`excellent`, `good`, `fair`, `damaged`) with an automated deterioration detection diff engine.
3. **Database-First Real-Time Communication:** Persistent MongoDB notification records with synchronized Socket.IO delivery directly to private user rooms.

---

## 4. Target Audience

- **Innovators & Researchers (Borrowers):** Students, faculty, and visiting scholars seeking short-term access to specialized tools with clear custody receipts.
- **Facility Custodians & Lab Managers (Owners):** Department managers requiring granular approval workflows, automated capacity limits, and condition audits.
- **Institutional Administrators:** Deans and campus directors needing platform-wide utilization metrics, user moderation, and compliance audit logs.

---

## 5. Main Features

- **Multi-Campus Catalog Discovery:** Instant keyword search, category filters, campus location hierarchy, and availability indicators.
- **Fail-Safe Offline Mode:** Automatic fallback to sample catalog if database connectivity drops.
- **Conflict-Free Booking Engine:** Strict time-window intersection calculations on the backend.
- **Owner Review Queue:** Custodians review stated research purposes and approve or reject with written justification.
- **Condition Handover & Deterioration Diff:** Server-certified check-in and checkout timestamps with automatic condition discrepancy flagging.
- **Incident Dispute Queue:** Structured issue reporting for damaged equipment with administrative resolution tracking.
- **Persistent Socket.IO Notifications:** Instant alerts across booking lifecycle states with zero message loss.
- **Administrative Portal:** Real-time query aggregations, 30-day analytics, user moderation, and append-only audit logging.

---

## 6. Technology Stack

- **Frontend:** React 19, JavaScript, Vite 8, Tailwind CSS 3.4, React Router v7, Lucide Icons.
- **Backend:** Node.js, Express 4.21, Socket.IO 4.8.
- **Database:** MongoDB Atlas with Mongoose 8.
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs (10 salt rounds).
- **Deployment:** Vercel (Frontend SPA with rewrites) + Render (Containerized Node.js API with readiness probe).

---

## 7. Architecture Summary

The platform uses a decoupled client-server architecture:
- **Client (Vercel):** Single Page Application using `client/vercel.json` for deep SPA routing rewrites and asset security headers.
- **Backend (Render):** Containerized web service managed via `render.yaml`. Includes separate liveness (`/api/health`) and database readiness (`/api/health/ready`) probes.
- **Real-Time Sockets:** Authenticated via JWT handshake; automatically isolated to private rooms (`user:<userId>`).
- **Database Layer:** Hosted on MongoDB Atlas with compound indexes on interval overlap and dashboard query paths.

---

## 8. Security Measures Actually Implemented

- **Zero-Dependency Security Perimeter:** Native Express middleware implementing OWASP security headers (CSP, HSTS, X-Frame-Options, NoSniff).
- **In-Memory Sliding-Window Rate Limiters:** 100 requests / 15 min on `/api/*`; 15 requests / 15 min on `/api/auth/*` (brute-force defense).
- **Recursive NoSQL Injection Sanitization:** Deep-purges `$` and `.` syntax from all request bodies, query params, and route parameters.
- **Centralized Error Scrubbing:** Redacts MongoDB URIs (`[REDACTED_DATABASE_URI]`) and suppresses stack traces in production.
- **Role Isolation:** Public registration strictly assigns standard `user` role; admin accounts can only be provisioned via CLI seed scripts.
- **Defensive Admin Safeguards:** Blocks self-demotion, self-suspension, and demoting the last active platform administrator.

---

## 9. Setup Instructions

Refer to the root [`README.md`](../README.md) for full setup instructions:
```bash
# 1. Install dependencies
npm run install:all

# 2. Configure server/.env and client/.env from .env.example files

# 3. Seed demo accounts and scenario data
npm run seed:demo

# 4. Provision lead administrator
ADMIN_EMAIL=admin@institution.edu ADMIN_PASSWORD=SecurePass123! npm run seed:admin

# 5. Start development servers
npm run dev
```

---

## 10. Verified Testing Status

- **290 Automated Tests Passing (0 Failures)** across 8 independent suites:
  - Part 3 (Authentication & Security): 52 passed
  - Part 4 (Resource Management): 31 passed
  - Part 5 (Booking Capacity Math): 50 passed
  - Part 6 (Condition Handover & Diff): 61 passed
  - Part 7 (Real-Time Socket.IO): 41 passed
  - Part 8 (Admin Dashboard & Analytics): 22 passed
  - Part 9 (Security Hardening): 20 passed
  - Part 10 (End-to-End Integration): 13 passed
- **Frontend Code Linter:** 0 errors reported across all 44 React JSX files.
- **Production Bundle:** Vite v8.3.5 built cleanly in 2.98s (0 errors).

---

## 11. Known Limitations

- **Condition Photographs:** Currently accept image URLs / data URIs; multipart direct-to-S3 presigned uploading is designed for the next phase.
- **Socket Clustering:** Single-server process; horizontal scaling will utilize `@socket.io/redis-adapter`.
- **Email Notifications:** Alerts are delivered via WebSocket and persistent database records; external SMTP transactional email is planned.

---

## 12. Future Enhancements

1. **Direct AWS S3 / Cloudflare R2 Multipart Uploads:** High-resolution inspection photo storage.
2. **Mobile QR Code & NFC Scanning:** Physical asset tags for instant camera tap-to-pickup check-in.
3. **Campus Single Sign-On:** SAML 2.0 / OAuth2 with Google Workspace for Education and Microsoft Entra ID.
4. **Inter-Departmental Recharge Billing:** Automated debiting against university grant account codes.

