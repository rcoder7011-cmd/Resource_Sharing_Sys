# Smart Match Intelligence & Explainable Recommendations (Phase 3)
**Resource Sharing Platform — CodeHack India 2026**

## 1. Overview & Objectives

Phase 3 upgrades the existing Smart Match feature into a need-first, explainable resource recommendation experience designed for university students, faculty, and campus labs. Students can describe their academic requirements, exam emergencies, lab needs, or project goals in natural language, and receive transparent, highly relevant, and verified recommendations.

### Key Capabilities
- **Natural Language Parsing Without External AI**: High-performance, deterministic rule-based parsing of natural language needs into categories, subcategories, academic metadata (branch, semester, subject, book/author), specific student essentials, campuses, quantities, and activity intents without third-party LLM API dependencies.
- **Strict Pre-Scoring Eligibility Filtering**: Eliminates hidden listings, resources under maintenance, resources owned by suspended users, and self-owned listings (preventing self-booking).
- **Exact Capacity & Overlap Math**: Evaluates live capacity using mathematical interval intersection against approved/checked-in reservations.
- **Deterministic 0–100 Scoring Model**: Fully grounded, explainable scoring with zero fabricated metrics (no synthetic popularity, fake ratings, or artificial savings).
- **Structured Explanations ("Why this matches")**: Every recommendation includes truthful, evidence-backed bullets explaining why it was recommended.
- **Underutilized Asset Integration**: Deep integration with Part 11 Smart Resource Rescue to surface idle university gear (<20% utilization).
- **Alternative Recommendations**: Automatically detects when exact capacity or category constraints bind, offering alternatives with explicit constraint reasons.
- **Student UX & Complete Theme Support**: Clickable student query chips, academic metadata badges, live capacity cushion badges, and full Light Mode and Dark Mode compatibility.

---

## 2. Natural Language Need Parsing Engine

The rule-based parser in `server/src/services/matchingService.js` processes queries up to 500 characters and extracts:

### A. Supported Student Query Scenarios
1. **"I need a scientific calculator for my maths exam tomorrow."**
   - **Inferred Category**: `Student Essentials`
   - **Inferred Subcategory**: `Calculators`
   - **Specific Item**: `Scientific Calculator`
   - **Academic Subject**: `Mathematics & Calculus`
   - **Activity Intent**: `exam`
2. **"Looking for a second-hand DSA textbook for CSE semester 3."**
   - **Inferred Category**: `Books & Study Materials`
   - **Inferred Subcategory**: `Engineering Textbooks`
   - **Academic Branch**: `Computer Science & Engineering (CSE)`
   - **Target Semester**: `Semester 3`
   - **Academic Subject**: `Data Structures & Algorithms`
3. **"Need a mini drafter and drawing board for engineering drawing."**
   - **Inferred Category**: `Design, Drawing & Architecture`
   - **Inferred Subcategories**: `Drafters and Drafting Tools`, `Technical Drawing Boards`
   - **Specific Items**: `Mini Drafter`, `Drawing Board`
   - **Academic Subject**: `Engineering Drawing & Graphics`
4. **"I need a laptop for a project."**
   - **Inferred Category**: `Computers`
   - **Resource Type**: `equipment`
   - **Activity Intent**: `project`
5. **"Looking for lab equipment near my campus."**
   - **Inferred Category**: `Laboratories`
   - **Location**: `Main Academic Campus`
6. **"Need 3 mini drafters for the graphics workshop."**
   - **Inferred Quantity**: `3`
   - **Inferred Category**: `Design, Drawing & Architecture`

### B. Extraction Dictionaries
- **Categories & Synonyms (`CATEGORY_SYNONYMS`)**: Covers all Phase 2 student categories (`Student Essentials`, `Books & Study Materials`, `Design, Drawing & Architecture`, `Gadgets & Accessories`) and institutional categories (`Computers`, `Laboratories`, `Cameras`, `Meeting Rooms`, `Testing Equipment`, `Electronics`, `Workshop Tools`, `Study Spaces`).
- **Academic Branches (`BRANCH_PATTERNS`)**: Extracts CSE, IT, Mechanical, Civil, ECE, EEE, Chemical, Biotechnology, Architecture, Basic Sciences, and Management.
- **Academic Semesters (`SEMESTER_PATTERNS`)**: Matches semester numbers (1–8) and academic years (1–4) across diverse natural phrasing (`sem 3`, `semester 3`, `3rd sem`, `year 2`, etc.).
- **Academic Subjects (`SUBJECT_KEYWORDS`)**: Maps keywords to standardized disciplines (DSA, Mathematics, Engineering Drawing, Physics, Chemistry, OS, DBMS, Networks, ML/AI, Circuits, etc.).
- **Specific Items (`SPECIFIC_ITEMS`)**: Recognizes 20+ specific entities including Scientific Calculators, Mini Drafters, Drawing Boards, Geometry Boxes, Textbooks, Notes, Lab Manuals, PYQs, Water Bottles, Backpacks, Keyboards, Mice, Headphones, Chargers, Laptops, DSLRs, and Oscilloscopes.
- **Quantity Extractor (`extractQuantityFromText`)**: Extracts integer quantities (1–1000) from phrases like *"need 3 drafters"*, *"borrow 2 calculators"*, or *"qty: 4"*.

