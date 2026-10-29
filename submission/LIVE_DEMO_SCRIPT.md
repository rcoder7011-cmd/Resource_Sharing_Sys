# Live Demonstration Script: 3-Minute & 5-Minute Presentations
## Project: Resource Sharing Platform — “Unlock Underused Equipment and Spaces”
### Event: CodeHack India 2026

---

## 1. Setup & Environment Preparation

Before beginning either presentation:
1. Ensure the development server is running: `npm run dev` (`localhost:5000` backend, `localhost:5173` frontend).
2. Seed the demo records: `npm run seed:demo`.
3. Provision the administrator: `ADMIN_EMAIL=admin@institution.edu ADMIN_PASSWORD=SecurePass123! npm run seed:admin`.
4. Open two browser windows side-by-side:
   - **Window A (Left):** Signed in as **Borrower** (`borrower.demo@institutional-sharing.edu` / `DemoBorrowerSecret2026!`).
   - **Window B (Right - Incognito):** Signed in as **Custodian** (`custodian@institutional-sharing.edu` / `InstitutionalCustodianSecret2026!`).

---

## 2. The 3-Minute Rapid Pitch Sequence (Elevator Demo)

| Timestamp | Step & Objective | Persona / Window | Exact Navigation & Action | Expected Visible Outcome | Fallback Contingency |
|---|---|---|---|---|---|
| **0:00 - 0:40** | **Catalog Discovery & Search** | Borrower (Window A) | Navigate to `/resources`. Type `"microscope"`. Filter by `"Testing Equipment"`. Point out location hierarchy and stock count. | Instant client-side filtering showing the Hitachi SEM Microscope. Stock status badge indicates `"Available Now"`. | If backend is offline, amber notice shows `"Offline Sample Mode"`. Highlight this offline resilience. |
| **0:40 - 1:20** | **Conflict-Free Reservation** | Borrower (Window A) | Open *PerkinElmer Lambda 950 Spectrophotometer*. Click **Reserve Slot**. Select tomorrow 10:00 AM - 12:00 PM, qty `1`, purpose: *"Photovoltaic thin-film characterization"*. Submit. | Modal confirms submission; redirected to **My Bookings** with status `Pending Custodian Approval`. | If overlap conflict occurs, UI shows descriptive 409 error toast explaining capacity limits. |
| **1:20 - 2:00** | **Live Alert & Custodian Approval** | Custodian (Window B) | Look at Window B. Notice notification bell red badge pulses `+1`. Open dropdown. Navigate to **Dashboard > Incoming Requests**. Click **Approve Reservation**. | Request transitions to `Approved`. Window A receives real-time Socket.IO notification: *"Booking Approved"*. | If Socket.IO drops, refresh Window A; notification was persisted in MongoDB and syncs via REST. |
| **2:00 - 2:40** | **Custody Check-In & Return Handover** | Borrower (Window A) | In Window A, find pre-seeded active *Hitachi SEM*. Click **Return / Complete Check-Out**. Select condition `Good`, enter notes: *"Session complete, chamber cleaned"*. Confirm. | Status switches to `Completed`. Badge displays `No Deterioration (none)`. Inventory capacity is instantly released. | If return submission hangs, custody remains assigned to borrower to prevent liability dispute. |
| **2:40 - 3:00** | **Governance & Value Wrap-Up** | Presenter | Open `/admin` briefly in Window B. Show live metrics cards and append-only audit trail. Conclude with value statement. | Real database query aggregations and chronological audit log entries displayed cleanly. | Explain that admin route is strictly restricted to role `admin` with self-demotion guards. |

---

## 3. The 5-Minute In-Depth Demo Sequence (Full Technical Presentation)

### Step 1: Institutional Problem & Discovery (60 Seconds)
- **Role / Window:** Public / Borrower (Window A).
- **Navigation:** Start on Home Page (`/`), then click **Explore Catalog** (`/resources`).
- **Narrative:** *"Every year, universities purchase multi-thousand dollar equipment that sits idle up to 70% of the time, while student researchers lack access. Our platform unlocks these assets with zero scheduling conflicts."*
- **Action:** 
  1. Show the dynamic search bar: type `"Spectrophotometer"`.
  2. Select category filter `"Laboratories"`.
  3. Show the **Data Source Indicator** (`Live MongoDB Backend`).
  4. Click on **PerkinElmer Lambda 950 UV/Vis/NIR Spectrophotometer**.
- **Expected Outcome:** Detailed technical specs, double-beam optical system data, operating hours, and location hierarchy (Main Academic Campus > Biosciences Complex > Lab 320) are displayed.

