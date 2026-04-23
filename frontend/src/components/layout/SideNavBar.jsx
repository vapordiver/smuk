import { Link, useLocation } from 'react-router-dom';
import ImpactButton from '../common/ImpactButton';

/**
 * SideNavBar – Click-toggle sidebar overlay
 * Both desktop and mobile: hidden by default, opens as overlay when toggled via hamburger.
 *
 * Role mock: will be replaced by AuthContext in SMUK-7.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */

// MOCK — zmień na AuthContext w SMUK-7
const userRole = 'REPORTER'; // 'COORDINATOR' | 'REPORTER'

const NAV_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/report', icon: 'report_problem', label: 'Zgłoś usterkę' },
  { to: '/my-tickets', icon: 'format_list_bulleted', label: 'Moje zgłoszenia' },
  { to: '/map', icon: 'map', label: 'Mapa kampusu' },
];

function NavLink({ to, icon, label, isActive, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={label}
      className={`
        sidebar-link
        flex items-center gap-3 rounded-xl
        font-semibold transition-all duration-200
        hover:scale-[0.98] whitespace-nowrap overflow-hidden
        px-4 py-3
        ${isActive
          ? 'bg-primary/10 text-primary'
          : 'text-on-surface-variant hover:bg-surface-container'
        }
      `}
    >
      <span className="material-symbols-outlined shrink-0">{icon}</span>
      <span className="sidebar-label">{label}</span>
    </Link>
  );
}

export default function SideNavBar({ isOpen, onClose }) {
  const location = useLocation();

  const roleLink = userRole === 'COORDINATOR'
    ? { to: '/admin', icon: 'admin_panel_settings', label: 'Panel Koordynatora' }
    : null;

  return (
    <>
      {/* Overlay backdrop — all screen sizes */}
      {isOpen && (
        <div
          className="fixed top-16 inset-x-0 bottom-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          sidebar-aside
          fixed left-0 top-16 h-[calc(100dvh-4rem)] z-40
          w-64
          flex flex-col py-4 px-2 gap-1
          bg-surface-container-low
          border-r border-outline
          overflow-hidden
          transition-transform duration-300 ease-in-out

          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Department header — only visible when expanded */}
        <div className="sidebar-header mb-4 px-2 whitespace-nowrap overflow-hidden">
          <h2 className="text-lg font-bold text-primary">Dział Usterek</h2>
          <p className="text-xs text-on-surface-variant">Kampus Główny</p>
        </div>

        {/* Navigation links */}
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
            onClick={onClose}
          />
        ))}

        {/* Bottom section */}
        <div className="mt-auto flex flex-col gap-2 pb-8 sm:pb-4">
          {/* Role-based link */}
          {roleLink && (
            <NavLink
              to={roleLink.to}
              icon={roleLink.icon}
              label={roleLink.label}
              isActive={location.pathname === roleLink.to}
              onClick={onClose}
            />
          )}

          {/* New report CTA */}
          <Link to="/report" onClick={onClose} title="Nowe zgłoszenie">
            <div className="sidebar-cta-full">
              <ImpactButton fullWidth icon="add_circle">
                Nowe zgłoszenie
              </ImpactButton>
            </div>
            <div className="sidebar-cta-icon flex items-center justify-center p-3 rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[0.98] active:scale-[0.96] transition-all duration-200 cursor-pointer">
              <span className="material-symbols-outlined">add_circle</span>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
