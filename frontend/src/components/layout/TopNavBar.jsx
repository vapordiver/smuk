import { Link } from 'react-router-dom';

export default function TopNavBar({ onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 h-16 bg-white/80 backdrop-blur-md shadow-soft border-b border-outline">
      <div className="flex items-center gap-4">
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          /* Usunięto p-2, dodano w-10 h-10 (Twardy Kwadrat) */
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer shrink-0"
          aria-label="Toggle menu"
        >
          {/* Wymuszono sztywne 24px */}
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

      {/* --- PRAWA STRONA (Dzwonek + Profil) --- */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer shrink-0"
          aria-label="Powiadomienia"
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </button>

        {/* User avatar */}
        <Link
          to="/profile"
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer shrink-0"
          aria-label="Profil"
        >
          <span className="material-symbols-outlined text-[24px]">account_circle</span>
        </Link>
      </div>
    </header>
  );
}