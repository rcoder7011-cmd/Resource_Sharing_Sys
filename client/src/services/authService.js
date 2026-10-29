/**
 * Authentication API Service
 * Centralizes all network requests for user registration, login, profile retrieval, and logout.
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
 * Register a new user account
 * @param {object} param0
 * @param {string} param0.name
 * @param {string} param0.email
 * @param {string} param0.password
 * @returns {Promise<{ success: boolean, token: string, user: object }>}
 */
export async function registerUser({ name, email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  return handleResponse(response);
}

/**
 * Authenticate with email and password
 * @param {object} param0
 * @param {string} param0.email
 * @param {string} param0.password
 * @returns {Promise<{ success: boolean, token: string, user: object }>}
 */
export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(response);
}

/**
 * Fetch authenticated user profile using Bearer JWT
 * @param {string} token - JWT bearer token
 * @returns {Promise<{ success: boolean, user: object }>}
 */
export async function getCurrentUser(token) {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Notify server of user logout
 * @param {string} [token] - Optional current JWT token
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function logoutUser(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers,
    });
    return handleResponse(response);
  } catch {
    // Graceful offline fallback — client-side token discard still succeeds
    return { success: true, message: 'Logged out client-side' };
  }
}

export default {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
};
