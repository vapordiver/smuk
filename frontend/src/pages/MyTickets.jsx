import {useState, useEffect, useMemo} from 'react';
import { useSearchParams } from 'react-router-dom';
import {MapContainer, TileLayer, Marker} from 'react-leaflet';
import {useAuth} from "../context/AuthContext";
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import '../utils/leafletSetup';
import {formatDate, PRIORITY_LABELS} from '../utils/formatters';


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

const mapPriorityToPolish = (priority) => {
    const priorityMap = {
        'LOW': 'Niski',
        'MEDIUM': 'Średni',
        'HIGH': 'Wysoki',
        'CRITICAL': 'Krytyczny',
    };
    return priorityMap[priority] || priority;
};

const mapStatusToPolish = (status) => {
    const statusMap = {
        'NEW': 'Nowe',
        'IN_PROGRESS': 'W trakcie',
        'NEEDS_REVIEW': 'Do weryfikacji',
        'RESOLVED': 'Rozwiązane',
        'CLOSED': 'Zamknięte',
        'ARCHIVED': 'Zarchiwizowane',
    };
    return statusMap[status] || status;
};

const mapAuditValueToPolish = (fieldChanged, value) => {
    if (!value) return value;

    if (fieldChanged === 'status') {
        return mapStatusToPolish(value);
    }

    if (fieldChanged === 'priority') {
        return mapPriorityToPolish(value);
    }

    return value;
};

const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.includes('backend:8000')) {
        return imagePath.replace('backend:8000', 'localhost:8000');
    }
    if (imagePath.startsWith('/media/')) {
        return `http://localhost:8000${imagePath}`;
    }
    return imagePath;
};

const getCoordinates = (location) => {
    if (!location) return [51.7535, 19.4520]; //fallback on location on campus a
    //geojson object
    if (location.coordinates && Array.isArray(location.coordinates)) {
        return [location.coordinates[1], location.coordinates[0]];
    }
    //pointfield text
    if (typeof location === 'string') {
        const match = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) {
            const lng = parseFloat(match[1]);
            const lat = parseFloat(match[2]);
            return [lat, lng];
        }
    }
    return [51.7535, 19.4520];//fallback on location on campus a
};

const getAuditFieldLabel = (fieldChanged) => {
    const labels = {
        status: 'status',
        priority: 'priorytet',
        assigned_to: 'przypisanie',
        note: 'notatka',
    };

    return labels[fieldChanged] || fieldChanged;
};

const getAuditChangeText = (entry) => {
    if (entry.field_changed === 'assigned_to') {
        if (!entry.old_value && entry.new_value) {
             return <>na <strong className="font-bold text-slate-800">{entry.new_value}</strong></>;
        }

        if (entry.old_value && entry.new_value) {
            return <>z <span className="line-through text-slate-400">{entry.old_value}</span> na <strong className="font-bold text-slate-800">{entry.new_value}</strong></>;
        }

        if (entry.old_value && !entry.new_value) {
            return <>z <span className="line-through text-slate-400">{entry.old_value}</span> na <strong className="font-bold text-slate-800">brak przypisania</strong></>;
        }
    }

    if (entry.field_changed === 'status' || entry.field_changed === 'priority') {
        const oldValue = mapAuditValueToPolish(entry.field_changed, entry.old_value) || 'brak';
        const newValue = mapAuditValueToPolish(entry.field_changed, entry.new_value) || 'brak';
        return <>z <strong className="line-through font-bold text-slate-400">{oldValue}</strong> na <strong className="font-bold text-slate-800">{newValue}</strong></>;;
    }

    return <>z <span className="line-through text-slate-400">{entry.old_value || 'brak'}</span> na <strong className="font-bold text-slate-800">{entry.new_value || 'brak'}</strong></>;
};

