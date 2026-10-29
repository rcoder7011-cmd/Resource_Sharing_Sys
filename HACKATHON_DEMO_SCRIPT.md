# Live Hackathon Demonstration Script
## Project: Resource Sharing Platform — “Unlock Underused Equipment and Spaces”
### Event: CodeHack India 2026 | Track: Sustainable Campus Infrastructure & Smart Sharing

---

## 1. Introduction & Judge Briefing (30 Seconds)

> *"Good morning, judges. Across our university campuses, millions of dollars of cutting-edge research instruments, media equipment, and laboratory spaces sit idle over 70% of the year. At the same time, student innovators and cross-department researchers face severe gatekeeping, scheduling collisions, and fear of equipment liability.
> 
> We built the **Resource Sharing Platform** to solve this bottleneck. Today, we will walk you through a live, end-to-end demonstration featuring our three core differentiators:
> 1. **Need-First Smart Matching (Part 13):** Natural-language plain-text discovery with an explainable 0–100 score and conflict-free capacity checks.
> 2. **Smart Resource Rescue (Part 11):** Algorithmic underutilization detection (<20%) that actively turns idle hardware into productive campus capacity.
> 3. **Proof-Based Handover (Part 12):** Two-point photo evidence, non-punitive wear-and-tear classification, and an immutable chronological audit trail."*

---

## 2. Pre-Demonstration Setup & Prerequisites

Before bringing judges to the demonstration terminal, ensure:
1. **Backend Server Running:** `npm run server` running on `http://localhost:5000`.
2. **Frontend Client Running:** `npm run client` running on `http://localhost:5173`.
3. **Database Connectivity Checked:** Verify health endpoint `curl http://localhost:5000/api/health/ready` returns `{"status":"ready"}`.
4. **Idempotent Demo Data Seeded:** Run `npm run seed:demo` in terminal to refresh scenario bookings and demo accounts.
5. **Dual-Browser Window Arrangement:**
   - **Window A (Left Half / Standard Browser):** Borrower Persona (`borrower.demo@institutional-sharing.edu`).
   - **Window B (Right Half / Incognito Tab):** Custodian Persona (`custodian@institutional-sharing.edu`).

---

## 3. Required Test Accounts & Personas

*(Note: For security best practices, passwords are provided via safe demonstration defaults or environment variables. Never commit production secrets).*

| Persona | Role | Display Name | Demo Email | Access / Password Guidance |
|---|---|---|---|---|
| **Borrower** | `user` | Dr. Anya Sharma | `borrower.demo@institutional-sharing.edu` | Configured via `seedDemoData.js` (`DemoBorrowerSecret2026!`) |
| **Custodian** | `user` (Resource Owner) | Facility Equipment Custodian | `custodian@institutional-sharing.edu` | Configured via `seedDemoData.js` (`InstitutionalCustodianSecret2026!`) |
| **Administrator** | `admin` | Lead Administrator | `admin@institution.edu` | Configured via `npm run seed:admin` |

---

## 4. Live Demonstration Walkthrough: The 5-Minute Core Scenario

### Step 1: Need-First Smart Resource Matching (Part 13)
*Goal: Show how an undergraduate or researcher finds what they need in conversational plain text with transparent, explainable scoring.*

- **Actor & Window:** Window A (Borrower).
- **Navigation:** Click **Smart Match** in the top navigation bar (or navigate to `http://localhost:5173/match`).
- **Presenter Action:**
  1. Point out the plain-text query input box.
  2. Click the quick prompt chip:
     `📸 DSLR Camera for Campus Fest`: *"I need a high-resolution DSLR camera with lenses for college event recording tomorrow at North Campus"*
  3. Highlight the **Live Need Parser Preview** in real time:
     - **Inferred Category:** `Cameras`
     - **Detected Intent:** `recording`
     - **Target Campus:** `North Campus`
     - **Resource Type:** `equipment`
  4. Click **Find Matching Resources** (or press Enter).
- **Expected Visible Result:**
  - A ranked match card appears displaying **95% Match**.
  - Transparent explainability chips are visible: `Category Match (+35)`, `Campus Proximity (+15)`, `Intent Overlap (+25)`.
  - The live inventory counter verifies: `3 of 3 Units Available (Conflict-Free)`.
  - Notice the amber badge: `Rescued Resource (+10 pts) — Underused asset prioritized for campus efficiency`.
