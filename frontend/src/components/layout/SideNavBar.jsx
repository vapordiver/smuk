import { Link, useLocation } from 'react-router-dom';
import ImpactButton from '../common/ImpactButton';

/**
 * SideNavBar – Vertical sidebar navigation
 * Separated from content via bg contrast (surface-container-low), not borders (No-Line Rule).
 * Active link uses soft primary bg with rounded-xl.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
const NAV_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/report', icon: 'report_problem', label: 'Zgłoś usterkę' },
  { to: '/my-tickets', icon: 'format_list_bulleted', label: 'Moje zgłoszenia' },
  { to: '/map', icon: 'map', label: 'Mapa kampusu' },
  { to: '/admin', icon: 'settings', label: 'Ustawienia' },
];

export default function SideNavBar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] z-40
          flex flex-col p-4 gap-2 w-64
          bg-surface-container-low
          border-r border-outline
          transition-transform duration-300
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Department header */}
        <div className="mb-6 px-4">
          <h2 className="text-lg font-bold text-primary">Dział Usterek</h2>
          <p className="text-xs text-on-surface-variant">Kampus Główny</p>
        </div>

        {/* Navigation links */}
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl
                font-semibold transition-all duration-200
                hover:scale-[0.98]
                ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }
              `}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Bottom CTA */}
        <div className="mt-auto pb-6">
          <Link to="/report" onClick={onClose}>
            <ImpactButton fullWidth icon="add_circle">
              Nowe zgłoszenie
            </ImpactButton>
          </Link>
        </div>
      </aside>
    </>
  );
}
