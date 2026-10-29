# Part 12 — Proof-Based Handover & Return Verification

**Resource Sharing Platform — “Unlock Underused Equipment and Spaces”**  
**CodeHack India 2026 Hackathon**

---

## 1. Executive Summary

Part 12 implements **Proof-Based Handover & Return Verification**, establishing an auditable, cryptographic-style chain of custody for shared institutional equipment and spaces.

In high-value academic and research settings (e.g. microscopes, spectrometers, robotic arms, 3D printers, lab benches), disputes over damage, missing accessories, or delayed returns often discourage faculty and custodians from sharing underutilized assets. Part 12 addresses this by:
1. **Recording objective initial condition proof** at pickup / check-in.
2. **Recording objective return condition proof** at handover completion.
3. **Comparing conditions deterministically** without automatically penalizing or blaming borrowers.
4. **Generating an authenticated chronological evidence timeline** capturing every state change, actor, timestamp, note, and photo.
5. **Enabling dispute logging with structured categories and evidence attachments**.
6. **Securing photo evidence** using isolated disk storage and private, authenticated endpoints rather than public S3 buckets or heavy MongoDB Base64 blobs.

---

## 2. System Architecture & Workflow

```
[Borrower Requests Booking]
          │
          ▼
 [Owner / Custodian Approves]
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIAL HANDOVER PROOF (Check-in / Pickup)               │
│ - Actor: Borrower or Custodian                              │
│ - Required: Equipment condition (excellent, good, fair, etc)│
│ - Mandatory: Review & inspection confirmation checkbox      │
│ - Optional: Inspection notes & uploaded evidence photos     │
│ - Tamper-Proof: Server timestamp, duplicate submission lock │
└─────────────────────────────────────────────────────────────┘
          │ (Resource Status: "checked_in" / In-Use)
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. RETURN PROOF & AUDIT (Check-out / Return)                │
│ - Actor: Borrower or Custodian                              │
│ - Required: Final condition verification                    │
│ - Mandatory: Return review confirmation checkbox            │
│ - Deterministic Comparison: Evaluates condition delta       │
│   (degraded, consistent, improved)                         │
│ - Non-Accusatory: Drift does not automatically penalize     │
│ - Optional: Return photos & condition notes                 │
└─────────────────────────────────────────────────────────────┘
          │ (Resource Status: "completed")
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DISPUTE / INCIDENT REPORTING (Optional)                  │
│ - Categories: condition_degradation, physical_damage,       │
│   missing_accessories, late_return, other                   │
│ - Attachments: Private evidence photo archive links         │
│ - Socket.IO: Real-time notification to counterpart          │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CHRONOLOGICAL EVIDENCE TIMELINE                          │
│ - Complete immutable audit trail from request to return     │
│ - Strict server timestamps (client cannot falsify time)     │
│ - Actor role attribution & clickable photo inspect lightbox │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model Schema Extensions

### `server/src/models/Booking.js`

```javascript
// Check-In Subdocument (Initial Handover Proof)
checkIn: {
  checkedInAt: { type: Date },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAndConfirmed: { type: Boolean, default: false },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'damaged'],
  },
  notes: { type: String, maxlength: 1000, default: '' },
  photos: { type: [String], default: [] },
},

// Check-Out Subdocument (Return Proof)
checkOut: {
  checkedOutAt: { type: Date },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAndConfirmed: { type: Boolean, default: false },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'damaged'],
  },
  notes: { type: String, maxlength: 1000, default: '' },
  photos: { type: [String], default: [] },
},

// Deterministic Audit Comparison
conditionComparison: {
  isWorsened: { type: Boolean, default: false },
  difference: { type: String, default: 'none' }, // 'degraded' | 'consistent' | 'improved'
},