- **Differentiator Explanation:**
  > *"Notice that our matching engine is 100% deterministic and rule-based. There are zero external AI API costs, zero token latency, and zero hallucinations. Every point in the 0–100 score is fully explainable to the researcher and the university."*

---

### Step 2: Underutilized Asset Intelligence — Smart Resource Rescue (Part 11)
*Goal: Demonstrate how the platform actively identifies idle hardware rather than acting as a passive calendar.*

- **Actor & Window:** Window B (Custodian) or Admin Portal (`/admin`).
- **Navigation:** 
  - In Window B (Custodian): Go to **Dashboard** (`http://localhost:5173/dashboard`).
  - In Admin view: Open `http://localhost:5173/admin` and click the **Smart Resource Rescue** tab.
- **Presenter Action:**
  1. In Custodian Dashboard: Point out the amber **Underused (<20% Booked)** alert badge displayed on underutilized listings (e.g., *Biomolecular UV/Vis Spectrophotometer*).
  2. In Admin Portal: Point out the macro metrics:
     - **Campus Utilization Rate**
     - **Underutilized Assets Count**
     - **Potential Salvage Hours**
  3. Click **View Intelligence Breakdown** on an underused asset:
     - Show the **30-Day Activity Breakdown** comparing actual booked hours against declared operating hours.
     - Review the **Contextual Salvage Recommendations**:
       - *"Share access with adjacent bio-engineering research groups."*
       - *"Extend open evening reservation windows."*
       - *"Inject into Need-First Smart Match suggestions with algorithmic priority."*
- **Differentiator Explanation:**
  > *"Universities waste millions purchasing duplicate equipment because departments don't know what sits idle two buildings away. Smart Resource Rescue uses continuous telemetry to surface underused assets and turn idle hardware into productive academic capacity."*

---

### Step 3: Conflict-Free Reservation & Real-Time Socket.IO Alert (Part 5 & 7)
*Goal: Show mathematical overlap prevention and instant cross-screen push notifications.*

- **Actor & Window:** Window A (Borrower) reserving; Window B (Custodian) observing.
- **Presenter Action:**
  1. In Window A, click **Reserve Slot** on an available resource (e.g., *PerkinElmer Lambda 950 Spectrophotometer*).
  2. Select tomorrow's time window (e.g., `10:00 AM – 12:00 PM`), Quantity: `1`, Purpose: *"Thin-film semiconductor absorbance characterization."*
  3. Click **Submit Reservation Request**.
  4. Immediately point judges to **Window B (Custodian screen)**:
     - The notification bell pulses with a red badge count `+1`.
     - A live toast notification appears in real time without refreshing.
  5. In Window B, click **Dashboard > Incoming Requests**.
  6. Review the purpose and click **Approve Reservation**.
  7. Point back to **Window A (Borrower screen)**:
     - The Borrower's notification bell updates instantly: *"Booking Approved by Custodian."*
     - The booking card status transitions to `Approved (Ready for Pickup)`.
- **Expected Visible Result:**
  - Zero double-booking collisions; instant WebSocket synchronization across separate browser sessions.

---

### Step 4: Proof-Based Handover & Pickup Verification (Part 12)
*Goal: Show physical accountability at the exchange moment to eliminate "it was already broken" disputes.*

- **Actor & Window:** Window A (Borrower) — Dashboard > My Bookings.
- **Presenter Action:**
  1. Locate the pre-seeded approved booking for the **Sony FX6 Full-Frame Cinema Camera Kit**.
  2. Click **Record Handover / Pick Up**.
  3. In the modal:
     - Select Initial Condition: `Excellent`.
     - Enter Handover Notes: *"Sensor clean, 24-70mm lens pristine, two 160GB CFexpress cards present, battery at 100%."*
     - Click **Attach Photo Evidence / Upload Proof** (select sample image or camera snapshot).
     - Click **Confirm Equipment Receipt & Custody**.
- **Expected Visible Result:**
  - Booking transitions to `Checked-In (Active Custody)`.
  - A server-certified timestamp is stamped into the custody record.
  - The borrower holds verified custody of the asset.

