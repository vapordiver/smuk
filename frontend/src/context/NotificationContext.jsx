import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as notifApi from '../services/notifications';

const NotificationContext = createContext();

/** Badge refresh interval (in milliseconds)*/
const POLL_INTERVAL = 30_000;

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();

    // ---- State ----
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const pollRef = useRef(null);

    // ---- Fetch only unread count ----
    const refreshUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await notifApi.fetchUnreadCount();
            setUnreadCount(data.unreadCount);
            setTotalCount(data.totalCount);
        } catch {
            // Errors ignored - badge won't be updated
        }
    }, [isAuthenticated]);

    // ---- Fetch list for dropdown ----
    const fetchList = useCallback(async (limit = 20, offset = 0) => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const data = await notifApi.fetchNotifications(limit, offset);
            setNotifications(data.results);
            setUnreadCount(data.unread_count);
            setTotalCount(data.count);
        } catch {
            // Keep old list
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // ---- Mark single notification as read ----
    const markAsRead = useCallback(async (id) => {
        try {
            await notifApi.markNotificationRead(id);
            // Optimistic update of local state - without another fetch
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // In case of an error - full refresh
            refreshUnreadCount();
        }
    }, [refreshUnreadCount]);

    // ---- Mark all as read ----
    const markAllAsRead = useCallback(async () => {
        try {
            await notifApi.markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            refreshUnreadCount();
        }
    }, [refreshUnreadCount]);

    // ---- Open/close dropdown ----
    const openDropdown = useCallback(() => {
        setIsOpen(true);
        fetchList();
    }, [fetchList]);

    const closeDropdown = useCallback(() => {
        setIsOpen(false);
    }, []);

    // ---- Polling: refresh badge every 30s when logged in ----
    useEffect(() => {
        if (isAuthenticated) {
            refreshUnreadCount();
            pollRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL);
        } else {
            // Logout - clear state
            setNotifications([]);
            setUnreadCount(0);
            setTotalCount(0);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isAuthenticated, refreshUnreadCount]);

    const value = {
        notifications,
        unreadCount,
        totalCount,
        isOpen,
        loading,
        fetchList,
        refreshUnreadCount,
        markAsRead,
        markAllAsRead,
        openDropdown,
        closeDropdown,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

/** Hook for notification context access */
export const useNotifications = () => useContext(NotificationContext);
