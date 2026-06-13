import api from './api';

/**
 * Fetch notifications with paginations.
 * Response { count, unread_count, results: Notification[] }
 */
export const fetchNotifications = async (limit = 20, offset = 0) => {
    const response = await api.get('/notifications/', {
        params: { limit, offset },
    });
    return response.data;
};

/**
 * Fetch only unread notifications.
 * Makes light query (limit=1) to get unread_count from pagination.
 */
export const fetchUnreadCount = async () => {
    const response = await api.get('/notifications/', {
        params: { limit: 1, offset: 0 },
    });
    return {
        unreadCount: response.data.unread_count,
        totalCount: response.data.count,
    };
};

/**
 * Marks single notification as read.
 * PATCH /api/notifications/<id>/read/  with body { is_read: true }
 */
export const markNotificationRead = async (id) => {
    const response = await api.patch(`/notifications/${id}/read/`, {
        is_read: true,
    });
    return response.data;
};

/**
 * Marks all notifications as read.
 * PATCH /api/notifications/read-all/
 */
export const markAllNotificationsRead = async () => {
    const response = await api.patch('/notifications/read-all/');
    return response.data;
};
