# Part 13 — Need-First Smart Resource Matching

**Resource Sharing Platform — “Unlock Underused Equipment and Spaces”**  
**CodeHack India 2026 Hackathon**

---

## 1. Executive Summary

Part 13 introduces **Need-First Smart Matching**, a search and recommendation capability that lets students, faculty, and campus researchers describe their project or event in natural language (e.g. *“I need a camera for a college event tomorrow near North Campus”*) and receive ranked, verified resource recommendations.

Unlike static keyword filters or opaque, hallucination-prone external AI chatbots:
- It uses a **pure, local, rule-based NLP parser** that requires zero external AI keys and runs deterministically.
- It strictly enforces **hard capacity and overlap availability** using the platform's interval math.
- It calculates an **explainable 0–100 matching score** with truthful criteria explanations.
- It surfaces **closest valid alternatives** when exact constraints (such as location or capacity) cannot be met.
- It integrates with **Part 11 Smart Resource Rescue**, promoting underutilized equipment and spaces ($<20\%$ booked) as a secondary discovery tie-breaker.

---

## 2. User Workflow

```
       [User Enters Need Description & Optional Constraints]
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ 1. Rule-Based Natural Language Parser│
            │ - Extracts Category Synonyms         │
            │ - Identifies Campus Locations        │
            │ - Extracts Activity Intent Signals   │
            │ - Infers Equipment vs Facility Space │
            └──────────────────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ 2. Hard Eligibility & Availability   │
            │ - Exclude Suspended / Hidden Assets  │
            │ - Exclude Maintenance Items          │
            │ - Exclude Self-Owned Resources       │
            │ - Audit Live Overlapping Bookings    │
            │ - Verify Remaining Unit Capacity     │
            └──────────────────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │ 3. Deterministic Scoring & Ranking   │
            │ - Category / Type Match (35 pts)     │
            │ - Description & Keywords (30 pts)    │
            │ - Location Proximity (20 pts)        │
            │ - Availability Margin (15 pts)       │
            │ - Normalization: 0 to 100 Scale      │
            └──────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ 4. Truthful Explanations & Rescue Badges     │
        │ - Transparent bullet points per match        │
        │ - "<20% Booked" Smart Rescue Prominence      │
        │ - Close Alternatives if exact match blocked  │
        └──────────────────────────────────────────────┘
                               │
                               ▼
         [One-Click Transition to Reservation Drawer]
```

---

## 3. Supported Natural-Language Keywords

### Category Synonym Mappings
- **Cameras:** camera, cameras, dslr, dslrs, lens, lenses, tripod, tripods, photography, photo, photos, video, videography, filming, shoot, recording, cinematography, camcorder, gimbal.
- **Computers:** computer, computers, laptop, laptops, workstation, workstations, pc, desktop, gpu, gpus, server, coding, programming, software, machine learning, simulation, macbook, linux, compute, rendering.
- **Laboratories:** lab, laboratory, laboratories, chemistry, biology, fume hood, centrifuge, microscope, spectroscopy, incubator, pipette, chemical, bench, wet lab, autoclave, cleanroom.
- **Meeting Rooms:** meeting, meetings, meeting room, conference, conference room, boardroom, discussion, presentation, seminar, group study, collab, collaboration.
- **Testing Equipment:** testing, oscilloscope, multimeter, spectrum analyzer, signal generator, waveform, sensor, probe, calibrator, hardware test, bench meter.
- **Electronics:** electronics, circuit, circuits, breadboard, soldering, microcontroller, arduino, raspberry pi, esp32, resistor, pcb, robotics, iot.
- **Workshop Tools:** tool, tools, workshop, fabrication, 3d printer, cnc, lathe, laser cutter, drill, saw, wrench, screwdriver, power tool, maker.
- **Study Spaces:** study, study space, quiet study, reading, desk, library, workspace, individual study, cubicle, silent room.

### Location Keywords
- **North Campus:** north campus, north, physics hall, science complex.
- **South Campus:** south campus, south, engineering block, design studio.
- **Central Campus:** central campus, main campus, central library, administration.
- **Tech Innovation Center:** tech center, innovation center, incubator, research park.

### Activity Intents
- `event`, `presentation`, `workshop`, `recording`, `coding`, `study`, `research`, `hackathon`, `filming`, `experiment`, `testing`, `thesis`, `project`, `class`, `competition`.

---

## 4. Scoring Formula & Normalization

$$\text{Total Match Score} = \min(100, S_{\text{category}} + S_{\text{keywords}} + S_{\text{location}} + S_{\text{availability}})$$

### Criteria Breakdown

| Dimension | Max Points | Evaluation Rules |
| :--- | :---: | :--- |
| **Category & Facility Type** | **35 pts** | • Exact category match: **35 pts**<br>• Complementary / related category: **20 pts**<br>• Broad facility type match (`equipment` vs `space`): **10–15 pts** |
| **Description & Keywords** | **30 pts** | • Content term overlap fraction: up to **20 pts**<br>• Stated activity intent match (e.g. `recording`, `filming`): **10 pts** |
| **Location Proximity** | **20 pts** | • Exact target campus match: **20 pts**<br>• Neutral / unconstrained location: **15 pts**<br>• Alternative campus: **5 pts** |
| **Availability & Margin** | **15 pts** | • Surplus available capacity: **15 pts**<br>• Exact capacity match: **12 pts**<br>• Capacity deficit: **0 pts** (moved to alternatives) |

> **Decision Note on Budget:** As institutional assets across our university network are shared academic resources with zero rental or access fees, the budget criterion has been adapted into content and intent precision. No fake pricing fields have been introduced.

