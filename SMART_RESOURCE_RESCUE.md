# Smart Resource Rescue — Underused Resource Intelligence
## CodeHack India 2026: Resource Sharing Platform — “Unlock Underused Equipment and Spaces”

---

## 1. Executive Summary & Purpose

In universities and research institutions, millions of rupees worth of specialized equipment (spectrometers, CNC mills, cleanroom benches, VR workstations) and high-value spaces (acoustically treated recording studios, seminar rooms, prototyping labs) sit idle for large portions of the academic year. Concurrently, undergraduate and postgraduate researchers frequently report resource bottlenecks, delayed thesis projects, and lack of specialized tool access.

**Smart Resource Rescue** transforms the platform from a passive listing catalog into an **active asset optimization engine**. By continuously tracking declared operating availability against verified reservation telemetry from MongoDB, the platform:
1. Calculates mathematical utilization percentages with calendar and multi-unit capacity normalization.
2. Identifies chronically underutilized assets (<20% utilization) and high-pressure bottlenecks (>60% utilization).
3. Evaluates unfulfilled student interest via pending booking queues.
4. Synthesizes deterministic, rule-based rescue recommendations (technical keyword expansion, access prerequisite review, operational window extension, and cross-departmental spotlighting).

All algorithms operate **100% server-side, deterministically, and without paid third-party AI APIs**, ensuring zero hallucination, strict auditability, and immediate reproducibility.

---

## 2. Mathematical Definition & Utilization Formula

### 2.1 Measurement Window

Asset utilization is evaluated over a configurable measurement window ($W_{\text{days}}$, default: 30 days, options: 7, 14, 30, 60 days):
- $\text{WindowEnd} = \text{Current Timestamp}$
- $\text{WindowStart} = \max(\text{Resource.createdAt}, \text{WindowEnd} - W_{\text{days}} \times 86{,}400{,}000\,\text{ms})$

By pinning the start boundary to $\max(\text{Resource.createdAt}, \dots)$, newly created resources are never penalized for the weeks prior to their addition to the platform catalog.

### 2.2 Operating Schedule Normalization

Each resource listing defines an `operatingHours` specification (defaulting to institutional working hours: `Monday – Friday: 08:30 – 18:00`, or custom variants such as `24/7 Access`, `Daily: 09:00 - 17:00`, or weekend-only spaces).

The parser extracts:
- Daily active hours ($H_{\text{daily}}$)
- Active operating days of the week ($D_{\text{operating}} \subseteq \{0, 1, 2, 3, 4, 5, 6\}$)

Across the active window from $\text{WindowStart}$ to $\text{WindowEnd}$, the total operational minutes per inventory unit ($M_{\text{per\_unit}}$) is computed by counting only the days falling on valid operating days:

$$\text{AvailableUnitMinutes} = M_{\text{per\_unit}} \times \text{Resource.quantity}$$

$$\text{AvailableUnitHours} = \frac{\text{AvailableUnitMinutes}}{60}$$

### 2.3 Utilized Capacity Formulation

For all bookings associated with the resource, each event is evaluated against the measurement window:

$$\text{OverlapStart} = \max(\text{Booking.startAt}, \text{WindowStart})$$

$$\text{OverlapEnd} = \min(\text{Booking.endAt}, \text{WindowEnd})$$

$$\text{OverlapMinutes} = \max\left(0, \frac{\text{OverlapEnd} - \text{OverlapStart}}{60{,}000\,\text{ms}}\right)$$

$$\text{BookedUnitMinutes} = \text{OverlapMinutes} \times \text{Booking.quantity}$$

### 2.4 Status Exclusion & Demand Separation

To maintain absolute mathematical integrity:
1. **Confirmed Utilized Minutes**: Only bookings with `status` $\in \{\text{'approved'}, \text{'checked\_in'}, \text{'completed'}\}$ contribute to confirmed utilized capacity.
2. **Strictly Excluded**: Bookings with `status` $\in \{\text{'cancelled'}, \text{'rejected'}\}$ contribute 0 minutes to utilization.
3. **Unfulfilled Demand Tracking**: Bookings with `status} == \text{'pending'}` are tracked separately as $\text{PendingDemandHours}$. This represents latent campus demand waiting for owner action and does not inflate confirmed utilization.

### 2.5 Saturation Clamping & Final Utilization Rate

$$\text{ClampedUtilizedMinutes} = \min(\text{ConfirmedUtilizedMinutes}, \text{AvailableUnitMinutes})$$

