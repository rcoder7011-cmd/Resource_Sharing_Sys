/**
 * Resource API Service
 * Centralizes all network requests for resource catalog queries, details,
 * user-owned listings, creation, updating, and deletion.
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
 * Fetch paginated resources from backend with search and filter queries
 */
export async function getResources({
  search = '',
  category = '',
  location = '',
  availability = '',
  sortBy = 'newest',
  page = 1,
  limit = 9,
} = {}) {
  const params = new URLSearchParams();

  if (search && search.trim()) params.append('search', search.trim());
  if (category && category !== 'All Categories') params.append('category', category);
  if (location && location !== 'All Campuses') params.append('location', location);
  if (availability && availability !== 'All Statuses') params.append('availability', availability);
  if (sortBy) params.append('sortBy', sortBy);
  if (page) params.append('page', String(page));
  if (limit) params.append('limit', String(limit));

  const url = `${API_BASE_URL}/resources${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Fetch a single resource by its MongoDB ObjectId or slug
 */
export async function getResourceById(id) {
  if (!id) throw new Error('Resource ID is required');
  const response = await fetch(`${API_BASE_URL}/resources/${id}`);
  return handleResponse(response);
}

/**
 * Fetch resources owned by the currently authenticated user
 */
export async function getMyResources(token) {
  if (!token) throw new Error('Authentication token required to fetch your listings');

  const response = await fetch(`${API_BASE_URL}/resources/mine`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Fetch utilization metrics and rescue tips for resources owned by the currently authenticated user
 */
export async function getMyResourceUtilization({ windowDays = 30 } = {}, token) {
  if (!token) throw new Error('Authentication token required to fetch resource utilization');

  const params = new URLSearchParams({
    windowDays: String(windowDays),
  });

  const response = await fetch(`${API_BASE_URL}/resources/mine/utilization?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

/**
 * Create a new resource listing
 */
export async function createResource(resourceData, token) {
  if (!token) throw new Error('Authentication token required to create a listing');

  const response = await fetch(`${API_BASE_URL}/resources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(resourceData),
  });

  return handleResponse(response);
}

/**
 * Update an existing resource listing (Owner or Admin)
 */
export async function updateResource(id, updateData, token) {
  if (!id) throw new Error('Resource ID is required');
  if (!token) throw new Error('Authentication token required to update listing');

  const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });

  return handleResponse(response);
}

/**
 * Delete a resource listing (Owner or Admin)
 */
export async function deleteResource(id, token) {
  if (!id) throw new Error('Resource ID is required');
  if (!token) throw new Error('Authentication token required to delete listing');

  const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
}

export default {
  getResources,
  getResourceById,
  getMyResources,
  getMyResourceUtilization,
  createResource,
  updateResource,
  deleteResource,
};