//ticket card display
const TicketCard = ({ticket, onClick}) => {
    const displayImage = ticket.image || ticket.parent_details?.image;
    return (
        <div
            className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg transition-all flex flex-col md:flex-row md:h-52 h-full cursor-pointer relative"
            onClick={() => onClick(ticket)}>

            {/* image section */}
            <div className="md:w-1/3 relative h-48 md:h-full overflow-hidden bg-slate-100 shrink-0">
                {displayImage ? (
                    <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        src={getImageUrl(displayImage)}
                        alt={ticket.title}
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Brak zdjęcia
                    </div>
                )}
            </div>

            {/* ticket main body section */}
            <div className="md:w-2/3 p-5 md:p-6 pb-20 md:pb-16 flex flex-col min-w-0 w-full relative">
                <div className="flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase shrink-0">ID: #REP-{ticket.id}</span>
                        <span className="text-xs text-slate-500 font-medium shrink-0 ml-2">{formatDate(ticket.created_at)}</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors line-clamp-2"
                        title={ticket.title}>
                        {ticket.title}
                    </h3>

                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <span className="material-symbols-outlined text-lg shrink-0">location_on</span>
                        <span className="line-clamp-1" title={ticket.building?.name}>
                            {ticket.building?.name || "Teren kampusu"}
                        </span>
                    </div>
                </div>
                {/* bottom panel with status and detailed look button*/}
                <div className="absolute bottom-5 left-5 right-5 md:bottom-6 md:left-6 md:right-6 flex items-center justify-between pt-3 md:pt-4 border-t border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={mapStatusToBadge(ticket.status)}/>
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
    const position = getCoordinates(ticket.location)
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
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
                    {/* --- Duplicate info --- */}
                    {ticket.parent_details && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-amber-600 mt-0.5">link</span>
                                <div>
                                    <h5 className="font-bold text-amber-800 text-sm">Zgłoszenie połączone
                                        (Duplikat)</h5>
                                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                                        To zgłoszenie zostało oznaczone jako duplikat i podpięte pod zgłoszenie główne
                                        <strong className="ml-1 text-amber-950 font-extrabold">
                                            #REP-{ticket.parent_details.id}
                                        </strong>.<br/>
                                        Zdjęcie dodane do tego zgłoszenia zostało zastąpione zdjęciem pochodzącym ze
                                        zgłoszenia nadrzędnego.
                                        Jeśli uważasz, że zgłoszenie zostało nieprawidłowo zidentyfikowane jako duplikat
                                        lub występują inne problemy, skontaktuj się z administratorem lub koordynatorem.
                                    </p>
                                </div>
                            </div>

                            {/* Info about parent ticket */}
                            <div
                                className="bg-white/80 border border-amber-100 rounded-xl p-3 pl-4 flex flex-col gap-1.5 text-xs text-amber-900">
                                <p><strong>Tytuł zgłoszenia głównego:</strong> {ticket.parent_details.title}</p>
                            </div>
                        </div>
                    )}
                    {/* Status and Priority */}
                    <div className="flex flex-wrap gap-3">
                        <StatusBadge status={mapStatusToBadge(ticket.status)}/>
                        {ticket.priority && (
                            <div
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL'
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : ticket.priority === 'MEDIUM'
                                        ? 'bg-orange-100 text-orange-700 border-orange-200'
                                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}>
                                Priorytet: {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                            </div>
                        )}
                    </div>
                    {/* Category */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><span
                            className="material-symbols-outlined">category</span>Kategoria</h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {ticket.category?.name || "Brak kategorii"}
                        </p>
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
                    {(ticket.image || ticket.parent_details?.image) && (
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined">photo_camera</span>
                                {ticket.image ? "Zdjęcie usterki" : "Zdjęcie ze zgłoszenia głównego"}
                            </h4>
                            <img
                                className="w-full h-auto rounded-2xl border border-slate-200"
                                src={getImageUrl(ticket.image || ticket.parent_details.image)}
                                alt={ticket.title}
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
                            <p><strong>Budynek:</strong> {ticket.building?.name || "Teren kampusu"}</p>
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
                                            {/* render SYSTEM if user null */}
                                            <span className="font-medium text-slate-700">
                                                {entry.user ? `${entry.user.first_name} ${entry.user.last_name}` : 'SYSTEM'}
                                            </span>
                                            <span className="text-slate-500"> zmienił(a) </span>
                                            <span
                                                className="font-medium">{getAuditFieldLabel(entry.field_changed)}</span>
                                            <div className="text-slate-500 mt-0.5">
                                                {entry.field_changed === 'assigned_to'
                                                    ? <span
                                                        className="font-medium text-emerald-600">{getAuditChangeText(entry)}</span>
                                                    : getAuditChangeText(entry)
                                                }
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
    const {user} = useAuth();
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Wszystkie');
    const [selectedTicket, setSelectedTicket] = useState(null);

    const isCoordinator = user?.role?.toLowerCase() === "coordinator";

    useEffect(() => {
        if (!user) {
            return;
        }
        let isMounted = true;
        const endpoint = isCoordinator ? 'tickets/' : 'tickets/my/';
        const fetchAllTickets = async () => {
            setIsLoading(true);
            try {
                let allResults = [];
                let currentUrl = endpoint;
                while (currentUrl) {
                    const res = await api.get(currentUrl);
                    allResults = [...allResults, ...(res.data.results || [])];
                    let nextUrl = res.data.next;
                    if (nextUrl && nextUrl.includes('backend:8000')) {
                        nextUrl = nextUrl.replace('backend:8000', 'localhost:8000');
                    }
                    currentUrl = nextUrl;
                }
                if (isMounted) {
                    setTickets(allResults);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Błąd pobierania zgłoszeń: ", err);
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        fetchAllTickets();
        return () => {
            isMounted = false;
        };
    }, [user, isCoordinator]);

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const ticketIdParam = searchParams.get('ticket');
        if (ticketIdParam && tickets.length > 0) {
            const ticketIdNum = parseInt(ticketIdParam, 10);
            const found = tickets.find(t => t.id === ticketIdNum);
            if (found) {
                setSelectedTicket(found);
            }
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, tickets, setSearchParams]);

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
        <div
            className="p-6 md:p-8 w-full max-w-7xl mx-auto h-full max-h-[100dvh] flex flex-col font-['Lexend_Variable']">
            <div className="mb-3 shrink-0">
                <p className="text-primary text-xl font-bold text-slate-900 mb-2">
                    {isCoordinator ? "Panel Koordynatora" : "Podsumowanie konta"}
                </p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                    {isCoordinator ? "Wszystkie zgłoszenia w systemie" : "Moje zgłoszenia"}
                </h2>
                <div
                    className="flex overflow-x-auto whitespace-nowrap gap-2 border-b border-slate-200 pb-1 no-scrollbar pb-2">
                    {['Wszystkie', 'Oczekujące', 'W trakcie', 'Rozwiązane'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-bold transition-all border-b-2 ${activeTab === tab ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-8 scrollbar-thin">
                <div className="w-full flex flex-col">
                    {isLoading ? (
                        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
                            {[1, 2, 3, 4].map(i => <div key={i}
                                                        className="bg-white rounded-2xl h-64 border border-slate-100"></div>)}
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="w-full flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
                            <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">inbox</span>
                            <p className="text-lg font-bold text-slate-500">Brak zgłoszeń</p>
                            <p className="text-sm mt-1 text-slate-400">
                                {isCoordinator ? "System nie posiada żadnych zgłoszeń w tej kategorii." : "Nie masz jeszcze żadnych zgłoszeń w tej kategorii."}
                            </p>
                        </div>
                    ) : (
                        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {filteredTickets.map(ticket => (
                                <TicketCard key={ticket.id} ticket={ticket} onClick={setSelectedTicket}/>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <StatItem label="Łącznie aktywnych" value={stats.total} color="text-primary"/>
                    <StatItem label="Oczekujące" value={stats.pending} color="text-error"/>
                    <StatItem label="W trakcie" value={stats.progress} color="text-blue-600"/>
                    <StatItem label="Rozwiązane" value={stats.resolved} color="text-secondary"/>
                </div>

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
    )
        ;
}