// Dispute & Issue Report Subdocument
issueReport: {
  hasIssue: { type: Boolean, default: false },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: {
    type: String,
    enum: [
      'condition_degradation',
      'physical_damage',
      'missing_accessories',
      'late_return',
      'other',
    ],
    default: 'other',
  },
  description: { type: String, maxlength: 2000 },
  photos: { type: [String], default: [] },
  reportedAt: { type: Date },
  status: { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
  resolvedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: { type: String },
}
```

---

## 4. Secure Evidence Storage Architecture

### `server/src/services/evidenceStorageService.js`

To prevent database bloat and unauthorized photo leakage, evidence photos are handled via a dedicated storage service:

1. **Storage Location**: `server/uploads/evidence/` (outside public static directories).
2. **Strict Whitelist**: `image/jpeg`, `image/png`, `image/webp`. Other formats (e.g. PDF, executable payloads) are rejected.
3. **Magic Byte Verification**: Verifies true file headers (`0xFFD8` for JPEG, `0x89504E47` for PNG, `RIFF...WEBP` for WebP) to prevent content-type spoofing.
4. **File Size Cap**: Hard enforcement of 5MB per evidence photo (`5 * 1024 * 1024` bytes).
5. **Cryptographic Naming**: Filenames use `evidence-<cleanBookingId>-<random12BytesHex>.<ext>` to prevent guessable paths.
6. **Path Traversal Protection**: Enforces containment within `UPLOAD_DIR`, rejecting traversal attempts (`../`, `..\`).
7. **Scoped Authorization**: File access checks that the requesting user is the borrower, owner, or platform administrator. Third-party users receive `403 Forbidden`.

---

## 5. API Reference

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings/:id/check-in` | Borrower / Owner | Submit initial handover condition proof |
| `POST` | `/api/bookings/:id/handover-proof` | Borrower / Owner | Alias for handover proof submission |
| `POST` | `/api/bookings/:id/check-out` | Borrower / Owner | Submit return condition proof & run audit |
| `POST` | `/api/bookings/:id/return-proof` | Borrower / Owner | Alias for return proof submission |
| `POST` | `/api/bookings/:id/report-issue` | Borrower / Owner / Admin | Log a structured dispute with category & photos |
| `POST` | `/api/bookings/:id/evidence/upload` | Borrower / Owner / Admin | Upload photo evidence (returns secure relative URL) |
| `GET` | `/api/bookings/:id/evidence/:filename`| Borrower / Owner / Admin | Download/stream private evidence photo |
| `GET` | `/api/bookings/:id/timeline` | Borrower / Owner / Admin | Retrieve full chronological evidence audit trail |
| `GET` | `/api/bookings/:id/proof` | Borrower / Owner / Admin | Retrieve handover & return proof records |
| `GET` | `/api/bookings/:id/issue` | Borrower / Owner / Admin | Retrieve detailed dispute report |

---

## 6. Frontend UI Components

### `client/src/pages/DashboardPage.jsx`

1. **Booking Action Buttons**:
   - Added **"Timeline"** button (`History` icon) to all booking cards in **My Bookings** (Tab 2) and **Incoming Requests** (Tab 3).
   - Allows custodians and borrowers to inspect the audit log at any stage.
2. **Enhanced Check-in Modal**:
   - Condition radio selector (`excellent`, `good`, `fair`, `damaged`).
   - Private photo upload picker with thumbnail preview and removal.
   - Handover review confirmation checkbox (mandatory before pickup).
3. **Enhanced Check-out Modal**:
   - Real-time degradation alert if return condition rank is lower than pickup rank.
   - Return evidence photo uploader.
   - Return review confirmation checkbox.
4. **Categorized Issue / Dispute Modal**:
   - Dropdown with 5 structured dispute categories.
   - Objective guidance note to ensure constructive communication.
   - Evidence photo attachment.
5. **Chronological Evidence Timeline Modal**:
   - Displays reservation metadata and audit summary badges.
   - Shows step-by-step audit cards with server timestamps, actor roles, condition badges, and notes.
   - Photo gallery with thumbnail zoom.
6. **Photo Inspection Lightbox**:
   - High-resolution modal viewer for close inspection of condition evidence.

---

## 7. Verification & Automated Testing

### Test Suite: `server/src/tests/proofTest.js`
Registered in the master runner (`server/src/tests/index.js`), verifying:
- ✅ Schema validations for handover proof, return proof, and issue reports.
- ✅ Secure evidence storage (MIME checks, 5MB limits, magic bytes, path traversal rejection).
- ✅ Borrower & owner handover proof submission.
- ✅ 403 Forbidden enforcement against unrelated third-party users.
- ✅ 400 Bad Request rejection for non-approved bookings and duplicate submissions.
- ✅ Return proof validation (requires `checked_in` status).
- ✅ Objective initial vs return condition comparison.
- ✅ Non-punitive degradation handling (no automatic penalties without evidence).
- ✅ Categorized issue report creation and duplicate prevention.
- ✅ Server timestamp enforcement against client override attempts.
- ✅ Authenticated evidence upload & access control.
- ✅ Strict chronological timeline ordering & actor attribution.
- ✅ Database disconnection (503 Service Unavailable) offline guards.

**Test Results**: **73 / 73 passed (100% pass rate)**.

