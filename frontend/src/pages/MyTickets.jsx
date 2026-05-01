import {useState, useEffect, useMemo} from 'react';
import {MapContainer, TileLayer, Marker} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';

// leaflet icon fix
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

const mapStatusToBadge = (apiStatus) => {
    const statusMap = {
        'NEW': 'new',
        'IN_PROGRESS': 'in-progress',
        'NEEDS_REVIEW': 'in-progress',
        'RESOLVED': 'resolved',
        'CLOSED': 'resolved',
        'ARCHIVED': 'rejected',
    };
    return statusMap[apiStatus] || 'new';
};

const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

//ticket card display
const TicketCard = ({ticket, onClick}) => {
    const statusType = mapStatusToBadge(ticket.status);

    return (
        <div
            className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg transition-all flex flex-col md:flex-row h-full cursor-pointer"
            onClick={() => onClick(ticket)}>
            {/* image section */}
            <div className="md:w-1/3 relative h-48 md:h-auto overflow-hidden bg-slate-100">
                {ticket.image ? (
                    <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        src={ticket.image}
                        alt={ticket.title}
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Brak
                        zdjęcia</div>
                )}
                <div className="absolute top-4 left-4">
                    <StatusBadge status={statusType}/>
                </div>
            </div>
            {/* ticket main body section */}
            <div className="md:w-2/3 p-6 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span
                            className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">ID: #REP-{ticket.id}</span>
                        <span className="text-xs text-slate-500 font-medium">{formatDate(ticket.created_at)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">{ticket.title}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                        <span className="material-symbols-outlined text-lg">location_on</span>
                        <span>
                            {ticket.building?.name || "Teren kampusu"}
                            {ticket.floor ? ` Piętro: ${ticket.floor}` : ''}
                            {ticket.room ? ` Sala: ${ticket.room}` : ''}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full ${statusType === 'resolved' ? 'bg-secondary' : 'bg-primary animate-pulse'}`}></span>
                        <span
                            className="text-xs font-semibold text-slate-600 capitalize">{ticket.status.toLowerCase().replace('_', ' ')}</span>
                    </div>
                    <button
                        className="text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Zobacz szczegóły <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const TicketModal = ({ticket, onClose}) => {
    if (!ticket) return null;
    // Leaflet expects [lat, lng] - coordinates from DB are [lng, lat]
    const position = ticket.location?.coordinates
        ? [ticket.location.coordinates[1], ticket.location.coordinates[0]]
        : [51.7535, 19.4520];
    const hasAuditLog = ticket.audit_log && ticket.audit_log.length > 0;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose}/>
            <div
                className="relative bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{ticket.title}</h2>
                        <p className="text-sm text-slate-500 mt-1">#REP-{ticket.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-xl"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Status and Priority */}
                    <div className="flex flex-wrap gap-3">
                        <StatusBadge status={mapStatusToBadge(ticket.status)}/>
                        {ticket.priority && (
                            <div
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                    ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : ticket.priority === 'MEDIUM'
                                            ? 'bg-orange-100 text-orange-700 border-orange-200'
                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}>
                                Priorytet: {ticket.priority}
                            </div>
                        )}
                    </div>
                    {/* Description */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined">description</span>
                            Opis problemu
                        </h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {ticket.description || "Brak opisu."}
                        </p>
                    </div>

                    {/* Image */}
                    {ticket.image && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined">photo_camera</span>
                                Zdjęcie usterki
                            </h4>
                            <img
                                src={ticket.image}
                                alt={ticket.title}
                                className="w-full rounded-2xl border border-slate-200"
                            />
                        </div>
                    )}
                    {/* Location */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined">location_on</span>
                            Lokalizacja
                        </h4>
                        <div className="text-slate-600 space-y-1">
                            <p><strong>Budynek:</strong> {ticket.building?.name || "Okolice kampusu"}</p>
                            {ticket.floor && <p><strong>Piętro:</strong> {ticket.floor}</p>}
                            {ticket.room && <p><strong>Pokój:</strong> {ticket.room}</p>}
                        </div>
                    </div>
                    {/* Map */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined">map</span>
                            Lokalizacja na mapie
                        </h4>
                        <div className="h-80 rounded-2xl overflow-hidden border border-slate-200">
                            <MapContainer
                                center={position}
                                zoom={17}
                                className="h-full w-full"
                                scrollWheelZoom={false}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                                <Marker position={position}/>
                            </MapContainer>
                        </div>
                    </div>
                    {hasAuditLog && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined">history</span>
                                Historia zmian
                            </h4>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                {ticket.audit_log.map((entry, idx) => (
                                    <div key={entry.id || idx}
                                         className="flex gap-4 text-sm border-l-2 border-slate-200 pl-4">
                                        <div className="text-slate-400 whitespace-nowrap">
                                            {formatDate(entry.created_at)}
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-700">
                                                {entry.user?.first_name} {entry.user?.last_name}
                                            </span>
                                            <span className="text-slate-500"> zmienił(a) </span>
                                            <span className="font-medium">"{entry.field_changed}"</span>
                                            <div className="text-slate-500 mt-0.5">
                                                z <span className="line-through">{entry.old_value}</span> na{' '}
                                                <span className="font-medium text-emerald-600">{entry.new_value}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Footer */}
                    <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                        Utworzono: {formatDate(ticket.created_at)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// main page

export default function MyTickets() {
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Wszystkie');
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        api.get('tickets/my/').then(res => {
            setTickets(res.data.results || []);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    // Filter logic
    const filteredTickets = useMemo(() => {
        if (activeTab === 'Wszystkie') return tickets;
        if (activeTab === 'Oczekujące') return tickets.filter(t => t.status === 'NEW');
        if (activeTab === 'W trakcie') return tickets.filter(t => ['IN_PROGRESS', 'NEEDS_REVIEW'].includes(t.status));
        if (activeTab === 'Rozwiązane') return tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
        return tickets;
    }, [tickets, activeTab]);

    // Stats
    const stats = useMemo(() => ({
        total: tickets.length,
        pending: tickets.filter(t => t.status === 'NEW').length,
        progress: tickets.filter(t => ['IN_PROGRESS', 'NEEDS_REVIEW'].includes(t.status)).length,
        resolved: tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
    }), [tickets]);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen font-['Lexend']">
            <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-6">Moje
                    zgłoszenia</h2>
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1">
                    {['Wszystkie', 'Oczekujące', 'W trakcie', 'Rozwiązane'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-bold transition-all border-b-2 ${
                                activeTab === tab ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            {/*should ensure same grid width for every option (0 or 2 cards on display) but doesnt work xd*/}
            {isLoading ? (
                <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i}
                                                className="bg-white rounded-2xl h-64 border border-slate-100"></div>)}
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-24 text-slate-400">
                    <span className="material-symbols-outlined text-6xl mb-4">inbox</span>
                    <p className="text-lg font-semibold">Brak zgłoszeń</p>
                    <p className="text-sm mt-1">Nie masz jeszcze żadnych zgłoszeń w tej kategorii.</p>
                </div>
            ) : (
                <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredTickets.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} onClick={setSelectedTicket}/>
                    ))}
                </div>
            )}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem label="Łącznie aktywnych" value={stats.total} color="text-primary"/>
                <StatItem label="Oczekujące" value={stats.pending} color="text-error"/>
                <StatItem label="W trakcie" value={stats.progress} color="text-blue-600"/>
                <StatItem label="Rozwiązane" value={stats.resolved} color="text-secondary"/>
            </div>
            <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)}/>
        </div>
    );
}

function StatItem({label, value, color}) {
    return (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
        </div>
    );
}
