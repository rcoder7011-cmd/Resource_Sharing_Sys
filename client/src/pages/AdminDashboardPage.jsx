import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Layers,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  Search,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Sliders,
  History,
  X,
  Sparkles,
  TrendingDown,
  Info,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardStats,
  getPlatformAnalytics,
  getUsers,
  updateUserRole,
  updateUserStatus,
  getAdminResources,
  moderateResource,
  getIssueReports,
  updateIssueReportStatus,
  getAuditLogs,
  getRescueSummary,
  getRescueResources,
  getRescueResourceDetails,
} from '../services/adminService';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

/**
 * Helper to format ISO timestamps
 */
const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function AdminDashboardPage() {
  const { user, token } = useAuth();

  // Active top-level navigation tab
  const [activeTab, setActiveTab] = useState('overview');

  // Loading & Global Status
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // 1. Dashboard Metrics State
  const [stats, setStats] = useState(null);

  // 2. Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('30d');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // 3. User Management State
  const [usersData, setUsersData] = useState({ users: [], pagination: {} });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);

  // User Actions Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalType, setUserModalType] = useState(null); // 'role' | 'status'
  const [targetRole, setTargetRole] = useState('user');
  const [targetStatus, setTargetStatus] = useState('suspended');
  const [statusReason, setStatusReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // 4. Resource Moderation State
  const [resourcesData, setResourcesData] = useState({ resources: [], pagination: {} });
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('');
  const [resourceModFilter, setResourceModFilter] = useState('');
  const [resourcePage, setResourcePage] = useState(1);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Resource Moderation Modal
  const [selectedResource, setSelectedResource] = useState(null);
  const [targetModStatus, setTargetModStatus] = useState('flagged');
  const [modReason, setModReason] = useState('');

  // 5. Issue Reports State
  const [issuesData, setIssuesData] = useState({ issues: [], pagination: {} });
  const [issueStatusFilter, setIssueStatusFilter] = useState('');
  const [issuePage, setIssuePage] = useState(1);
  const [issuesLoading, setIssuesLoading] = useState(false);

  // Issue Resolution Modal
  const [selectedIssueBooking, setSelectedIssueBooking] = useState(null);
  const [targetIssueStatus, setTargetIssueStatus] = useState('under_review');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // 6. Audit Trail State
  const [auditData, setAuditData] = useState({ logs: [], pagination: {} });
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  // 7. Smart Resource Rescue State (Part 11)
  const [rescueSummary, setRescueSummary] = useState(null);
  const [rescueResourcesData, setRescueResourcesData] = useState({ resources: [], pagination: {} });
  const [rescueWindowDays, setRescueWindowDays] = useState(30);
  const [rescueClassificationFilter, setRescueClassificationFilter] = useState('all');
  const [rescueCategoryFilter, setRescueCategoryFilter] = useState('');
  const [rescueSearch, setRescueSearch] = useState('');
  const [rescuePage, setRescuePage] = useState(1);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [selectedRescueResource, setSelectedRescueResource] = useState(null);
  const [rescueDetailLoading, setRescueDetailLoading] = useState(false);
  const [rescueDetailData, setRescueDetailData] = useState(null);

  /**
   * Clear feedback banners after 5 seconds
   */
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  /**
   * Fetch Overview Stats
   */
  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getDashboardStats(token);
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load dashboard metrics');
    }
  }, [token]);

  /**
   * Fetch Analytics
   */
  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const res = await getPlatformAnalytics({ range: analyticsRange }, token);
      if (res?.analytics) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load platform analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token, analyticsRange]);

  /**
   * Fetch Users List
   */
  const loadUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const res = await getUsers(
        {
          page: userPage,
          limit: 10,
          search: userSearch,
          role: userRoleFilter,
          status: userStatusFilter,
        },
        token
      );
      if (res?.data) {
        setUsersData({ users: res.data, pagination: res.pagination });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load user management records');
    } finally {
      setUsersLoading(false);
    }
  }, [token, userPage, userSearch, userRoleFilter, userStatusFilter]);

  /**
   * Fetch Resources List
   */
  const loadResources = useCallback(async () => {
    if (!token) return;
    setResourcesLoading(true);
    try {
      const res = await getAdminResources(
        {
          page: resourcePage,
          limit: 10,
          search: resourceSearch,
          category: resourceCategoryFilter,
          moderationStatus: resourceModFilter,
        },
        token
      );
      if (res?.data) {
        setResourcesData({ resources: res.data, pagination: res.pagination });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load resource records');
    } finally {
      setResourcesLoading(false);
    }
  }, [token, resourcePage, resourceSearch, resourceCategoryFilter, resourceModFilter]);

  /**
   * Fetch Issue Reports
   */
  const loadIssues = useCallback(async () => {
    if (!token) return;
    setIssuesLoading(true);
    try {
      const res = await getIssueReports(
        {
          page: issuePage,
          limit: 10,
          status: issueStatusFilter,
        },
        token
      );
      if (res?.data) {
        setIssuesData({ issues: res.data, pagination: res.pagination });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load issue reports');
    } finally {
      setIssuesLoading(false);
    }
  }, [token, issuePage, issueStatusFilter]);

  /**
   * Fetch Audit Logs
   */
  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await getAuditLogs(
        {
          page: auditPage,
          limit: 15,
          action: auditActionFilter,
        },
        token
      );
      if (res?.data) {
        setAuditData({ logs: res.data, pagination: res.pagination });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load audit trail');
    } finally {
      setAuditLoading(false);
    }
  }, [token, auditPage, auditActionFilter]);

  /**
   * Fetch Smart Resource Rescue Summary
   */
  const loadRescueSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getRescueSummary({ windowDays: rescueWindowDays }, token);
      if (res?.data) {
        setRescueSummary(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load rescue summary metrics');
    }
  }, [token, rescueWindowDays]);

  /**
   * Fetch Smart Resource Rescue Resources List
   */
  const loadRescueResources = useCallback(async () => {
    if (!token) return;
    setRescueLoading(true);
    try {
      const res = await getRescueResources(
        {
          windowDays: rescueWindowDays,
          classification: rescueClassificationFilter,
          category: rescueCategoryFilter,
          search: rescueSearch,
          page: rescuePage,
          limit: 10,
        },
        token
      );
      if (res?.data) {
        setRescueResourcesData({ resources: res.data, pagination: res.pagination });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load rescue intelligence');
    } finally {
      setRescueLoading(false);
    }
  }, [
    token,
    rescueWindowDays,
    rescueClassificationFilter,
    rescueCategoryFilter,
    rescueSearch,
    rescuePage,
  ]);

  /**
   * Fetch Detailed Rescue Breakdown for a Resource
   */
  const handleOpenRescueDetails = async (resource) => {
    setSelectedRescueResource(resource);
    setRescueDetailLoading(true);
    setRescueDetailData(null);
    try {
      const res = await getRescueResourceDetails(
        resource.resourceId || resource._id,
        { windowDays: rescueWindowDays },
        token
      );
      if (res?.data) {
        setRescueDetailData(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load resource breakdown');
    } finally {
      setRescueDetailLoading(false);
    }
  };

  /**
   * Initial mount loader
   */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadStats();
      await loadRescueSummary();
      setIsLoading(false);
    };
    init();
  }, [loadStats, loadRescueSummary]);

  /**
   * Tab switch trigger
   */
  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'resources') loadResources();
    if (activeTab === 'issues') loadIssues();
    if (activeTab === 'audit') loadAuditLogs();
    if (activeTab === 'rescue') {
      loadRescueSummary();
      loadRescueResources();
    }
  }, [
    activeTab,
    loadAnalytics,
    loadUsers,
    loadResources,
    loadIssues,
    loadAuditLogs,
    loadRescueSummary,
    loadRescueResources,
  ]);

  /**
   * Full Refresh
   */
  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    await loadStats();
    if (activeTab === 'analytics') await loadAnalytics();
    if (activeTab === 'users') await loadUsers();
    if (activeTab === 'resources') await loadResources();
    if (activeTab === 'issues') await loadIssues();
    if (activeTab === 'audit') await loadAuditLogs();
    if (activeTab === 'rescue') {
      await loadRescueSummary();
      await loadRescueResources();
    }
    setIsRefreshing(false);
    setSuccessBanner('Administrative records and live statistics refreshed.');
  };

  /**
   * Execute User Role Change
   */
  const handleUpdateRoleSubmit = async () => {
    if (!selectedUser) return;
    setActionSubmitting(true);
    setErrorMessage(null);
    try {
      await updateUserRole(selectedUser._id, targetRole, token);
      setSuccessBanner(
        `Role for user "${selectedUser.name}" (${selectedUser.email}) updated to "${targetRole}".`
      );
      setSelectedUser(null);
      setUserModalType(null);
      await loadUsers();
      await loadStats();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update user role');
    } finally {
      setActionSubmitting(false);
    }
  };

  /**
   * Execute User Suspension / Reactivation
   */
  const handleUpdateStatusSubmit = async () => {
    if (!selectedUser) return;
    setActionSubmitting(true);
    setErrorMessage(null);
    try {
      await updateUserStatus(
        selectedUser._id,
        { status: targetStatus, reason: statusReason },
        token
      );
      setSuccessBanner(
        `Account for "${selectedUser.name}" has been ${targetStatus === 'active' ? 'reactivated' : 'suspended'}.`
      );
      setSelectedUser(null);
      setUserModalType(null);
      setStatusReason('');
      await loadUsers();
      await loadStats();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update user status');
    } finally {
      setActionSubmitting(false);
    }
  };

  /**
   * Execute Resource Moderation
   */
  const handleModerateResourceSubmit = async () => {
    if (!selectedResource) return;
    setActionSubmitting(true);
    setErrorMessage(null);
    try {
      await moderateResource(
        selectedResource._id,
        { moderationStatus: targetModStatus, reason: modReason },
        token
      );
      setSuccessBanner(
        `Resource "${selectedResource.title}" moderation status updated to "${targetModStatus}".`
      );
      setSelectedResource(null);
      setModReason('');
      await loadResources();
      await loadStats();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to moderate resource');
    } finally {
      setActionSubmitting(false);
    }
  };

  /**
   * Execute Issue Report Status Update
   */
  const handleUpdateIssueSubmit = async () => {
    if (!selectedIssueBooking) return;
    setActionSubmitting(true);
    setErrorMessage(null);
    try {
      await updateIssueReportStatus(
        selectedIssueBooking._id,
        { status: targetIssueStatus, resolutionNotes },
        token
      );
      setSuccessBanner(
        `Issue report status updated to "${targetIssueStatus}". Reporter notified.`
      );
      setSelectedIssueBooking(null);
      setResolutionNotes('');
      await loadIssues();
      await loadStats();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update issue report');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 p-8">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          Loading institutional administration portal...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Administrative Operations & Platform Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Administrator Access
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Institutional oversight, real-time metrics, user governance, resource moderation, and audit compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullRefresh}
            disabled={isRefreshing}
            icon={RefreshCw}
            className={isRefreshing ? 'animate-spin' : ''}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Global Feedback Banners */}
      {errorMessage && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-500/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'System Overview', icon: Layers },
          { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
          { id: 'rescue', label: 'Smart Resource Rescue', icon: Sparkles },
          { id: 'users', label: 'User Governance', icon: Users },
          { id: 'resources', label: 'Resource Moderation', icon: Sliders },
          { id: 'issues', label: 'Condition & Handover Issues', icon: AlertOctagon },
          { id: 'audit', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setErrorMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'issues' && stats?.openIssues > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold ml-1">
                  {stats.openIssues}
                </span>
              )}
              {tab.id === 'rescue' && rescueSummary?.underusedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold ml-1">
                  {rescueSummary.underusedCount} underused
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SYSTEM OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Core Platform Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric Card 1 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Registered Users
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-1">
                    {stats?.totalUsers ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats?.suspendedUsers ? `${stats.suspendedUsers} suspended accounts` : 'All accounts active'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Metric Card 2 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Listed Resources
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-1">
                    {stats?.totalResources ?? 0}
                  </p>
                  <p className="text-xs text-emerald-400 mt-1">
                    {stats?.availableResources ?? 0} currently available
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              {/* Metric Card 3 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Bookings
                  </p>
                  <p className="text-3xl font-extrabold text-white mt-1">
                    {stats?.totalBookings ?? 0}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    {stats?.activeBookings ?? 0} active / checked-in
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <CalendarCheck className="w-6 h-6" />
                </div>
              </div>

              {/* Metric Card 4 */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Open Issue Reports
                  </p>
                  <p className="text-3xl font-extrabold text-rose-400 mt-1">
                    {stats?.openIssues ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Requiring custodian resolution
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Operational Status Cards */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Operational Status Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></div>
                <div>
                  <p className="text-xs text-slate-400">Pending Requests</p>
                  <p className="text-xl font-bold text-white">{stats?.pendingBookings ?? 0}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                <div>
                  <p className="text-xs text-slate-400">Completed & Returned</p>
                  <p className="text-xl font-bold text-white">{stats?.completedBookings ?? 0}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></div>
                <div>
                  <p className="text-xs text-slate-400">Flagged Listings</p>
                  <p className="text-xl font-bold text-white">{stats?.flaggedResources ?? 0}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-600 shrink-0"></div>
                <div>
                  <p className="text-xs text-slate-400">Hidden Inappropriate Listings</p>
                  <p className="text-xl font-bold text-white">{stats?.hiddenResources ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white">Aggregated Platform Analytics</h2>
              <p className="text-xs text-slate-400">
                Aggregated operational metrics across selected timeline.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Timeline:</span>
              {['7d', '30d', '90d', '1y', 'all'].map((rangeOption) => (
                <button
                  key={rangeOption}
                  onClick={() => setAnalyticsRange(rangeOption)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                    analyticsRange === rangeOption
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {rangeOption}
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="min-h-[300px] flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Resource Categories Distribution */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Resource Category Distribution
                  </h3>
                  <span className="text-xs text-slate-400">
                    {analytics?.categoryDistribution?.length || 0} categories
                  </span>
                </div>

                {(!analytics?.categoryDistribution || analytics.categoryDistribution.length === 0) ? (
                  <p className="text-xs text-slate-500 py-8 text-center">No categories recorded.</p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {analytics.categoryDistribution.map((item) => {
                      const totalRes = stats?.totalResources || 1;
                      const percentage = Math.min(100, Math.round((item.count / totalRes) * 100));
                      return (
                        <div key={item._id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{item._id}</span>
                            <span className="text-slate-400 font-mono">
                              {item.count} listings ({item.totalQuantity} units)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chart 2: Booking Status Distribution */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-purple-400" />
                    Booking Lifecycle Distribution
                  </h3>
                  <span className="text-xs text-slate-400">Total: {stats?.totalBookings || 0}</span>
                </div>

                {(!analytics?.bookingStatusDistribution || analytics.bookingStatusDistribution.length === 0) ? (
                  <p className="text-xs text-slate-500 py-8 text-center">No bookings recorded.</p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {analytics.bookingStatusDistribution.map((statusItem) => {
                      const totalBookings = stats?.totalBookings || 1;
                      const percentage = Math.min(
                        100,
                        Math.round((statusItem.count / totalBookings) * 100)
                      );
                      const colors = {
                        approved: 'from-emerald-500 to-emerald-600',
                        checked_in: 'from-blue-500 to-blue-600',
                        pending: 'from-amber-500 to-amber-600',
                        completed: 'from-purple-500 to-purple-600',
                        cancelled: 'from-slate-500 to-slate-600',
                        rejected: 'from-rose-500 to-rose-600',
                      };
                      const colorClass = colors[statusItem._id] || 'from-slate-500 to-slate-600';

                      return (
                        <div key={statusItem._id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium capitalize">
                              {statusItem._id.replace('_', ' ')}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {statusItem.count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-500`}
                              style={{ width: `${Math.max(percentage, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chart 3: Most Requested Resources Leaderboard */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Most Requested Resources (Institutional Demand)
                  </h3>
                  <span className="text-xs text-slate-400">Top Booked Equipment & Spaces</span>
                </div>

                {(!analytics?.topRequestedResources || analytics.topRequestedResources.length === 0) ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    No booking transactions recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Resource Title</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-center">Total Requests</th>
                          <th className="py-3 px-4 text-center">Approved / Completed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-sm">
                        {analytics.topRequestedResources.map((item, idx) => (
                          <tr key={item._id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white">
                              {item.title}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-xs">
                              {item.category}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-semibold text-blue-400">
                              {item.totalBookings}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-400">
                              {item.approvedBookings}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER GOVERNANCE */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => {
                  setUserStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          {usersLoading ? (
            <div className="min-h-[250px] flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : usersData.users.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-semibold">No users match your criteria.</p>
              <p className="text-xs text-slate-500 mt-1">Try broadening your search term or clearing filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {usersData.users.map((u) => {
                    const isSelf = user?.id === u._id;
                    return (
                      <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              u.status === 'suspended'
                                ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                                : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                            }`}
                          >
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          {formatDateOnly(u.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setUserModalType('role');
                              setTargetRole(u.role === 'admin' ? 'user' : 'admin');
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                          >
                            Change Role
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setUserModalType('status');
                              setTargetStatus(u.status === 'suspended' ? 'active' : 'suspended');
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                              u.status === 'suspended'
                                ? 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border-emerald-700/50'
                                : 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border-rose-700/50'
                            }`}
                          >
                            {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {usersData.pagination?.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
                  <span>
                    Page {usersData.pagination.page} of {usersData.pagination.pages} (
                    {usersData.pagination.total} total accounts)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={!usersData.pagination.hasPrevPage}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setUserPage((p) => p + 1)}
                      disabled={!usersData.pagination.hasNextPage}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RESOURCE MODERATION */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resources by title, description..."
                value={resourceSearch}
                onChange={(e) => {
                  setResourceSearch(e.target.value);
                  setResourcePage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={resourceCategoryFilter}
                onChange={(e) => {
                  setResourceCategoryFilter(e.target.value);
                  setResourcePage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Categories</option>
                <option value="Laboratories">Laboratories</option>
                <option value="Computers">Computers</option>
                <option value="Workshop Tools">Workshop Tools</option>
                <option value="Cameras">Cameras</option>
                <option value="Meeting Rooms">Meeting Rooms</option>
                <option value="Testing Equipment">Testing Equipment</option>
                <option value="Electronics">Electronics</option>
              </select>

              <select
                value={resourceModFilter}
                onChange={(e) => {
                  setResourceModFilter(e.target.value);
                  setResourcePage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Moderation</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          {/* Resources Table */}
          {resourcesLoading ? (
            <div className="min-h-[250px] flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : resourcesData.resources.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <Layers className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-semibold">No resource listings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Title & Facility</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Owner / Custodian</th>
                    <th className="py-3 px-4">Inventory</th>
                    <th className="py-3 px-4">Moderation Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {resourcesData.resources.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="max-w-xs truncate">{r.title}</div>
                        <div className="text-xs text-slate-400 font-normal">
                          {r.location?.campus || 'Main Campus'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">{r.category}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div>{r.owner?.name || 'Unknown'}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{r.owner?.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {r.quantity} units ({r.availabilityStatus})
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            r.moderationStatus === 'hidden'
                              ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                              : r.moderationStatus === 'flagged'
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                              : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                          }`}
                        >
                          {r.moderationStatus || 'approved'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedResource(r);
                            setTargetModStatus(r.moderationStatus || 'approved');
                            setModReason(r.moderationReason || '');
                          }}
                          className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                          Moderate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {resourcesData.pagination?.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
                  <span>
                    Page {resourcesData.pagination.page} of {resourcesData.pagination.pages} (
                    {resourcesData.pagination.total} total listings)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResourcePage((p) => Math.max(1, p - 1))}
                      disabled={!resourcesData.pagination.hasPrevPage}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setResourcePage((p) => p + 1)}
                      disabled={!resourcesData.pagination.hasNextPage}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CONDITION & HANDOVER ISSUES */}
      {activeTab === 'issues' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white">Reported Condition Discrepancies</h2>
              <p className="text-xs text-slate-400">
                Issues flagged during borrower check-in or owner return handovers.
              </p>
            </div>
            <select
              value={issueStatusFilter}
              onChange={(e) => {
                setIssueStatusFilter(e.target.value);
                setIssuePage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {issuesLoading ? (
            <div className="min-h-[250px] flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : issuesData.issues.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-semibold">No active handover issues reported.</p>
              <p className="text-xs text-slate-500 mt-1">All resource condition verifications are in sync.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issuesData.issues.map((b) => {
                const rep = b.issueReport || {};

                return (
                  <div
                    key={b._id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">
                            {b.resource?.title || 'Resource'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                              rep.status === 'resolved'
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                                : rep.status === 'under_review'
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                                : 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                            }`}
                          >
                            {rep.status || 'open'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Reported by {rep.reportedBy?.name || 'Party'} ({rep.reportedBy?.email}) on{' '}
                          {formatDateTime(rep.reportedAt)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIssueBooking(b);
                          setTargetIssueStatus(rep.status || 'open');
                          setResolutionNotes(rep.resolutionNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                      >
                        Update Resolution
                      </button>
                    </div>

                    {/* Condition Comparison Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div>
                        <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Initial Handover Condition
                        </p>
                        <p className="text-white font-mono mt-0.5 capitalize">
                          {rep.initialCondition || b.checkIn?.condition || 'Unspecified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Return / Final Condition
                        </p>
                        <p className="text-rose-400 font-mono mt-0.5 capitalize">
                          {rep.finalCondition || b.checkOut?.condition || 'Damaged'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Deterioration Detected
                        </p>
                        <p className="text-amber-400 font-mono mt-0.5">
                          {b.conditionComparison?.isWorsened ? '⚠️ Yes (Worsened)' : 'No Change'}
                        </p>
                      </div>
                    </div>

                    {/* Issue Description */}
                    <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl">
                      <span className="font-semibold text-slate-400">Report Description: </span>
                      {rep.description || 'No description provided.'}
                    </div>

                    {/* Resolution Notes if available */}
                    {rep.resolutionNotes && (
                      <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
                        <span className="font-semibold text-emerald-400">
                          Administrative Resolution Note:
                        </span>{' '}
                        {rep.resolutionNotes}
                        {rep.resolvedBy && (
                          <span className="text-slate-400 text-[11px] block mt-1">
                            Resolved by {rep.resolvedBy.name} on {formatDateTime(rep.resolvedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white">Immutable Administrative Audit Log</h2>
              <p className="text-xs text-slate-400">
                Append-only log of role modifications, suspensions, resource moderation, and resolutions.
              </p>
            </div>
            <select
              value={auditActionFilter}
              onChange={(e) => {
                setAuditActionFilter(e.target.value);
                setAuditPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="USER_ROLE_UPDATED">Role Updated</option>
              <option value="USER_STATUS_UPDATED">Status Updated</option>
              <option value="RESOURCE_MODERATED">Resource Moderated</option>
              <option value="ISSUE_STATUS_UPDATED">Issue Updated</option>
              <option value="ADMIN_INITIALIZED">Admin Initialized</option>
            </select>
          </div>

          {auditLoading ? (
            <div className="min-h-[250px] flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : auditData.logs.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <History className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-semibold">No audit records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin Actor</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Target Model</th>
                    <th className="py-3 px-4">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {auditData.logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-white">
                        <div className="font-semibold">{log.admin?.name || 'Administrator'}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{log.admin?.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-blue-400 border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {log.targetModel}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {auditData.pagination?.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
                  <span>
                    Page {auditData.pagination.page} of {auditData.pagination.pages} (
                    {auditData.pagination.total} total log entries)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={!auditData.pagination.hasPrevPage}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setAuditPage((p) => p + 1)}
                      disabled={!auditData.pagination.hasNextPage}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: SMART RESOURCE RESCUE (Part 11) */}
      {activeTab === 'rescue' && (
        <div className="space-y-6">
          {/* Rescue Header & Period Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Smart Resource Rescue: Underused Resource Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Optimization Intelligence
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Deterministic telemetry comparing declared operational capacity against confirmed bookings to identify underutilized campus equipment and generate actionable rescue strategies.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400">Analysis Window:</span>
                <select
                  value={rescueWindowDays}
                  onChange={(e) => {
                    setRescueWindowDays(Number(e.target.value));
                    setRescuePage(1);
                  }}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={7} className="bg-slate-900">Last 7 Days</option>
                  <option value={14} className="bg-slate-900">Last 14 Days</option>
                  <option value={30} className="bg-slate-900">Last 30 Days (Standard)</option>
                  <option value={60} className="bg-slate-900">Last 60 Days</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadRescueSummary();
                  loadRescueResources();
                }}
                disabled={rescueLoading}
                icon={RefreshCw}
                className={rescueLoading ? 'animate-spin' : ''}
              >
                Sync
              </Button>
            </div>
          </div>

          {/* Metric Cards Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1 */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Evaluated
              </p>
              <p className="text-2xl font-extrabold text-white mt-1">
                {rescueSummary?.totalAnalyzed ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Active campus assets</p>
            </div>

            {/* Card 2: Underused */}
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Underused Assets
                </p>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">
                {rescueSummary?.underusedCount ?? 0}
              </p>
              <p className="text-xs text-amber-300/80 mt-1">
                {rescueSummary?.underusedPercentage ?? 0}% of catalog (&lt;20% use)
              </p>
            </div>

            {/* Card 3: Moderate */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                Moderate Use
              </p>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">
                {rescueSummary?.moderateCount ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">20% – 60% capacity</p>
            </div>

            {/* Card 4: High Demand */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Well Used
              </p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {rescueSummary?.wellUsedCount ?? 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">&gt;60% capacity</p>
            </div>

            {/* Card 5: Campus Average */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                  Avg Platform Utilization
                </p>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {rescueSummary?.averageUtilizationRate ?? 0}%
                </p>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, rescueSummary?.averageUtilizationRate || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Assets' },
                { id: 'underused', label: 'Underused (<20%)' },
                { id: 'moderate', label: 'Moderate (20-60%)' },
                { id: 'well_used', label: 'High Demand (>60%)' },
                { id: 'insufficient_data', label: 'New / Calibrating' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => {
                    setRescueClassificationFilter(btn.id);
                    setRescuePage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    rescueClassificationFilter === btn.id
                      ? btn.id === 'underused'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={rescueCategoryFilter}
                onChange={(e) => {
                  setRescueCategoryFilter(e.target.value);
                  setRescuePage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Categories</option>
                <option value="Laboratories">Laboratories</option>
                <option value="Computers">Computers</option>
                <option value="Workshop Tools">Workshop Tools</option>
                <option value="Audio/Visual">Audio/Visual</option>
                <option value="Cameras">Cameras</option>
                <option value="Testing Equipment">Testing Equipment</option>
                <option value="Meeting Rooms">Meeting Rooms</option>
                <option value="Sports">Sports</option>
                <option value="Other">Other</option>
              </select>
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter title, campus, category..."
                  value={rescueSearch}
                  onChange={(e) => {
                    setRescueSearch(e.target.value);
                    setRescuePage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Resources Table */}
          {rescueLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-slate-900 rounded-2xl border border-slate-800">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-400">Calculating equipment utilization metrics...</p>
            </div>
          ) : rescueResourcesData.resources.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No resources matching filter criteria</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No equipment or spaces match the selected classification or search filters in the current {rescueWindowDays}-day window.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Resource & Campus</th>
                    <th className="py-3.5 px-4">Category / Qty</th>
                    <th className="py-3.5 px-4">Booked / Available Capacity</th>
                    <th className="py-3.5 px-4">Utilization Rate</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Primary Rescue Strategy</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rescueResourcesData.resources.map((res) => {
                    const campus = res.location?.campus || 'Main Campus';
                    const isUnder = res.classification === 'underused';
                    const isWell = res.classification === 'well_used';
                    const isInsuff = res.classification === 'insufficient_data';

                    return (
                      <tr key={res.resourceId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-bold text-white max-w-xs truncate">
                            {res.title}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{campus}</span>
                            <span>•</span>
                            <span className="capitalize">{res.resourceType}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                            {res.category}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-1">
                            {res.quantity} unit{res.quantity > 1 ? 's' : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono">
                          <div className="text-white font-semibold">
                            {res.utilizedUnitHours}h booked
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            of {res.totalAvailableUnitHours}h unit-cap
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono">
                              {res.utilizationRate}%
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isUnder
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : isWell
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isInsuff
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {isUnder ? 'Underused' : isWell ? 'High Demand' : isInsuff ? 'Calibrating' : 'Moderate'}
                            </span>
                          </div>
                          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full ${
                                isUnder
                                  ? 'bg-amber-500'
                                  : isWell
                                  ? 'bg-emerald-500'
                                  : isInsuff
                                  ? 'bg-slate-600'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, res.utilizationRate)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              res.confidence === 'high'
                                ? 'text-emerald-400'
                                : res.confidence === 'medium'
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span className="capitalize">{res.confidence}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {res.daysSinceCreation}d active
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs max-w-xs">
                          {res.primaryRecommendation ? (
                            <div>
                              <div className="font-semibold text-slate-200 truncate">
                                {res.primaryRecommendation.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {res.primaryRecommendation.suggestedAction}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Optimal state</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenRescueDetails(res)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 text-xs font-semibold transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Breakdown</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {rescueResourcesData.pagination?.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
                  <span>
                    Page {rescueResourcesData.pagination.page} of {rescueResourcesData.pagination.pages} (
                    {rescueResourcesData.pagination.total} analyzed resources)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRescuePage((p) => Math.max(1, p - 1))}
                      disabled={rescueResourcesData.pagination.page <= 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRescuePage((p) => p + 1)}
                      disabled={rescueResourcesData.pagination.page >= rescueResourcesData.pagination.pages}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: USER ROLE MODAL */}
      {userModalType === 'role' && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedUser(null);
            setUserModalType(null);
          }}
          title={`Modify User Role: ${selectedUser.name}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Select the administrative privilege tier for <strong className="text-white">{selectedUser.email}</strong>.
            </p>

            {user?.id === selectedUser._id && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                ⚠️ You cannot demote your own account. Self-demotion is prevented by platform security.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Target Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="user">User (Standard Member)</option>
                <option value="admin">Administrator (Institutional Staff)</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUser(null);
                  setUserModalType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateRoleSubmit}
                disabled={actionSubmitting || user?.id === selectedUser._id}
              >
                {actionSubmitting ? 'Updating...' : 'Confirm Role Update'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: USER STATUS MODAL */}
      {userModalType === 'status' && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedUser(null);
            setUserModalType(null);
          }}
          title={`${targetStatus === 'suspended' ? 'Suspend' : 'Reactivate'} Account: ${selectedUser.name}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {targetStatus === 'suspended'
                ? `Suspending this account will block future login access while preserving all historical bookings and audit trails.`
                : `Reactivating this account will restore standard login privileges immediately.`}
            </p>

            {user?.id === selectedUser._id && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                ⛔ Self-suspension is strictly prohibited to prevent administrative lockout.
              </div>
            )}

            {targetStatus === 'suspended' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">
                  Suspension Reason (Recorded in Audit Log)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Repeated failure to return equipment in acceptable condition..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUser(null);
                  setUserModalType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={targetStatus === 'suspended' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleUpdateStatusSubmit}
                disabled={actionSubmitting || user?.id === selectedUser._id}
              >
                {actionSubmitting
                  ? 'Saving...'
                  : targetStatus === 'suspended'
                  ? 'Confirm Suspension'
                  : 'Confirm Reactivation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: RESOURCE MODERATION MODAL */}
      {selectedResource && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedResource(null)}
          title={`Moderate Listing: ${selectedResource.title}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Update the moderation status of this resource. Hiding a listing removes it from public discovery while preserving historical bookings.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">
                Moderation Status
              </label>
              <select
                value={targetModStatus}
                onChange={(e) => setTargetModStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="approved">Approved (Publicly Visible)</option>
                <option value="flagged">Flagged (Under Review)</option>
                <option value="hidden">Hidden (Removed from Public Catalog)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">
                Administrative Reason / Owner Note
              </label>
              <textarea
                rows={3}
                placeholder="Reason for moderation update (will be notified to resource owner)..."
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedResource(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleModerateResourceSubmit}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? 'Saving...' : 'Apply Moderation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: ISSUE RESOLUTION MODAL */}
      {selectedIssueBooking && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedIssueBooking(null)}
          title="Update Issue Report Status & Resolution Note"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Set the investigation status for this handover issue. The reporter will be notified automatically upon update.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">
                Report Status
              </label>
              <select
                value={targetIssueStatus}
                onChange={(e) => setTargetIssueStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="open">Open (Awaiting Custodian Review)</option>
                <option value="under_review">Under Review (Inspection in Progress)</option>
                <option value="resolved">Resolved (Matter Closed / Addressed)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">
                Administrative Resolution Note
              </label>
              <textarea
                rows={3}
                placeholder="Detail resolution findings, inventory maintenance actions, or agreements..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedIssueBooking(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateIssueSubmit}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? 'Saving...' : 'Save Resolution'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: SMART RESCUE BREAKDOWN & RECOMMENDATIONS MODAL */}
      {selectedRescueResource && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRescueResource(null);
            setRescueDetailData(null);
          }}
          title={`Rescue Intelligence: ${selectedRescueResource.title}`}
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {rescueDetailLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-xs text-slate-400">Loading full deterministic telemetry breakdown...</p>
              </div>
            ) : rescueDetailData ? (
              <>
                {/* Header Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {rescueDetailData.resource.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                        {rescueDetailData.resource.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Campus: {rescueDetailData.resource.location?.campus || 'Main'} • Room: {rescueDetailData.resource.location?.room || 'General'} • Qty: {rescueDetailData.resource.quantity || 1}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400 font-mono">
                      {rescueDetailData.metrics.utilizationRate}%
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {rescueDetailData.metrics.classification.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* 4-Card Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Window</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {rescueDetailData.metrics.windowDays} Days
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {rescueDetailData.metrics.daysSinceCreation}d total history
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Booked Capacity</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {rescueDetailData.metrics.utilizedUnitHours}h
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {rescueDetailData.metrics.confirmedBookingsCount} confirmed
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Available Capacity</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {rescueDetailData.metrics.totalAvailableUnitHours}h
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ~{rescueDetailData.metrics.parsedDailyHours}h/day operating
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pending Demand</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {rescueDetailData.metrics.pendingDemandHours}h
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {rescueDetailData.metrics.pendingBookingsCount} awaiting review
                    </span>
                  </div>
                </div>

                {/* Mathematical Formula Transparency Callout */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>Deterministic Metric Formulation</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                    <div>Declared Schedule: "{rescueDetailData.metrics.operatingHours || 'Standard Institutional: 08:30 – 18:00'}"</div>
                    <div>Total Unit Capacity: {rescueDetailData.metrics.totalAvailableUnitMinutes} unit-minutes ({rescueDetailData.metrics.totalAvailableUnitHours} unit-hours)</div>
                    <div>Utilized Duration: {rescueDetailData.metrics.utilizedUnitMinutes} unit-minutes ({rescueDetailData.metrics.utilizedUnitHours} unit-hours)</div>
                    <div className="text-amber-300 pt-1 border-t border-slate-800 font-bold">
                      Utilization Rate = ({rescueDetailData.metrics.utilizedUnitMinutes} / {rescueDetailData.metrics.totalAvailableUnitMinutes}) × 100 = {rescueDetailData.metrics.utilizationRate}%
                    </div>
                  </div>
                </div>

                {/* Recommendations List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Tailored Smart Rescue Recommendations ({rescueDetailData.recommendations.length})
                    </h4>
                  </div>

                  {rescueDetailData.recommendations.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No rescue interventions required. Asset is operating at healthy capacity.</p>
                  ) : (
                    <div className="space-y-3">
                      {rescueDetailData.recommendations.map((rec) => {
                        const isUrgent = rec.priority === 'urgent';
                        const isHigh = rec.priority === 'high';
                        const isMedium = rec.priority === 'medium';

                        return (
                          <div
                            key={rec.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isUrgent
                                ? 'bg-rose-950/20 border-rose-500/30'
                                : isHigh
                                ? 'bg-amber-950/20 border-amber-500/30'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                              <span className="text-xs font-bold text-white flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isUrgent
                                      ? 'bg-rose-500'
                                      : isHigh
                                      ? 'bg-amber-500'
                                      : isMedium
                                      ? 'bg-blue-500'
                                      : 'bg-purple-500'
                                  }`}
                                />
                                {rec.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300">
                                  {rec.category}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    isUrgent
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : isHigh
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-blue-500/20 text-blue-300'
                                  }`}
                                >
                                  {rec.priority}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                              {rec.description}
                            </p>

                            <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                              <div className="text-amber-300/90 flex items-center gap-1.5">
                                <strong>Suggested Action:</strong>
                                <span>{rec.suggestedAction}</span>
                              </div>
                              <div className="text-slate-400 font-mono">
                                Impact: <span className="text-slate-200">{rec.impact}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Bookings Telemetry */}
                {rescueDetailData.recentBookingsSummary?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Recent Booking Telemetry ({rescueDetailData.recentBookingsSummary.length} Events)
                    </h4>
                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                            <th className="p-2">Dates</th>
                            <th className="p-2">Requester</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Units</th>
                            <th className="p-2">Purpose</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {rescueDetailData.recentBookingsSummary.map((b) => (
                            <tr key={b._id} className="text-slate-300">
                              <td className="p-2 whitespace-nowrap text-slate-400">
                                {formatDateOnly(b.startAt)}
                              </td>
                              <td className="p-2 text-white">
                                {b.requester?.name || 'Member'}
                              </td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  b.status === 'completed' || b.status === 'approved' || b.status === 'checked_in'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : b.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="p-2">{b.quantity}</td>
                              <td className="p-2 max-w-xs truncate text-slate-400 font-sans">
                                {b.purpose}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRescueResource(null);
                  setRescueDetailData(null);
                }}
              >
                Close Telemetry
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
