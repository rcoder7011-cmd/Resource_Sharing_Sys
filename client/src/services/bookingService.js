/**
 * Booking API Service
 * Centralizes all network requests for booking reservations, user schedules,
 * custodian approvals, and status transitions.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper to process API response JSON and extract meaningful error messages.
 */
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (isJson && data?.message) ||
      (isJson && data?.error?.message) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Submit a new booking request for a resource
 */
export async function createBooking(bookingData, token) {
  if (!token) throw new Error('Authentication token required to submit a booking request');

  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bookingData),
  });

  return handleResponse(response);
}

/**
 * Fetch bookings requested by the current authenticated user
 */
export async function getMyBookings(token) {
  if (!token) throw new Error('Authentication token required to fetch your bookings');

  const response = await fetch(`${API_BASE_URL}/bookings/mine`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch incoming booking requests for resources owned by the user
 */
export async function getOwnerBookings(token) {
  if (!token) throw new Error('Authentication token required to fetch incoming booking requests');

  const response = await fetch(`${API_BASE_URL}/bookings/owner`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch a single booking by ID
 */
export async function getBookingById(id, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to view booking');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Cancel a pending or approved booking (Requester)
 */
export async function cancelBooking(id, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to cancel booking');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Approve a pending booking (Resource Owner)
 */
export async function approveBooking(id, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to approve booking');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Reject a pending booking with an optional reason (Resource Owner)
 */
export async function rejectBooking(id, reason, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to reject booking');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  return handleResponse(response);
}

/**
 * Check in / pick up resource for an approved booking (Borrower)
 */
export async function checkInBooking(id, checkInData, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to perform check-in');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(checkInData),
  });

  return handleResponse(response);
}

/**
 * Check out / return resource for an active booking (Borrower)
 */
export async function checkOutBooking(id, checkOutData, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to return resource');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/check-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(checkOutData),
  });

  return handleResponse(response);
}

/**
 * Report a condition issue or discrepancy for a booking (Borrower or Owner)
 */
export async function reportBookingIssue(id, issueData, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to report an issue');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/report-issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(issueData),
  });

  return handleResponse(response);
}

/**
 * Fetch condition verification record and issue report for a booking
 */
export async function getBookingCondition(id, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to view condition records');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/condition`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Upload an evidence photo securely for a booking (Handover, Return, or Issue)
 */
export async function uploadBookingEvidence(id, { image, mimeType }, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to upload evidence');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/evidence/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image, mimeType }),
  });

  return handleResponse(response);
}

/**
 * Fetch chronological evidence timeline for a booking
 */
export async function getBookingTimeline(id, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to view timeline');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/timeline`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch full proof comparison (initial vs return) for a booking
 */
export async function getBookingProof(id, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to view proof records');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/proof`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Submit initial handover proof (Handover condition verification)
 */
export async function submitHandoverProof(id, proofData, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to record handover proof');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/handover-proof`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(proofData),
  });

  return handleResponse(response);
}

/**
 * Submit final return proof (Return condition verification & audit)
 */
export async function submitReturnProof(id, proofData, token) {
  if (!id) throw new Error('Booking ID is required');
  if (!token) throw new Error('Authentication token required to record return proof');

  const response = await fetch(`${API_BASE_URL}/bookings/${id}/return-proof`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(proofData),
  });

  return handleResponse(response);
}

export default {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  getBookingById,
  cancelBooking,
  approveBooking,
  rejectBooking,
  checkInBooking,
  submitHandoverProof,
  checkOutBooking,
  submitReturnProof,
  reportBookingIssue,
  getBookingCondition,
  uploadBookingEvidence,
  getBookingTimeline,
  getBookingProof,
};

