import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationDropdown from '../notifications/NotificationDropdown';

export default function TopNavBar({ onToggleSidebar }) {
    const { isAuthenticated, logout } = useAuth();
    const { unreadCount, openDropdown, closeDropdown, isOpen } = useNotifications();
    const bellRef = useRef(null);

    // Handle click outside of dropdown - close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target)) {
                closeDropdown();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, closeDropdown]);

    return (
        <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 h-16 bg-white/80 backdrop-blur-md shadow-soft border-b border-outline">
            <div className="flex items-center gap-4">
                {/* Sidebar toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer shrink-0"
                    aria-label="Toggle menu"
                >
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>

                {/* Brand */}
                <Link
                    to="/"
                    className="font-bold tracking-tight text-primary flex items-center"
                    style={{ fontSize: 'clamp(1.1rem, 4vw, 1.25rem)' }}
                >
                    SMUK
                </Link>
            </div>
            {/* --- Right side (Bell + Logout + Profile) --- */}         
            <div className="flex items-center gap-2">
                {/* Notification bell - visible only for logged in */}
                {isAuthenticated && (
                    <div ref={bellRef} className="relative">
                        <button
                            onClick={isOpen ? closeDropdown : openDropdown}
                            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer shrink-0 relative"
                            aria-label="Powiadomienia"
                        >
                            <span className="material-symbols-outlined text-[24px]">
                                {unreadCount > 0 ? 'notifications_active' : 'notifications'}
                            </span>
                            {/* Badge with unread count */}
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-error text-on-error text-[10px] font-bold leading-none px-1">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown with notifications list */}
                        {isOpen && <NotificationDropdown />}
                    </div>
                )}

                {isAuthenticated && (
                    <button
                        onClick={logout}
                        className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer shrink-0"
                        aria-label="Wyloguj"
                        title="Wyloguj się"
                    >
                        <span className="material-symbols-outlined text-[24px]">logout</span>
                    </button>
                )}
            </div>
        </header>
    );
}