$$\text{UtilizationRate} = \begin{cases} 
\min\left(100.0, \frac{\text{ClampedUtilizedMinutes}}{\text{AvailableUnitMinutes}} \times 100\right), & \text{if } \text{AvailableUnitMinutes} > 0 \\
0.0, & \text{otherwise}
\end{cases}$$

---

## 3. Rule-Based Classification Matrix

| Classification | Utilization Threshold | Data Condition | Badge Variant & Visual Style |
| :--- | :--- | :--- | :--- |
| **Insufficient Data** | Any | Listing active < 7 days AND 0 confirmed bookings | Slate Badge (`Calibrating`) |
| **Underused** | $< 20.0\%$ | Listing active $\ge$ 7 days OR confirmed bookings $> 0$ | Amber Badge (`Underused`) + Alert Icon |
| **Moderate Use** | $20.0\% \le \text{Rate} \le 60.0\%$ | Normal healthy operational band | Blue Badge (`Moderate`) |
| **Well Used** | $> 60.0\%$ | Heavy demand / high asset utilization | Emerald Badge (`High Demand`) |

### Data Confidence Scoring
- **High Confidence**: Resource has been active on campus for $\ge 30$ days.
- **Medium Confidence**: Resource active between $7$ and $29$ days.
- **Low Confidence**: Resource active for $< 7$ days (initial calibration period).

---

## 4. Smart Rescue Recommendation Engine

Recommendations are produced deterministically based on resource attributes, utilization rates, and operational telemetry:

| Recommendation ID | Trigger Conditions | Category | Priority | Suggested Practical Action |
| :--- | :--- | :--- | :--- | :--- |
| `REC_MAINTENANCE` | `availabilityStatus === 'maintenance'` | Maintenance | **Urgent** | Expedite physical servicing and update availability status to "available" to resume reservations. |
| `REC_SPECS` | `description.length < 60` OR specs empty | Discoverability | **High** | Add comprehensive technical parameters, instrument model numbers, and research use cases to boost search ranking. |
| `REC_ACCESS_BARRIER` | `safetyLevel` Restricted/High OR $>1$ eligibility rules, AND underused | Access | **High** | Prerequisite barriers detected. Schedule monthly peer certification workshops or open orientation cohorts. |
| `REC_EXPAND_HOURS` | Parsed operating hours $\le 5$ hours/day, AND underused | Scheduling | **Medium** | Broaden reservation windows to evening hours or weekend slots to capture off-peak researcher demand. |
| `REC_CAMPUS_PROMO` | 0 confirmed bookings in window, not insufficient data | Promotion | **High** | Feature in Campus Spotlight or cross-promote to affiliated academic departments and research labs. |
| `REC_PENDING_CONVERSION` | Pending bookings exist $>0$ on underused resource | Operations | **High** | Review and approve pending booking backlog in owner dashboard to immediately activate utilization. |
| `REC_CAPACITY_SCALING` | Utilization $> 60\%$ (`well_used`) | Capacity | **Info** | High demand asset. Consider adding duplicate inventory units or instituting peak-hour duration quotas. |
| `REC_GENERAL_AUDIT` | Underused resource with no other flags triggered | Audit | **Medium** | Affix physical QR code reservation placard directly to the laboratory workstation to drive spontaneous bookings. |

---

## 5. Backend Architecture & Endpoints

### 5.1 Service Layer (`server/src/services/rescueService.js`)
- `parseOperatingHours(operatingHoursStr)`: Extracts daily hours, working days, and 24/7 flags.
- `calculateAvailableUnitMinutes(resource, windowStart, windowEnd)`: Computes capacity factoring in quantity and calendar schedules.
- `calculateResourceUtilization(resource, bookings, windowDays)`: Full deterministic utilization math, clipping, status filtering, and classification.
- `generateRescueRecommendations(resource, metrics)`: Synthesizes prioritized actionable rescue recommendations.
- `getPlatformRescueSummary(windowDays)`: Aggregates campus-wide metrics (underused counts, percentages, average utilization, category breakdown).
- `getPlatformRescueResources(filters)`: Returns paginated, searchable, filtered resource intelligence.
- `getSingleResourceRescueDetails(resourceId, windowDays)`: Full mathematical breakdown and recent booking telemetry for a single resource.
- `getOwnerResourceUtilization(ownerId, windowDays)`: Strictly scoped utilization insights for listings owned by the authenticated user.

