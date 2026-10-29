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
 * Helper to build auth headers
 */
const getAuthHeaders = (token) => {
  if (!token) throw new Error('Authentication token required for administrative action');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Fetch dashboard overview metrics
 */
export async function getDashboardStats(token) {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Fetch platform analytics with optional date filters
 */
export async function getPlatformAnalytics(
  { range = '30d', startDate = '', endDate = '' } = {},
  token
) {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`${API_BASE_URL}/admin/analytics?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Fetch paginated users list with search & filters
 */
export async function getUsers(
  { page = 1, limit = 10, search = '', role = '', status = '', sortBy = 'newest' } = {},
  token
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  if (sortBy) params.append('sortBy', sortBy);

  const response = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Update user role (promote to admin or demote to user)
 */
export async function updateUserRole(userId, role, token) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ role }),
  });
  return handleResponse(response);
}

/**
 * Suspend or reactivate user account
 */
export async function updateUserStatus(userId, { status, reason = '' }, token) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status, reason }),
  });
  return handleResponse(response);
}

/**
 * Fetch paginated resources with moderation details
 */
export async function getAdminResources(
  {
    page = 1,
    limit = 10,
    search = '',
    category = '',
    moderationStatus = '',
    availabilityStatus = '',
    sortBy = 'newest',
  } = {},
  token
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (moderationStatus) params.append('moderationStatus', moderationStatus);
  if (availabilityStatus) params.append('availabilityStatus', availabilityStatus);
  if (sortBy) params.append('sortBy', sortBy);

  const response = await fetch(`${API_BASE_URL}/admin/resources?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Moderate resource listing (approved / flagged / hidden)
 */
export async function moderateResource(resourceId, { moderationStatus, reason = '' }, token) {
  const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}/moderation`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ moderationStatus, reason }),
  });
  return handleResponse(response);
}

/**
 * Fetch paginated issue reports with booking & condition history
 */
export async function getIssueReports(
  { page = 1, limit = 10, status = '', dateFrom = '', dateTo = '' } = {},
  token
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.append('status', status);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const response = await fetch(`${API_BASE_URL}/admin/issues?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Update issue report status & administrative resolution note
 */
export async function updateIssueReportStatus(
  bookingId,
  { status, resolutionNotes = '' },
  token
) {
  const response = await fetch(`${API_BASE_URL}/admin/issues/${bookingId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status, resolutionNotes }),
  });
  return handleResponse(response);
}

/**
 * Fetch paginated administrative audit logs
 */
export async function getAuditLogs({ page = 1, limit = 20, action = '' } = {}, token) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (action) params.append('action', action);

  const response = await fetch(`${API_BASE_URL}/admin/audit-logs?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Fetch platform-wide Smart Resource Rescue aggregate summary metrics
 */
export async function getRescueSummary({ windowDays = 30 } = {}, token) {
  const params = new URLSearchParams({
    windowDays: String(windowDays),
  });

  const response = await fetch(`${API_BASE_URL}/admin/rescue/summary?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Fetch evaluated resources from Smart Resource Rescue engine with filtering & pagination
 */
export async function getRescueResources(
  { windowDays = 30, classification = 'all', category = '', search = '', page = 1, limit = 20 } = {},
  token
) {
  const params = new URLSearchParams({
    windowDays: String(windowDays),
    classification,
    page: String(page),
    limit: String(limit),
  });
  if (category) params.append('category', category);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE_URL}/admin/rescue/resources?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Fetch detailed rescue breakdown and full recommendations for a single resource
 */
export async function getRescueResourceDetails(resourceId, { windowDays = 30 } = {}, token) {
  const params = new URLSearchParams({
    windowDays: String(windowDays),
  });

  const response = await fetch(`${API_BASE_URL}/admin/rescue/resources/${resourceId}?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

