import { Link, useLocation } from 'react-router-dom';

/**
 * TopNavBar – Glassmorphic top navigation bar
 * white/80 + backdrop-blur-md per DESIGN.md "Glass & Gradient Rule"
 *
 * @param {{ onToggleSidebar: () => void }} props
 */
export default function TopNavBar({ onToggleSidebar }) {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/my-tickets', label: 'Moje zgłoszenia' },
    { to: '/map', label: 'Mapa kampusu' },
  ];

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 h-16 bg-white/80 backdrop-blur-md shadow-soft border-b border-outline">
      <div className="flex items-center gap-8">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Brand */}
        <Link to="/" className="text-xl font-bold tracking-tight text-primary">
          SMUK
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex gap-6">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`font-medium transition-colors ${
                  isActive
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Search (desktop only) */}
        <div className="relative hidden lg:block">
          <input
            className="bg-surface-container-low border-none rounded-full px-4 py-1.5 text-sm w-64 focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant"
            placeholder="Szukaj usterek..."
            type="text"
          />
          <span className="material-symbols-outlined absolute right-3 top-1.5 text-on-surface-variant text-lg">
            search
          </span>
        </div>

        {/* Notifications */}
        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* User avatar */}
        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