---

## 3. Strict Pre-Scoring Eligibility Filtering

Before resources enter the scoring engine, `findSmartMatches` enforces authoritative institutional filters:

```javascript
// Database level query
const query = {
  moderationStatus: 'approved',
  availabilityStatus: { $ne: 'maintenance' },
};

// Self-booking prevention for authenticated users
if (user && user._id) {
  query.owner = { $ne: user._id };
}

// In-memory defense in depth
for (const resource of allResources) {
  // Exclude suspended owners
  if (resource.owner && (resource.owner.status === 'suspended' || resource.owner.isSuspended === true)) {
    continue;
  }
  // Exclude self-booking
  if (requestingUserId && resource.owner?._id?.toString() === requestingUserId) {
    continue;
  }
  // Exclude maintenance
  if (resource.availabilityStatus === 'maintenance') {
    continue;
  }
  ...
}
```

### Overlap Availability Calculation
For any requested time slot `[startAt, endAt]`, overlapping active reservations (`approved` or `checked_in`) are aggregated:
$$\text{Overlap Condition: } \text{booking.startAt} < \text{reqEnd} \land \text{booking.endAt} > \text{reqStart}$$
$$\text{availableCapacity} = \max(0, \text{totalCapacity} - \text{currentlyBooked})$$

If $\text{availableCapacity} < \text{requestedQuantity}$, the resource is **never** presented as an available match. Instead, it is diverted to **Alternative Recommendations** with an explicit reason:
`"Capacity unavailable for requested time (X/Y units booked)"`.

---

## 4. Deterministic Explainable Scoring Model (0–100 Points)

Every match score is strictly deterministic, normalized between 0 and 100, and composed of explainable criteria:

| Component | Maximum Points | Criteria & Grounding |
| :--- | :---: | :--- |
| **Category & Subcategory Match** | **35 pts** | **35 pts** for exact category match (boosted if subcategory also matches); **20 pts** for related categories (e.g. Student Essentials & Books, Computers & Gadgets); **10–15 pts** for matching resource format (`space` vs `equipment`). |
| **Description, Keywords & Academic Fit** | **30 pts** | **Up to 20 pts** for query tokens matched in title, description, or subcategory; **+10 pts** for stated activity intent (`exam`, `project`, `study`, `coding`, `recording`). **+4 to +12 pts** for matching academic subject, branch, semester, book title, author, or specific items (capped at 30 pts). |
| **Location Proximity** | **20 pts** | **20 pts** for exact target campus match; **15 pts** for neutral/unconstrained search across institutional network; **5 pts** for accessible cross-campus facilities. |
| **Availability & Capacity Cushion** | **15 pts** | **15 pts** when available capacity strictly exceeds requested quantity (capacity cushion); **12 pts** when available capacity exactly equals requested quantity; **0 pts** when capacity is unavailable. |
| **Total Normalization** | **100 pts** | Bounded strictly by $\min(100, \max(0, \text{score}))$. |

### Grounded "Why this matches" Explanations
Recommendations generate transparent, verifiable explanations:
- `Exact category "Books & Study Materials" & subcategory match: "Engineering Textbooks".`
- `Matches academic subject: "Data Structures & Algorithms".`
- `Matches academic branch: "Computer Science & Engineering (CSE)".`
- `Matches target semester: "Semester 3".`
- `Direct item match: "Scientific Calculator".`
- `Supports stated activity: "exam".`
- `Located at your target campus (Main Academic Campus).`
- `Fully available with capacity cushion (3 units free).`
- `Smart Resource Rescue: Underutilized asset (<20% booked in last 30 days).`

