import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { formatDate } from '../../utils/formatters';

/** Map status from API to polish labels */
const STATUS_LABELS = {
    NEW: 'Nowe',
    IN_PROGRESS: 'W trakcie',
    NEEDS_REVIEW: 'Do weryfikacji',
    RESOLVED: 'Rozwiązane',
    CLOSED: 'Zamknięte',
    ARCHIVED: 'Zarchiwizowane',
};

/** Generate readable notification content based on `message` field. */
const formatNotificationMessage = (message) => {
    const label = STATUS_LABELS[message] || message;
    return `Status zgłoszenia zmieniony na: ${label}`;
};

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        totalCount,
        loading,
        markAsRead,
        markAllAsRead,
        closeDropdown,
    } = useNotifications();

    /** Click on a single notification:
     *  1. Mark as read
     *  2. Close dropdown
     *  3. Navigate to /my-tickets
     */
    const handleClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        closeDropdown();
        navigate(`/my-tickets?ticket=${notification.ticket.id}`);

    };

    /** Mark all as read */
    const handleMarkAllRead = async (e) => {
        e.stopPropagation();
        await markAllAsRead();
    };

    return (
        <div
            className="notification-dropdown-enter 
                       fixed sm:absolute 
                       top-16 sm:top-full 
                       left-4 right-4 sm:left-auto sm:right-0 
                       mt-2 
                       w-auto sm:w-96 
                       max-h-[80vh] sm:max-h-[70vh]
                       bg-surface rounded-xl shadow-lg border border-outline
                       flex flex-col overflow-hidden z-50"
            onClick={(e) => e.stopPropagation()}
        >
            {/* ---- Header ---- */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline">
                <h3 className="font-semibold text-on-surface text-sm">
                    Powiadomienia
                </h3>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-primary hover:text-primary-container
                                   cursor-pointer transition-colors"
                    >
                        Oznacz wszystkie
                    </button>
                )}
            </div>

            {/* ---- Notifications list ---- */}
            <div className="overflow-y-auto flex-1 scrollbar-thin">
                {loading && notifications.length === 0 ? (
                    /* Load state */
                    <div className="py-8 text-center text-on-surface-variant text-sm">
                        Ładowanie...
                    </div>
                ) : notifications.length === 0 ? (
                    /* Empty state */
                    <div className="py-8 text-center text-on-surface-variant text-sm">
                        Brak powiadomień
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <button
                            key={notification.id}
                            onClick={() => handleClick(notification)}
                            className={`
                                w-full text-left px-4 py-3 flex items-start gap-3
                                hover:bg-surface-container transition-colors cursor-pointer
                                border-b border-outline last:border-b-0
                                ${!notification.is_read ? 'bg-primary-fixed/40' : 'bg-transparent'}
                            `}
                        >
                            {/* Blue dot for unread */}
                            {!notification.is_read && (
                                <span
                                    className="mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full bg-primary"
                                />
                            )}

                            <div className={`flex-1 min-w-0 ${notification.is_read ? 'pl-5' : ''}`}>
                                {/* Ticket title */}
                                <p className={`text-sm leading-snug ${!notification.is_read ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                                    {notification.ticket?.title || `Zgłoszenie #${notification.ticket?.id}`}
                                </p>
                                {/* Notification content */}
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                    {formatNotificationMessage(notification.message)}
                                </p>
                                {/* Date */}
                                <p className="text-[11px] text-on-surface-variant/70 mt-1">
                                    {formatDate(notification.created_at)}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* ---- Footer: info about length ---- */}
            {totalCount > notifications.length && (
                <div className="px-4 py-2 text-center text-xs text-on-surface-variant border-t border-outline">
                    Wyświetlono {notifications.length} z {totalCount} powiadomień
                </div>
            )}
        </div>
    );
}
