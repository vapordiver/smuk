import { Link } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard';
import RecentActivityCard from '../components/dashboard/RecentActivityCard';
import DashboardMapPreview from '../components/dashboard/DashboardMapPreview';

/**
 * Dashboard – Main landing page matching screen.png / code.html
 * Bento Grid layout with StatCards, ImpactCTA, RecentActivity, CampusMap preview
 */

/* ── Mock data ── */
const RECENT_ACTIVITIES = [
  {
    id: 1,
    icon: 'lightbulb',
    iconColor: 'text-primary',
    title: 'Uszkodzony panel LED',
    location: 'Budynek A, Sala 402',
    status: 'in-progress',
    time: '2 godz. temu',
  },
  {
    id: 2,
    icon: 'water_drop',
    iconColor: 'text-secondary',
    title: 'Wykryto wyciek wody',
    location: 'Aula Główna',
    status: 'resolved',
    time: '5 godz. temu',
  },
  {
    id: 3,
    icon: 'ac_unit',
    iconColor: 'text-tertiary',
    title: 'Konserwacja HVAC',
    location: 'Biblioteka Główna – Piętro 2',
    status: 'new',
    time: 'Wczoraj',
  },
];

export default function Dashboard() {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 scrollbar-thin">
      <header className="mb-10">
        <h1 className="text-[36px] font-bold tracking-tight text-on-background mb-2">
          Witaj, Użytkowniku!
        </h1>
        <p className="text-on-surface-variant">
          Oto przegląd usterek na Twoim kampusie na dziś.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stat: W trakcie */}
        <div className="lg:col-span-3">
          <StatCard
            icon="pending_actions"
            iconColor="text-primary"
            badge="Aktywne"
            badgeColor="bg-primary/10 text-primary"
            value={12}
            unit="Zgłoszeń"
            description="W trakcie realizacji"
          />
        </div>

        {/* Stat: Rozwiązane */}
        <div className="lg:col-span-3">
          <StatCard
            icon="check_circle"
            iconColor="text-secondary"
            badge="Gotowe"
            badgeColor="bg-secondary/10 text-secondary"
            value={48}
            unit="Zadań"
            description="Rozwiązane w tym miesiącu"
          />
        </div>

        {/* CTA Impact Card – "Zgłoś usterkę" */}
        <div className="lg:col-span-6">
          <Link to="/report" className="block">
            <div className="bg-primary rounded-xl p-8 shadow-lg shadow-primary/20 flex flex-col justify-center text-on-primary relative overflow-hidden group hover:scale-[0.98] transition-transform cursor-pointer h-full">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <span className="material-symbols-outlined text-5xl">
                    emergency_home
                  </span>
                  <h2 className="text-2xl font-bold">Zgłoś usterkę</h2>
                </div>
                <p className="text-primary-fixed-dim max-w-xs">
                  Zauważyłeś problem? Prześlij szybkie zgłoszenie, a nasz zespół
                  konserwacji zajmie się nim natychmiast.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-8">
          <RecentActivityCard items={RECENT_ACTIVITIES} />
        </div>

        {/* Campus Map Preview*/}
        <div className="lg:col-span-4 relative h-full min-h-[400px]">
          <div className="absolute inset-0 z-10 rounded-xl overflow-hidden shadow-soft bg-surface border border-outline transition-all duration-300 ease-out origin-center hover:z-30 hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 flex flex-col">
            <div className="p-6 bg-surface">
              <h3 className="text-lg font-bold mb-1">Mapa kampusu</h3>
              <p className="text-xs text-on-surface-variant">
                Zagęszczenie aktywnych zgłoszeń
              </p>
            </div>
            <div className="flex-1 relative bg-surface-container-low overflow-hidden">
              <DashboardMapPreview />
              <Link
                to="/map"
                className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md border border-outline hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold text-primary z-30"
              >
                <span className="material-symbols-outlined text-base">
                  open_in_new
                </span>
                Otwórz mapę
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