### 5.2 API Routes & Authorization

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/rescue/summary` | Admin Only (`protect`, `requireAdmin`) | Platform-wide aggregate metrics (total evaluated, underused count & %, average utilization, category breakdown). |
| `GET` | `/api/admin/rescue/resources` | Admin Only (`protect`, `requireAdmin`) | Filtered & paginated resource utilization telemetry with primary rescue recommendations. |
| `GET` | `/api/admin/rescue/resources/:id` | Admin Only (`protect`, `requireAdmin`) | Deep-dive mathematical breakdown, operating schedule audit, full recommendation list, and recent bookings. |
| `GET` | `/api/resources/mine/utilization` | Authenticated Owner (`protect`) | Strictly isolated utilization summary and rescue tips for the requesting user's own listings. |

---

## 6. Frontend Integration & User Experience

### 6.1 Administrator Portal (`AdminDashboardPage.jsx`)
- **Navigation Tab**: Dedicated "Smart Resource Rescue" tab with `Sparkles` icon and live badge indicating underused asset counts.
- **KPI Summary Grid**: 5 real-time cards: Total Evaluated, Underused Assets (<20%), Moderate Utilization (20-60%), High Demand (>60%), and Campus Average Utilization progress bar.
- **Interactive Controls**: Analysis window selector (7, 14, 30, 60 days), Classification pill filters, and real-time search across titles, campuses, and categories.
- **Resource Intelligence Table**: Displays resource title, campus, category, quantity, booked vs available unit-hours, visual utilization progress bar, confidence rating, primary recommendation, and "Breakdown" action button.
- **Breakdown Modal**: Complete audit transparency displaying:
  - Raw mathematical formula inputs
  - Operating schedule analysis
  - Active vs pending demand
  - Full prioritized recommendation cards with expected impact estimates
  - Recent booking telemetry table

### 6.2 Resource Owner Dashboard (`DashboardPage.jsx`)
- **My Listings Header**: Surfaces an amber badge showing underused resource counts across the user's inventory.
- **Listing Item Cards**: Displays compact utilization badge (e.g. `12.5% Utilized (Underused)`) and total booked hours vs available capacity.
- **Smart Rescue Tip Callout**: Directly highlights practical steps (e.g. adding technical specs or reviewing pending requests) to empower resource owners to improve their own utilization independently.

---

## 7. Verification & Automated Testing

The automated test suite (`server/src/tests/rescueTest.js`) provides 100% pass verification across 28 dedicated unit and integration tests:

1. **Operating Hours Parsing (5 tests)**: Standard institutional hours (9.5h), 24/7 continuous access (24h across 7 days), daily schedules (8h across 7 days), 12-hour AM/PM formats, and graceful fallback for empty/malformed strings.
2. **Available Capacity Calculations (2 tests)**: Strict inventory quantity multiplier verification and divide-by-zero protection.
3. **Deterministic Math & Status Filtering (5 tests)**: 0% rate on zero bookings, exclusion of cancelled/rejected bookings, multi-unit booking calculations, boundary clipping on window edges, and unfulfilled pending demand isolation.
4. **Classification & Confidence (3 tests)**: Threshold boundaries (<20% underused, 20-60% moderate, >60% well used, <7d insufficient data) and confidence tiers.
5. **Recommendation Engine (6 tests)**: Trigger validation for `REC_SPECS`, `REC_ACCESS_BARRIER`, `REC_EXPAND_HOURS`, `REC_CAMPUS_PROMO`, `REC_PENDING_CONVERSION`, and `REC_MAINTENANCE` with urgent priority sorting.
6. **Role Authorization Guards (3 tests)**: Non-admin 403 Forbidden enforcement on administrative endpoints, admin pass-through, and unauthenticated 401 rejection.
7. **Database Disconnection Offline Guards (4 tests)**: Immediate 503 response when MongoDB is disconnected.

---

## 8. Limitations & Practical Campus Guidance

1. **Deterministic vs. Semantic Intent**: The engine evaluates structured metadata and booking records. It does not parse unstructured PDF research papers or external departmental websites.
2. **Academic Calendar Cycles**: Campus utilization is naturally cyclical (e.g. lower bookings during semester breaks or exam weeks). The configurable time window (7d to 60d) allows administrators to evaluate realistic operational windows.
3. **Non-Punitive Design**: Underused classifications are presented constructively as "Rescue Opportunities" rather than penalties, fostering departmental cooperation and asset sharing.