> [!IMPORTANT]
> **Zero Fabricated Signals**: The scoring engine never fabricates user ratings, fake stars, synthetic reviews, artificial trust scores, or non-existent monetary savings.

---

## 5. Ranking, Deterministic Tie-Breaking & Alternatives

### Deterministic Sort Comparator
When candidate resources have sufficient capacity ($\ge \text{quantity}$) and score $\ge 25$:
1. **Match Score** (DESC)
2. **Underutilized Asset Boost** (Part 11 Smart Resource Rescue tie-breaker)
3. **Available Capacity Cushion** (DESC)
4. **Creation Timestamp** (`createdAt` DESC)
5. **Resource ID** (`id.localeCompare` ASC for stable deterministic ordering)

### Alternative Recommendations
If a resource does not meet direct match criteria (e.g., booked for the requested slot, or score < 25 but relevant):
- Added to `alternatives` (top 4).
- Marked with `isAlternative: true`.
- Labeled with explicit, truthful `constraintReason` (e.g., *"Capacity unavailable for requested time (2/2 units booked)"* or *"Alternative category or distant location"*).

---

## 6. Frontend UX Upgrade (`SmartMatchPage.jsx`)

The React frontend has been redesigned to serve student needs while adhering strictly to the Part 19 Theme System:

1. **Student Prompt Chips**: Clickable buttons that auto-fill realistic student queries:
   - 🔬 *Scientific Calculator for Exam*
   - 📚 *Second-Hand DSA Textbook*
   - 📐 *Mini Drafter & Drawing Board*
   - 💻 *Laptop for Coding Project*
   - 🧪 *Lab Equipment on Campus*
   - 🎧 *Wireless Headphone & Keyboard*
   - 👥 *Meeting Room for Presentation*
2. **Dynamic Need Signals Banner**: Displays extracted tokens (Category, Subcategory, Subject, Branch, Semester, Specific Items, Location, Activity).
3. **Explainable Match Cards**:
   - Color-coded Match Score Badge ($\ge 80\%$ emerald, $\ge 60\%$ blue, $<60\%$ amber).
   - Academic metadata chips (Subject with book icon, Branch with graduation cap icon, Semester, Book Title/Author).
   - "Why this matches your need" bulleted checklist with emerald icons.
   - Live capacity status indicator (`X of Y units free` with green/amber dot).
   - Direct "Book Resource" action prepopulated with start time, end time, and quantity parameters.
4. **Theme System Compliance**:
   - Replaced all hardcoded dark colors with `card-surface`, `bg-white dark:bg-slate-900`, `border-slate-200 dark:border-slate-800`, `text-slate-900 dark:text-white`, and `text-slate-600 dark:text-slate-400`.
   - Verified WCAG 2.1 AA accessible contrast across all cards, buttons, badges, and form controls in both Light Mode and Dark Mode.

---

## 7. Security, Privacy & Validation

- **Input Length Safeguards**: Description inputs clamped to 500 characters on both frontend and backend to eliminate regex DDoS vulnerabilities.
- **Quantity Bounds**: Quantities validated to $1 \le \text{quantity} \le 1000$.
- **Date Validation**: Start date must be in the future, and end date must be strictly after start date.
- **Server-Side Scoring Authority**: Scoring calculations and eligibility checks are performed exclusively on the server; client input cannot tamper with scores.
- **Privacy Protection**: User password hashes, suspension reasons, audit logs, and internal moderation notes are stripped prior to response transmission.

---

## 8. Verification & Test Metrics

### Test Suite Execution
- **Backend Test Suite (`npm test --prefix server`)**:
  - `matchingTest.js`: **95 passed, 0 failed** (8 test suites covering parsing, overlap capacity, deterministic scoring, offline 503 handling, integration, controller API contracts, Phase 3 student academic matching, and NoSQL security/sanitization regressions).
  - All 16 backend test suites: **552 passed, 0 failed** (Exit code 0).
- **Frontend Production Build (`npm run build --prefix client`)**:
  - `vite build`: **2,038 modules transformed** in 2.77s, 0 errors (Exit code 0).
- **Student Resources Test (`studentResourcesTest.js`)**:
  - **21 passed, 0 failed** (Exit code 0).
- **Real MongoDB Atlas Integration Test (`realAtlasDbTest.js`)**:
  - **7/7 operations verified** on live cluster (`ResourceSharingDb`), zero leaked test data (Exit code 0).
