import { Link } from 'react-router-dom';

/**
 * TopNavBar – Minimal global action bar
 * Contains: Logo, Notifications, Profile icon.
 * SearchBar moved to CampusMap page.
 *
 * @param {{ onToggleSidebar: () => void }} props
 */
export default function TopNavBar({ onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 h-16 bg-white/80 backdrop-blur-md shadow-soft border-b border-outline">
      <div className="flex items-center gap-4">
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Brand */}
        <Link
          to="/"
          className="font-bold tracking-tight text-primary leading-none flex items-center"
          style={{ fontSize: 'clamp(1.1rem, 4vw, 1.25rem)' }}
        >
          SMUK
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Powiadomienia"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* User avatar */}
        <Link
          to="/profile"
          className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Profil"
        >
          <span className="material-symbols-outlined">account_circle</span>
        </Link>
      </div>
    </header>
  );
}
