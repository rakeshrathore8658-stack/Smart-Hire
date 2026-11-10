import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { NotificationSocket } from '../utils/notificationSocket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const userEmail = user?.email ? user.email.trim().toLowerCase() : '';

  // Fetch notifications from backend database
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', {
        params: userEmail ? { email: userEmail } : {},
      });
      if (res.data) {
        const list = res.data.notifications || [];
        setNotifications(list);
        setUnreadCount(res.data.unreadCount ?? list.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to load notifications from database:', err);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    // Setup or update centralized real-time WebSocket connection
    if (!socketRef.current) {
      const socket = new NotificationSocket(userEmail, (newNotif) => {
        if (!newNotif || !newNotif.id) return;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      });
      socket.connect();
      socketRef.current = socket;
    } else {
      socketRef.current.updateUserEmail(userEmail);
    }

    if (userEmail) {
      setLoading(true);
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }

    return () => {
      // socket persists across renders while context is alive
    };
  }, [userEmail, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    if (!id) return;

    // Immediate optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.post(`/notifications/${id}/read`);
    } catch (err) {
      console.warn('Failed to mark notification as read on backend:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Immediate optimistic update - clear badge completely
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await api.post('/notifications/mark-all-read', null, {
        params: userEmail ? { email: userEmail } : {},
      });
    } catch (err) {
      console.warn('Failed to mark all notifications as read on backend:', err);
    }
  }, [userEmail]);

  // Delete notification
  const deleteNotification = useCallback(async (id) => {
    if (!id) return;

    let wasUnread = false;
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.isRead) wasUnread = true;
      return prev.filter((n) => n.id !== id);
    });

    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.warn('Failed to delete notification on backend:', err);
    }
  }, []);

  // Fetch full notification details (and auto mark as read)
  const getNotificationDetails = useCallback(async (id) => {
    if (!id) return null;
    try {
      const res = await api.get(`/notifications/${id}`, {
        params: userEmail ? { email: userEmail } : {},
      });
      if (res.data) {
        // Ensure local read state matches
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => {
          const target = notifications.find((n) => n.id === id);
          if (target && !target.isRead) return Math.max(0, prev - 1);
          return prev;
        });
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to fetch notification details:', err);
    }
    // Fallback to local memory if API fails
    return notifications.find((n) => n.id === id) || null;
  }, [userEmail, notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationDetails,
    refreshNotifications: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
