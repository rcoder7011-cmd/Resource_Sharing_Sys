# In-App Chat & Pickup Coordination (Part 17)

**Project:** CodeHack India 2026 — Resource Sharing Platform: *“Unlock Underused Equipment and Spaces”*  
**Date:** October 2026  
**Status:** Implemented & Verified  
**Automated Tests:** 19/19 Passing in `chatTest.js` | 467/467 Across Full Test Suite  

---

## 1. Overview & Core Purpose

While standard booking platforms stop after a reservation request is approved, physical equipment loans and laboratory spaces require nuanced, secure handover coordination. Borrowers and custodians need to arrange:
- Meeting times and lab opening hours.
- Exact room numbers, desk locations, or storage lockers.
- Special handling requirements, gate pass requirements, or power cords.
- Optional direct telephone contact without publicly exposing personal numbers.

**Part 17: In-App Chat & Pickup Coordination** delivers an end-to-end communication system directly inside the platform. It eliminates the need for unverified external messaging apps while maintaining an audit trail and strict privacy controls.

---

## 2. Architecture & Data Models

### 2.1 MongoDB Collections & Schemas

#### 1. `Conversation` (`server/src/models/Conversation.js`)
Linked strictly 1-to-1 with a `Booking` document:
- `booking`: `ObjectId (ref: 'Booking', required, unique, indexed)`
- `resource`: `ObjectId (ref: 'Resource', required)`
- `participants`: `[ObjectId (ref: 'User')]` (contains borrower and custodian)
- `lastMessage`:
  - `text`: `String` (trimmed, max 2000 chars)
  - `sender`: `ObjectId (ref: 'User')`
  - `sentAt`: `Date`
- `unreadRequester`: `Number` (default: 0)
- `unreadOwner`: `Number` (default: 0)
- `status`: `'active' | 'archived'` (default: `'active'`)
- `timestamps`: `true` (auto `createdAt` and `updatedAt`)

#### 2. `Message` (`server/src/models/Message.js`)
Stores immutable text exchanges between authorized participants:
- `conversation`: `ObjectId (ref: 'Conversation', required, indexed)`
- `booking`: `ObjectId (ref: 'Booking', required, indexed)`
- `sender`: `ObjectId (ref: 'User', required)`
- `recipient`: `ObjectId (ref: 'User', required)`
- `text`: `String` (trimmed, min 1, max 2000 chars)
- `isRead`: `Boolean` (default: false)
- `readAt`: `Date` (default: null)
- `timestamps`: `true`

#### 3. `Booking.pickupCoordination` Subdocument (`server/src/models/Booking.js`)
- `exactLocation`: `String` (max 300 chars, e.g., *"Room 402, Science Block, 4th Floor"*)
- `instructions`: `String` (max 1000 chars, e.g., *"Show university ID at reception desk"*)
- `targetTime`: `Date` (proposed or confirmed pickup window)
- `ownerPhone`: `String` (max 30 chars, optional)
- `requesterPhone`: `String` (max 30 chars, optional)
- `sharePhoneWithRequester`: `Boolean` (owner opt-in flag)
- `sharePhoneWithOwner`: `Boolean` (borrower opt-in flag)
- `lastUpdatedAt`: `Date`
- `lastUpdatedBy`: `ObjectId (ref: 'User')`

---

## 3. Privacy & Security Rules

1. **Strict Participant Authorization:**
   Every chat and pickup endpoint strictly enforces that `req.user._id` must match `booking.requester` or `booking.owner`. Any non-participating user is rejected with `403 Forbidden`.
2. **No Admin Backdoors:**
   Unlike public listings or moderation dashboards, administrator accounts do not have automatic read/write access to private user conversations unless they are an active party in that booking.
3. **Derived Sender Identity:**
   The `sender` field is derived exclusively from the authenticated JWT token (`req.user._id`). Client-supplied sender IDs are ignored.
4. **Lifecycle-Gated Pickup Privacy:**
   - When a booking is `pending`, `rejected`, or `cancelled`, pickup location and contact details remain locked (`isLocked: true`).
   - Pickup details only unlock when the reservation is `approved`, `checked_in`, or `completed`.
5. **Granular Phone Number Disclosure:**
   - Phone numbers are never required; users can coordinate entirely via chat.
   - If provided, an owner's phone is only revealed to the borrower if `sharePhoneWithRequester: true`.
   - A borrower's phone is only revealed to the owner if `sharePhoneWithOwner: true`.

---

## 4. Real-Time Socket.IO Integration

Reusing the authenticated Socket.IO connection established in Part 7:
- **`chat:join_booking` / `chat:leave_booking`**: Joins room `booking:<bookingId>` after server-side participation check.
- **`chat:message`**: Emits new messages to both `recipient` and `sender` rooms in real time.
- **`chat:read`**: Emits read status when the recipient opens the conversation feed.
- **`chat:user_typing`**: Provides live typing feedback (*"Alex is typing..."*).
- **`chat:unread_update`**: Dispatches updated total unread count to navbar badges.
- **`chat:pickup_updated`**: Notifies the other participant when location or timing is updated.

---

## 5. API Reference

All routes are mounted under `/api/chat` and require Bearer JWT authentication:

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/chat/conversations` | List user's conversations with preview & unread counts | Authenticated Participant |
| `GET` | `/api/chat/unread-count` | Get total unread message count for navbar pill | Authenticated User |
| `GET` | `/api/chat/booking/:bookingId` | Get or initialize conversation for a booking | Requester or Owner |
| `GET` | `/api/chat/booking/:bookingId/messages` | Fetch messages & mark incoming as read | Requester or Owner |
| `POST` | `/api/chat/booking/:bookingId/messages` | Send message (max 2000 chars) | Requester or Owner |
| `GET` | `/api/chat/booking/:bookingId/pickup` | Get pickup details (locked if unapproved) | Requester or Owner |
| `PUT` | `/api/chat/booking/:bookingId/pickup` | Update location, instructions, timing, or phone | Requester or Owner |

---

## 6. Frontend User Interface

- **Dedicated Inbox / Chat Page (`client/src/pages/ChatPage.jsx`):**
  - Responsive two-pane layout: conversation list on left, active chat and coordination on right.
  - Quick coordination templates for rapid messaging.
  - Collapsible Pickup & Coordination panel with secure location inputs and phone opt-in.
  - Live typing indicator and delivery/read receipts.
- **Navigation Integration:**
  - Messages icon in [Navbar.jsx](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/client/src/components/navigation/Navbar.jsx) with live unread badge.
  - Mobile menu includes dedicated "Messages & Coordination" item with unread count.
- **Booking Dashboard Shortcuts:**
  - "Chat & Pickup" button on every booking card in both "My Bookings" and "Incoming Requests" tabs in [DashboardPage.jsx](file:///C:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/client/src/pages/DashboardPage.jsx).
  - Quick action in booking confirmation modal to jump directly into chat.

---

## 7. Verification & Test Results

- **Unit & Integration Suite (`server/src/tests/chatTest.js`):** **19 / 19 tests passed** (0 failures).
- **Full Unified Test Suite (`server/src/tests/index.js`):** **467 / 467 tests passed** (0 failures).
- **Client Linting (OxLint):** **0 errors**.
- **Production Build (Vite):** Completed in **2.05s** with 0 errors.

