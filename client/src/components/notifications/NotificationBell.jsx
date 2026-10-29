import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CheckSquare,
  CornerDownLeft,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

/**
 * Format relative timestamps
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Get notification icon and color by type
 */
function getNotificationIcon(type) {
  switch (type) {
    case 'booking_created':
      return { icon: Inbox, color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
    case 'booking_approved':
      return { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' };
    case 'booking_rejected':
      return { icon: X, color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' };
    case 'booking_cancelled':
      return { icon: X, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    case 'booking_checked_in':
      return { icon: CheckSquare, color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' };
    case 'booking_returned':
      return { icon: CornerDownLeft, color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' };
    case 'booking_issue_reported':
      return { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
    case 'booking_deadline_reminder':
      return { icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' };
    default:
      return { icon: Bell, color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' };
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (notification) => {
    const id = notification._id || notification.id;
    if (!notification.isRead) {
      markAsRead(id);
    }
    setIsOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const displayedNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl border transition-colors ${
          isOpen
            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
            : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
        }`}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />

        {/* Live Socket Connection Dot */}
        {isConnected && (
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400"
            title="Real-Time Alerts Connected"
          />
        )}

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-950 shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-slate-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3.5 py-2 border-b border-slate-800/60 bg-slate-900/30 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Unread ({unreadCount})
            </button>

            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              <span>{isConnected ? 'Live' : 'Syncing'}</span>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                  {filter === 'unread'
                    ? "You've read all your activity updates."
                    : 'Real-time updates regarding bookings and equipment handovers will appear here.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const id = notif._id || notif.id;
                const { icon: IconComponent, color } = getNotificationIcon(notif.type);
                const isUnread = !notif.isRead;

                return (
                  <div
                    key={id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-900/80 ${
                      isUnread ? 'bg-blue-950/20' : 'bg-transparent'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            isUnread ? 'font-bold text-white' : 'font-medium text-slate-300'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.link && (
                        <p className="text-[10px] text-blue-400 flex items-center gap-1 pt-0.5">
                          <span>View in Dashboard</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </p>
                      )}
                    </div>

                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span
                        className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