### Deterministic Tie-Breaking
When two resources achieve identical scores, ties are resolved deterministically:
1. **Primary Score:** Descending match score.
2. **Smart Resource Rescue Tie-Breaker:** Underutilized assets ($<20\%$ booked) are prioritized to maximize institutional efficiency.
3. **Capacity Margin:** Assets with larger free cushions are favored.
4. **ID String Sort:** Lexicographical resource ID sort for absolute test reproducibility.

---

## 5. Eligibility & Availability Rules

1. **Moderation Status:** Only resources with `moderationStatus === 'approved'` are considered. `flagged` or `hidden` items are strictly excluded.
2. **Maintenance Status:** Resources marked with `availabilityStatus === 'maintenance'` are excluded.
3. **Self-Booking Prohibition:** When an authenticated user queries the engine, resources owned by `req.user._id` are filtered out.
4. **Interval Overlap Formula:**
   $$\text{Overlap} \iff \text{startAt} < \text{requestedEnd} \land \text{endAt} > \text{requestedStart}$$
5. **Confirmed Bookings Only:** Only bookings with status `approved` or `checked_in` reduce available unit capacity. `rejected` and `cancelled` reservations do not consume capacity.
6. **Contiguous Non-Overlapping Boundaries:** Bookings ending exactly when the requested slot starts (`A.endAt === B.startAt`) do not conflict.
7. **Offline Guard:** If MongoDB is offline, the API returns `503 Service Unavailable` rather than producing false availability claims.

---

## 6. API Reference

### `POST /api/recommendations/match`
*Also aliased as `POST /api/resources/match`.*  
*Public endpoint with optional authentication (`optionalProtect`).*

#### Request Body
```json
{
  "description": "I need a high-resolution DSLR camera with a tripod for campus fest recording tomorrow at North Campus",
  "category": "Cameras",
  "location": "North Campus",
  "resourceType": "equipment",
  "startAt": "2026-11-02T10:00:00.000Z",
  "endAt": "2026-11-02T14:00:00.000Z",
  "quantity": 1,
  "includeRescueBoost": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1,
  "totalEvaluated": 12,
  "query": {
    "description": "I need a high-resolution DSLR camera with a tripod for campus fest recording tomorrow at North Campus",
    "category": "Cameras",
    "location": "North Campus",
    "quantity": 1,
    "startAt": "2026-11-02T10:00:00.000Z",
    "endAt": "2026-11-02T14:00:00.000Z"
  },
  "parsedSignals": {
    "inferredCategories": ["Cameras"],
    "inferredLocations": ["North Campus"],
    "inferredIntents": ["recording", "event"]
  },
  "data": [
    {
      "resource": {
        "id": "672...",
        "title": "Sony Alpha A7 IV Full-Frame Mirrorless DSLR",
        "category": "Cameras",
        "resourceType": "equipment",
        "location": { "campus": "North Campus", "building": "Media Center", "room": "101" },
        "quantity": 2
      },
      "matchScore": 95,
      "isUnderused": true,
      "capacity": {
        "totalCapacity": 2,
        "currentlyBooked": 0,
        "availableCapacity": 2,
        "isFullyAvailable": true,
        "hasOverlap": false
      },
      "explanations": [
        "Exact category match: \"Cameras\".",
        "Matches 3 relevant term(s) in title or description.",
        "Supports stated activity: \"recording, event\".",
        "Located at your target campus (North Campus).",
        "Fully available with capacity cushion (2 units free).",
        "Smart Resource Rescue: Underutilized asset (<20% booked)."
      ]
    }
  ],
  "alternatives": []
}
```

---

## 7. Alternative Recommendations

When a resource cannot be recommended as a direct match (e.g. all units are reserved during the requested hours, or it resides on a different campus), it is evaluated for the **Alternatives Section**:
- Displays the closest compatible items with their **exact constraint reason** (e.g. *“Capacity unavailable for requested time (2/2 units booked)”* or *“Located on South Campus instead of North Campus”*).
- Allows users to adjust their time window or consider a neighboring facility without losing their original search criteria.

---

## 8. Smart Resource Rescue Integration

Reuses [`calculateResourceUtilization`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/services/rescueService.js#L165) from Part 11:
- Identifies resources with $< 20\%$ utilization rate over the previous 30 days.
- Surfaces a distinctive **“Smart Rescue: Underused Campus Resource”** badge on the match card.
- Functions as a secondary tie-breaker among equally scored resources without artificially skewing primary relevance metrics.

---

## 9. Automated Testing & Verification

Automated test suite: [`server/src/tests/matchingTest.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/tests/matchingTest.js)

### Scenarios Covered
1. Synonym parsing for cameras, workstations, oscilloscopes, and meeting spaces.
2. Explicit dropdown selections taking strict precedence over text extraction.
3. Interval overlap capacity formula adhering to Part 5 logic.
4. Cancelled and rejected bookings not consuming capacity.
5. Adjacent start/end bookings not conflicting.
6. Deterministic scoring within 0–100 bounds.
7. Truthful explanation bullet point generation.
8. Suspension, hidden moderation, and maintenance asset exclusion.
9. Self-booking exclusion for authenticated owners.
10. Capacity exhaustion triggering alternative recommendation with truthful constraint callout.
11. Input validation: past start dates, inverted date ranges, and quantities $>1000$ rejected with 400.
12. Offline database 503 response guard.
13. No duplicate resources in result lists.

**Suite Results:** **57 / 57 tests passed (100% pass rate)**.