---

### Step 2: Intelligent Scheduling & Capacity Allocation (60 Seconds)
- **Role / Window:** Borrower (Window A).
- **Navigation:** Resource Details Page (`/resources/:id`).
- **Narrative:** *"Unlike generic room schedulers, our backend mathematically validates overlapping intervals against resource capacity. It is impossible to double-book."*
- **Action:**
  1. Click **Reserve Slot**.
  2. Select tomorrow's date, 10:00 AM to 12:00 PM, quantity `1`.
  3. Enter purpose: *"Photovoltaic thin-film absorbance measurement for renewable energy dissertation."*
  4. Submit reservation.
- **Expected Outcome:** Request is persisted in MongoDB with `status: "pending"`. Redirected to **Dashboard > My Bookings** showing the new reservation in pending status.

---

### Step 3: Real-Time Alerts & Custodian Review (60 Seconds)
- **Role / Window:** Custodian (Window B).
- **Navigation:** Window B (Custodian).
- **Narrative:** *"The facility custodian receives instant notice via Socket.IO directly to their authenticated private room."*
- **Action:**
  1. Switch to Window B.
  2. Highlight the notification bell badge pulsing `+1`.
  3. Click the bell to view the alert: *"New Booking Request: Dr. Anya Sharma requested booking for PerkinElmer Lambda 950"*.
  4. Open **Dashboard > Incoming Requests**.
  5. Review the borrower's purpose and click **Approve Reservation**.
- **Expected Outcome:** Status moves to `Approved`. In Window A, a live Socket.IO push event arrives instantly: *"Booking Approved"*.

---

### Step 4: Two-Point Condition Handover & Deterioration Diff (60 Seconds)
- **Role / Window:** Borrower (Window A).
- **Navigation:** **Dashboard > My Bookings**.
- **Narrative:** *"Custodians refuse to share equipment when they fear unprovable damage disputes. We solve this with a two-point custody condition verification protocol."*
- **Action:**
  1. Show the pre-seeded approved booking for the **Sony FX6 Cinema Camera**.
  2. Click **Check-In / Pick Up Resource**.
  3. Select Initial Condition: `Excellent`. Enter notes: *"Lens scratch-free, two 160GB cards verified"*. Confirm.
  4. Notice the booking switches to `Checked-In (Active)` with a server-certified timestamp.
  5. Now open the active checked-in booking for **Hitachi SEM Microscope**. Click **Return / Complete Check-Out**.
  6. Select Return Condition: `Good`. Enter notes: *"Session concluded, stage reset"*. Confirm.
- **Expected Outcome:** The condition comparison diff engine evaluates the transition and assigns badge: `No Deterioration (none)`. Equipment capacity is released immediately.

---

### Step 5: Incident Dispute Management & Audit Governance (60 Seconds)
- **Role / Window:** Administrator (Window B or separate tab).
- **Navigation:** `/admin`.
- **Narrative:** *"Administrators maintain cross-campus compliance, handle condition disputes, and audit every administrative action through an append-only log."*
- **Action:**
  1. Open `/admin`.
  2. **Overview Tab:** Show live database query metrics (Total Users, Resources, Active Bookings, Open Issues).
  3. **Issues Tab:** Open the pre-seeded dispute on the **4x RTX 4090 GPU Rig** (*GPU #3 cooling fan rattling vibration*). Update status to `under_review` with investigator notes.
  4. **Audit Logs Tab:** Point out the chronological audit records detailing who changed what, with exact millisecond timestamps and IP attribution.
- **Expected Outcome:** Demonstrates enterprise governance, dispute resolution, and immutable compliance auditing.

---

## 4. Fallback Plan for Live Presentation Failures

| Failure Mode | Impact | Immediate Fallback Action |
|---|---|---|
| **MongoDB Atlas Wi-Fi Outage** | Database queries timeout | The frontend immediately activates **Offline Sample Mode** with an amber notice. Continue demonstrating catalog exploration, filtering, and specifications. |
| **Socket.IO Network Blocker** | Real-time push fails | Refresh Window A; the notification was persisted in MongoDB Atlas before socket emission and immediately displays via REST. |
| **Accidental Logout / Missing Token** | Redirected to `/login` | Use pre-seeded demo accounts: `borrower.demo@institutional-sharing.edu` or `custodian@institutional-sharing.edu`. |
| **Port 5000 Already in Use** | Server fails to boot | Run `npx kill-port 5000` or change `PORT=5001` in `server/.env` and `VITE_API_URL=http://localhost:5001/api` in `client/.env`. |

