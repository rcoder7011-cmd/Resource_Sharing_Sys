/**
 * Chat and Pickup Coordination API Service
 * Handles user-to-user in-app messaging, conversation lists,
 * unread badges, and verified pickup coordination details.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
 * Fetch all conversations for the authenticated user
 */
export async function getConversations(token) {
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch conversation details for a specific booking
 */
export async function getConversation(bookingId, token) {
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE_URL}/chat/booking/${bookingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch messages for a booking conversation (automatically marks incoming as read)
 */
export async function getMessages(bookingId, token) {
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE_URL}/chat/booking/${bookingId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Send a message within a booking conversation
 */
export async function sendMessage(bookingId, text, token) {
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE_URL}/chat/booking/${bookingId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  return handleResponse(response);
}

/**
 * Get total unread messages count for current user
 */
export async function getUnreadCount(token) {
  if (!token) return { count: 0 };

  const response = await fetch(`${API_BASE_URL}/chat/unread-count`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Get pickup coordination details for an approved booking
 */
export async function getPickupCoordination(bookingId, token) {
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE_URL}/chat/booking/${bookingId}/pickup`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Update pickup coordination details
 */
export async function updatePickupCoordination(bookingId, payload, token) {
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${API_BASE_URL}/chat/booking/${bookingId}/pickup`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

