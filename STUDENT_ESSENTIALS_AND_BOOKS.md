# Student Essentials, Books & Academic Resources, Safe MongoDB Demo Data and Availability Synchronization (Phase 2)

## 📌 Executive Summary

Phase 2 completes the integration of **Student Essentials, Books & Study Materials, Engineering Drawing & Design, and Gadgets & Accessories** across the backend and frontend of the Resource Sharing Platform.

It delivers:
1. Complete category & subcategory synchronization across server and client with alias resolution.
2. Extended academic metadata schema (`subject`, `branch`, `department`, `course`, `semester`, `academicYear`, `classLevel`, `bookTitle`, `author`, `edition`, `isbn`) and virtual aliases (`class`, `generalLocation`).
3. Multi-field search and query filtering with NoSQL injection protection via sanitized regex escaping (`escapeRegex`).
4. Safe, idempotent MongoDB demo data seeder supporting zero-network dry-run simulation (`--dry-run`), production safety guards (`--force-prod`), and clean isolation (`--clean-demo-only --confirm`).
5. Real-time availability tracking with quantity-aware interval overlap math and Phase 1 concurrency mutex protection.
6. Need-First Smart Resource Matching and Smart Rescue integration.
7. Full Light and Dark Mode responsiveness across all cards, modals, and forms.

All existing institutional equipment, research spaces, booking workflows, condition verifications, and Phase 1 reliability fixes remain 100% functional without regressions.

---

## 🗂️ 1. Extensible Categories & Subcategories Registry

Centralized across server and client:
- Backend: [`server/src/config/categories.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/config/categories.js)
- Frontend: [`client/src/data/categories.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/client/src/data/categories.js)

### Supported Categories:

1. **Student Essentials (`Student Essentials`)**
   - Subcategories: `Watches`, `Water Bottles`, `Bags & Backpacks`, `Umbrellas and Raincoats`, `Calculators`, `Stationery`, `Lunch Boxes`, `Notebooks and Registers`, `Folders and Files`, `Pens, Pencils & Stationery`, `Other Essentials`.
2. **Books & Study Materials (`Books & Study Materials`)**
   - Subcategories: `Engineering Textbooks`, `School Books`, `Competitive Exam Books`, `Reference Books`, `Previous Semester Books`, `Old and Second-Hand Books`, `Lab Manuals`, `Subject-Wise Handwritten Notes`, `Printed Notes and Assignments`, `Previous-Year Question Papers`, `Practical Files`, `Drawing Sheets and Project Files`, `Subject-Specific Books`, `Other Books & Notes`.
3. **Design, Drawing & Architecture (`Design, Drawing & Architecture`)**
   - Supported Aliases: `Engineering Drawing & Design`, `Design & Drawing`.
   - Subcategories: `Drafters and Drafting Tools`, `Engineering Drawing Instruments`, `Geometry Boxes`, `Rulers and Set Squares`, `Technical Drawing Boards`, `Sketchbooks`, `Drawing Pencils and Markers`, `Color Sets`, `Graphic Design Accessories`, `Drawing Tablets`, `Other Design Supplies`.
4. **Gadgets & Accessories (`Gadgets & Accessories`)**
   - Subcategories: `Headphones`, `Computer Mice and Keyboards`, `Chargers and Adapters`, `USB Drives`, `Keyboards & Mice`, `Headphones & Earphones`, `Computer and Device Accessories`, `Other Gadgets`.
5. **Preserved Institutional Categories (Parts 1–17)**
   - `Laboratories`, `Computers`, `Workshop Tools`, `Cameras`, `Meeting Rooms`, `Testing Equipment`, `Electronics`, `Lab Equipment`, `Study Spaces`, `Tools`, `Other`.

---

## 🎓 2. Academic Metadata Schema & Virtuals

