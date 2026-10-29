const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Handle API responses with robust error parsing
 */
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (isJson && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      `Request failed with status: ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Fetch paginated notification history for the authenticated user
 */
export async function getNotifications(
  { page = 1, limit = 20, unreadOnly = false } = {},
  token
) {
  if (!token) throw new Error('Authentication token required');

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (unreadOnly) {
    params.append('unreadOnly', 'true');
  }

  const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch unread notification count
 */
export async function getUnreadCount(token) {
  if (!token) throw new Error('Authentication token required');

  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id, token) {
  if (!id) throw new Error('Notification ID is required');
  if (!token) throw new Error('Authentication token required');

  const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead(token) {
  if (!token) throw new Error('Authentication token required');

  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
