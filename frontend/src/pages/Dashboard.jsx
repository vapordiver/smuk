import { useState, useEffect, useCallback} from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api'
import StatCard from '../components/dashboard/StatCard';
import RecentActivityCard from '../components/dashboard/RecentActivityCard';
import DashboardMapPreview from '../components/dashboard/DashboardMapPreview';

//better date formatting
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Przed chwilą';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min. temu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} godz. temu`;
  if (diffInSeconds < 172800) return 'Wczoraj';
  //date diff bigger than a day
  return date.toLocaleDateString('pl-PL');
};

//status badges / icons
const getStatusMeta = (status) => {
  switch (status) {
    case 'NEW': return { icon: 'fiber_new', color: 'text-error' };
    case 'IN_PROGRESS': return { icon: 'construction', color: 'text-primary' };
    case 'NEEDS_REVIEW': return { icon: 'find_in_page', color: 'text-tertiary' };
    case 'RESOLVED': return { icon: 'task_alt', color: 'text-secondary' };
    case 'CLOSED': return { icon: 'done_all', color: 'text-on-surface-variant' };
    case 'ARCHIVED': return { icon: 'inventory_2', color: 'text-on-surface-variant' };
    default: return { icon: 'update', color: 'text-primary' };
  }
};

export default function Dashboard() {
  const {user}=useAuth();
  const [stats,setStats]=useState(null);
  const [activities, setActivities]=useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.role === 'coordinator') {
        //coord gets all the data here
        const res = await api.get('/stats/dashboard/');
        setStats(res.data);
        const mappedActivities = res.data.recent_activity.map((act) => {
          const meta = getStatusMeta(act.new_value);
          const userStr = act.user ? `${act.user.first_name} ${act.user.last_name}` : 'System';
          const actionText = act.action ==='ticket_created'
            ? `Zgłoszono przez: ${userStr}`
            : `Zmieniono przez: ${userStr}`;
          return {
            id: `${act.ticket_id}-${act.created_at}-${act.action}`,
            icon: act.action === 'ticket_created' ? 'add_circle' : meta.icon,
            iconColor: act.action === 'ticket_created' ? 'text-primary' : meta.color,
            title: act.ticket_title,
            location: actionText,
            status: act.new_value,
            time: formatTimeAgo(act.created_at),
          };
        });
        setActivities(mappedActivities);

      } else if (user) {
        const resStats = await api.get('/stats/my/');
        setStats(resStats.data);
        // normal account (NOT COORD) get this own last 5 tickets.
        const resTickets = await api.get('/tickets/my/?limit=5&ordering=-updated_at');
        const mappedTickets = resTickets.data.results.map((t) => {
          const meta = getStatusMeta(t.status);
          return {
            id: t.id,
            icon: meta.icon,
            iconColor: meta.color,
            title: t.title,
            location: t.category?.name || 'Inna kategoria',
            status: t.status,
            time: formatTimeAgo(t.updated_at),
          };
        });
        setActivities(mappedTickets);
      }
    } catch (error) {
      console.error('An error occurred while trying to load dashboard data:', error);
      setError('Nie można było załadować danych, sprawdź połącznie z internetem i spróbuj ponownie.')
      //setError('Coldn\'t load data, check Your internet connection, and try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user, fetchDashboardData]);

  const isCoordinator = user?.role === 'coordinator';

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 scrollbar-thin">
      <header className="mb-10">
        <h1 className="text-[36px] font-bold tracking-tight text-on-background mb-2">
          Witaj, {user?.first_name || 'Użytkowniku'}!
        </h1>
        <p className="text-on-surface-variant">
          Oto przegląd {isCoordinator ? 'zgłoszeń na kampusie' : 'Twoich zgłoszeń'}.
        </p>
      </header>

      {error ? (
        <div className="bg-error-container/20 border border-error text-error p-8 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-4xl">error</span>
          <h2 className="text-xl font-bold">Wystąpił błąd</h2>
          <p>{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 bg-error text-on-error px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* top-left stat card (open/total) */}
          <div className="lg:col-span-3">
            <StatCard
              loading={loading}
              icon={isCoordinator ? "assignment" : "pending_actions"}
              iconColor="text-primary"
              badge={isCoordinator ? "Otwarte" : "Zgłoszone"}
              badgeColor="bg-primary/10 text-primary"
              value={user ? (stats?.open_count ?? 0) : 0}
              unit="Zgłoszeń"
              description={isCoordinator ? "Wymaga weryfikacji i naprawy" : "Wszystkie Twoje zgłoszenia"}
            />
          </div>

          {/* mid stat card (completed) */}
          <div className="lg:col-span-3">
            <StatCard
              loading={loading}
              icon={isCoordinator ? "task_alt" : "check_circle"}
              iconColor="text-secondary"
              badge="Rozwiązane"
              badgeColor="bg-secondary/10 text-secondary"
              value={user ? (stats?.resolved_count ?? 0) : 0}
              unit="Zadań"
              description="Zgłoszenia zakończone sukcesem"
            />
          </div>

          {/* report href */}
          <div className="lg:col-span-6">
            <Link to="/report" className="block h-full">
              <div className="bg-primary rounded-xl p-8 shadow-lg shadow-primary/20 flex flex-col justify-center text-on-primary relative overflow-hidden group hover:scale-[0.98] transition-transform cursor-pointer h-full min-h-[160px]">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="material-symbols-outlined text-5xl">emergency_home</span>
                    <h2 className="text-2xl font-bold">Zgłoś usterkę</h2>
                  </div>
                  <p className="text-primary-fixed-dim max-w-xs">
                    Zauważyłeś problem? Prześlij szybkie zgłoszenie, a nasz zespół zajmie się nim natychmiast.
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
              </div>
            </Link>
          </div>
          {/* recent activity */}
          <div className="lg:col-span-8 flex flex-col">
            <RecentActivityCard items={activities} loading={loading} />
          </div>
          {/* campus map */}
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
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Otwórz mapę
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}