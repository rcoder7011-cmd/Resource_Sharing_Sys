import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
} from '../services/notificationService';
import { getUnreadCount as getChatUnreadCount } from '../services/chatService';

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:5000');

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { token } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Fetch initial notifications and unread count via REST
  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setUnreadChatCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const [listRes, countRes, chatCountRes] = await Promise.all([
        getNotifications({ page: 1, limit: 25 }, token),
        getUnreadCount(token),
        getChatUnreadCount(token).catch(() => ({ count: 0 })),
      ]);

      if (listRes?.data) {
        setNotifications(listRes.data);
      }
      if (typeof countRes?.count === 'number') {
        setUnreadCount(countRes.count);
      }
      if (typeof chatCountRes?.count === 'number') {
        setUnreadChatCount(chatCountRes.count);
      }
    } catch {
      // Non-blocking: fail gracefully if offline
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Real-time Socket.IO Connection Lifecycle
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Connect socket with authenticated JWT
    const socket = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Synchronize latest notifications upon connect / reconnect
      refreshNotifications();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Real-Time Event: New Notification Arrived
    socket.on('notification:new', (newNotification) => {
      if (!newNotification) return;

      setNotifications((prev) => {
        // Prevent duplicate addition
        const exists = prev.some(
          (n) => (n._id || n.id) === (newNotification._id || newNotification.id)
        );
        if (exists) return prev;
        return [newNotification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);
    });

    // Real-Time Event: Chat Unread Count Updated
    socket.on('chat:unread_update', (data) => {
      if (typeof data?.count === 'number') {
        setUnreadChatCount(data.count);
      }
    });

    // Initial fetch
    refreshNotifications();

    // Cleanup socket listeners and disconnect on unmount or token change
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.off('chat:unread_update');
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, refreshNotifications]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    if (!token || !id) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) =>
        (n._id || n.id) === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiMarkAsRead(id, token);
    } catch {
      // Revert if API fails
      refreshNotifications();
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!token) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await apiMarkAllAsRead(token);
    } catch {
      refreshNotifications();
    }
  };

  const value = {
    notifications,
    unreadCount,
    unreadChatCount,
    setUnreadChatCount,
    isLoading,
    isConnected,
    socket: socketRef.current,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