---

### Step 5: Return Handover, Visual Timeline & Degradation Diff (Part 12)
*Goal: Show the chronological visual timeline, image lightbox, and non-punitive wear-and-tear assessment.*

- **Actor & Window:** Window A (Borrower) — Dashboard > My Bookings.
- **Presenter Action:**
  1. On the active booking (or pre-seeded *Hitachi Scanning Electron Microscope*), click **Return Equipment / Complete Check-Out**.
  2. In the return modal:
     - Select Return Condition: `Good` (or `Excellent`).
     - Enter Return Notes: *"Vacuum chamber pumped down, sample stage reset, optics cleaned."*
     - Click **Attach Return Photo Evidence**.
     - Click **Confirm Return & Release Custody**.
  3. Once completed, click **View Full Handover Timeline & Evidence**:
     - Show the **Chronological Visual Timeline** featuring 6 event milestones:
       1. `booking_requested`
       2. `booking_approved`
       3. `handover_proof_submitted`
       4. `checked_in`
       5. `return_proof_submitted`
       6. `checked_out`
     - Point out the **Automated Condition Comparison**:
       - `Difference: None / Negligible` -> Non-punitive normal wear.
       - If damaged: Flagged as `Deteriorated` with dispute resolution dispatch.
     - Click any photo thumbnail to demonstrate the full-screen **Lightbox Inspector** with metadata.
- **Differentiator Explanation:**
  > *"Proof-Based Handover eliminates loan anxiety. By capturing photo evidence at both pickup and return, the system distinguishes normal academic wear-and-tear from actual damage, giving custodians confidence to share and students protection from unfair liability."*

---

### Step 6: Institutional Governance & Tamper-Evident Audit Logs (Part 8 & 9)
*Goal: Demonstrate administrative compliance and oversight.*

- **Actor & Window:** Admin view at `http://localhost:5173/admin`.
- **Presenter Action:**
  1. Open **Admin Dashboard**: Show live database aggregations (Total Users, Active Listings, Active Bookings, Open Issues).
  2. Navigate to **Disputes / Issues Tab**: Show the pre-seeded issue for the *4x RTX 4090 GPU Rig* (fan vibration during heavy CUDA workload).
  3. Show how admins review condition diffs, update status to `under_review`, and record official investigation notes.
  4. Navigate to **Audit Logs Tab**: Show the immutable, append-only security log recording every role change, resource moderation, and dispute action with user IDs and timestamps.

---

## 5. Troubleshooting & Emergency Fallbacks

### Contingency 1: Wi-Fi Disconnects or MongoDB Atlas Drops During Demo
- **What Happens:** The backend catches network errors cleanly and returns HTTP 503.
- **Visible UI Fallback:** The frontend instantly displays the amber **Offline Sample Mode** banner: *"Displaying demonstration catalog so your exploration remains uninterrupted."*
- **What to Tell Judges:** *"Notice our platform's offline resilience. In real university campus environments, network drops are common. Our client gracefully degrades to cached catalog data without crashing or presenting a blank screen."*

### Contingency 2: Socket.IO WebSocket Connection Fails
- **What Happens:** Sockets automatically fall back to HTTP long-polling and retry up to 10 times.
- **Fallback Action:** Simply click the notification bell icon or refresh the page.
- **What to Tell Judges:** *"All notifications are dual-written: first committed to MongoDB, then broadcast via WebSockets. Even if real-time push is delayed, REST synchronization ensures zero dropped messages."*

### Contingency 3: Bookings Were Modified in a Previous Demo
- **Recovery Command:** Open a terminal and run `npm run seed:demo`.
- **Result:** Within 2 seconds, all demonstration scenarios and accounts are reset to their pristine starting states without deleting any real user accounts.

---

## 6. Closing Statement (30 Seconds)

> *"In summary, the Resource Sharing Platform takes multi-thousand dollar scientific, computational, and media equipment out of locked closets and turns it into shared community innovation. 
> 
> With 448 automated tests, zero external AI dependencies, a transparent rule-based matching engine, and an indisputable proof-based handover timeline, we eliminate the scheduling conflicts and liability fears that previously prevented interdisciplinary collaboration. 
> 
> Thank you, and we welcome your questions."*