In [`server/src/models/Resource.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/models/Resource.js), optional academic metadata is stored in `academicMetadata`:

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `subject` | String | Subject or course title | `Engineering Mathematics I`, `Data Structures` |
| `branch` | String | Academic department or branch | `Computer Science & Engineering (CSE)`, `Mechanical Engineering` |
| `department` | String | Specific university department or division | `Department of Computer Science & Engineering` |
| `course` | String | Degree or academic programme | `B.Tech`, `B.Arch`, `BCA`, `M.Tech` |
| `semester` | String | Semester or academic term | `1st Semester (Year 1)`, `3rd Semester (Year 2)` |
| `academicYear` | String | Academic session / year | `2025-2026` |
| `classLevel` | String | Class year or level of study | `1st Year`, `2nd Year`, `Final Year` |
| `bookTitle` | String | Title of the publication or textbook | `Higher Engineering Mathematics` |
| `author` | String | Author or note-taker name | `Dr. B.S. Grewal` |
| `edition` | String | Edition or academic year | `44th Edition` |
| `isbn` | String | International Standard Book Number | `978-8193328491` |

### Backward-Compatible Virtuals:
- `academicMetadata.class`: Aliases `academicMetadata.classLevel`.
- `generalLocation`: Getter and setter mapping to `location.campus`.
- `name`: Aliases `title`.
- `summary`: Automatic 160-character description truncation.
- `availableQuantity` & `totalQuantity`: Dynamic capacity accessors.

---

## 🛡️ 3. Safe, Idempotent MongoDB Demo Data & Cleanup

In [`server/src/scripts/seedDemoData.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/scripts/seedDemoData.js) and [`server/src/utils/studentDemoCatalog.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/utils/studentDemoCatalog.js):

### Safety Guarantees:
1. **Production Lock:** Refuses to seed if `NODE_ENV === 'production'` or URI contains `production`/`prod`, unless explicitly bypassed via `--force-prod` or `ALLOW_PRODUCTION_DEMO_SEED=true`.
2. **Deterministic Identifiers:** Every demo item has a unique, stable `demoSeedKey` (e.g. `demo-student-calculator-03`, `demo-book-higher-math-04`). Seeding is **100% idempotent** without duplicate entries.
3. **Zero-Network Dry Run:** Run `node src/scripts/seedDemoData.js --dry-run` to audit catalog schemas and items without network calls or database writes. Run `node src/scripts/seedDemoData.js --dry-run --live` to compare against live database state.
4. **Non-Destructive:** NEVER clears collections, drops tables, or modifies user-created resources or real accounts.
5. **Two-Step Safe Cleanup:**
   - Dry preview: `node src/scripts/seedDemoData.js --clean-demo-only` (reports identified demo record counts without deleting).
   - Confirmed cleanup: `node src/scripts/seedDemoData.js --clean-demo-only --confirm` (deletes strictly `isDemo: true` and sample custodian resources). Real user resources and bookings are completely preserved.

### Included Demo Items (12 Curated Student Items):
- Milton Thermosteel Reusable Water Bottle (1000ml)
- Wildcraft Ergonomic 35L Campus Backpack
- Casio fx-991EX Scientific Calculator (5 units)
- Higher Engineering Mathematics by Dr. B.S. Grewal (44th Ed)
- Core Data Structures & Algorithms Handwritten Lecture Notes (Sem 3)
- Fluid Mechanics & Hydraulic Machinery Lab Manual (Solved)
- Omega Engineering Mini Drafter with Stainless Steel Clamp (4 units)
- Isomars Engineering Geometry Instrument Box & Set Squares
- A3 Technical Drawing Board & Sketch Pad (180 GSM)
- Logitech MK270 Wireless Keyboard & Optical Mouse Combo (4 units)
- Anker 65W GaN USB-C Fast Charger with 2m Braided Cable
- SanDisk Ultra Dual 64GB USB 3.1 & Type-C OTG Flash Drive (5 units)

---

## 🔍 4. Explore, Search & Filter Capabilities

In [`server/src/controllers/resourceController.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/controllers/resourceController.js):
- **Safe Regex Sanitization:** `escapeRegex(text)` prevents NoSQL regex injection across all user-supplied search parameters.
- **Multi-Field Search:** Searches across `title`, `description`, `category`, `subcategory`, `institution`, `location.campus`, `location.building`, `academicMetadata.subject`, `academicMetadata.branch`, `academicMetadata.department`, `academicMetadata.course`, `academicMetadata.semester`, `academicMetadata.academicYear`, `academicMetadata.classLevel`, `academicMetadata.bookTitle`, `academicMetadata.author`, `academicMetadata.edition`, and `academicMetadata.isbn`.
- **Query Filters:** Support for `category`, `subcategory`, `branch`, `department`, `semester`, `year`, `academicYear`, `classLevel`, `subject`, `condition`, `location`, `campus`, `availability`, and `resourceType`.
- **Dynamic Frontend Filtering:** In [`client/src/components/resources/ResourceFilters.jsx`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/client/src/components/resources/ResourceFilters.jsx), responsive category pills, subcategory pills, branch selector, campus selector, and availability status selector adapt cleanly across both Light Mode and Dark Mode.

---

## 🧠 5. Smart Match & Resource Rescue Integration

- In [`server/src/services/matchingService.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/services/matchingService.js):
  - Natural-language keyword inference matches student essentials, textbooks, drafters, and gadgets to their respective categories.
  - `relatedGroups` contains cross-category relationships across student essentials, books, design supplies, and gadgets.
  - Relevance scoring checks `subcategory`, `subject`, `branch`, `department`, `course`, `bookTitle`, and `author`.
- In [`server/src/services/rescueService.js`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/server/src/services/rescueService.js):
  - Utilization calculations accommodate multi-unit student items based on operating hours and quantity without synthetic utilization metrics.

---

## 🎨 6. Dual-Theme Light & Dark Mode Compliance

- Components, forms, and cards bind directly to CSS custom properties defined in [`client/src/index.css`](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/client/src/index.css).
- Light Mode: Off-white background (`#f8fafc`), crisp white cards (`#ffffff`), dark slate text (`#0f172a`), muted grey secondary (`#334155`), and subtle borders (`#e2e8f0`).
- Dark Mode: Deep charcoal background (`#090d16`), slate-900 cards (`#0f172a`), crisp white text (`#f8fafc`), and slate-400 secondary text (`#94a3b8`).
- Contrast ratios verified against WCAG 2.1 AA (4.5:1 minimum) and AAA (7:1 for card text).

---

## 🧪 7. Automated Verification Results

- **Part 18 Student Resources Suite (`studentResourcesTest.js`):** **21/21 Passed, 0 Failed**.
- **Full Backend Test Suites (`npm test --prefix server`):** All 16+ test suites passing with 0 failures.
- **Frontend Production Build (`npm run build --prefix client`):** Clean build (Vite / Rolldown, 2,038 modules, 0 errors).
- **Real Atlas Database Integration (`realAtlasDbTest.js`):** Fully verified against live Atlas cluster.

