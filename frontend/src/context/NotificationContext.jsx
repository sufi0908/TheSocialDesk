import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { playNotificationSound } from '../utils/NotificationSound';
import { NotificationToastContainer } from '../components/notifications/NotificationToast';
import { useAuth } from '../hooks/useAuth';

const NotificationContext = createContext(null);

const SETTINGS_KEY_SOUND = 'socialdesk_notif_sound_enabled';
const SETTINGS_KEY_POPUPS = 'socialdesk_notif_popups_enabled';

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // User Notification Preferences
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY_SOUND);
    return saved !== null ? saved === 'true' : true;
  });

  const [popupsEnabled, setPopupsEnabled] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY_POPUPS);
    return saved !== null ? saved === 'true' : true;
  });

  // Track processed notification IDs across socket events, polling, and re-renders
  const processedIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  const toggleSound = (enabled) => {
    setSoundEnabled(enabled);
    localStorage.setItem(SETTINGS_KEY_SOUND, String(enabled));
  };

  const togglePopups = (enabled) => {
    setPopupsEnabled(enabled);
    localStorage.setItem(SETTINGS_KEY_POPUPS, String(enabled));
  };

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // Central handler for genuinely NEW incoming notifications
  const handleIncomingNotification = useCallback(
    (notif, isInitialBatch = false) => {
      if (!notif || !notif.id) return;

      // Duplicate protection check
      if (processedIdsRef.current.has(notif.id)) {
        return;
      }
      processedIdsRef.current.add(notif.id);

      // Do NOT trigger sound or toast for existing notifications loaded during initial mount
      if (isInitialBatch) {
        return;
      }

      // 1. Play Sound ONCE if enabled
      if (soundEnabled) {
        playNotificationSound();
      }

      // 2. Add to Popup Toast Queue if enabled
      if (popupsEnabled) {
        setToasts((prev) => [notif, ...prev.slice(0, 4)]);

        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          dismissToast(notif.id);
        }, 6000);
      }

      // 3. Update Notification Center & Unread Badge
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnreadCount((prev) => prev + 1);
    },
    [soundEnabled, popupsEnabled, dismissToast]
  );

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [list, count] = await Promise.all([
        notificationService.getNotifications().catch(() => []),
        notificationService.getUnreadCount().catch(() => 0),
      ]);

      // If initial load, register all existing IDs so they never trigger popups on refresh
      if (!initialLoadDoneRef.current) {
        list.forEach((n) => processedIdsRef.current.add(n.id));
        initialLoadDoneRef.current = true;
      } else {
        // Detect new notifications delivered while disconnected or via polling
        list.forEach((n) => {
          if (!processedIdsRef.current.has(n.id) && !n.isRead) {
            handleIncomingNotification(n, false);
          }
        });
      }

      setNotifications(list);
      setUnreadCount(count);
    } catch (e) {
      console.warn('Failed loading notifications:', e.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, handleIncomingNotification]);

  // Initial Load & Socket.IO Listener Setup
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();

      // Connect real-time socket
      const socket = notificationService.connectSocket((newNotif) => {
        handleIncomingNotification(newNotif, false);
      });

      // Background polling fallback every 15 seconds
      const pollInterval = setInterval(() => {
        loadNotifications();
      }, 15000);

      return () => {
        clearInterval(pollInterval);
        notificationService.disconnectSocket();
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
      processedIdsRef.current.clear();
      initialLoadDoneRef.current = false;
    }
  }, [isAuthenticated, loadNotifications, handleIncomingNotification]);

  const markAsRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        soundEnabled,
        popupsEnabled,
        toggleSound,
        togglePopups,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        toasts,
        dismissToast,
      }}
    >
      {children}
      {/* Floating Popup Toast Container */}
      <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} />
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
