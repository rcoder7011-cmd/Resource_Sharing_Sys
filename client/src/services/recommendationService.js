/**
 * Need-First Smart Matching API Service (Part 13)
 * Connects frontend interface to backend smart ranking and need-parsing endpoints.
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
 * Submit need description and criteria for smart matching
 * @param {Object} criteria - Search and need criteria
 * @param {string} [token] - Optional auth token
 */
export async function getSmartMatches(criteria = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/recommendations/match`, {
    method: 'POST',
    headers,
    body: JSON.stringify(criteria),
  });

  return handleResponse(response);
}

/**
 * Parse natural language text into inferred category, location, and intent signals
 * @param {string} text - Natural language need description
 */
export async function parseNeedText(text) {
  const response = await fetch(`${API_BASE_URL}/recommendations/parse-need`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  return handleResponse(response);
}

