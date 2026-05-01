import {useState, useEffect} from 'react';
import {MapContainer, TileLayer, Marker} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
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
        'ARCHIVED': 'resolved',
    };
    return statusMap[apiStatus] || 'new';
};

const mapPriorityToLabel = (priority) => {
    const priorityMap = {
        'LOW': 'Niski',
        'MEDIUM': 'Średni',
        'HIGH': 'Wysoki',
        'CRITICAL': 'Krytyczny',
    };
    return priorityMap[priority] || priority;
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TicketCard = ({ ticket, onClick }) => {
  return (
    <div
      onClick={() => onClick(ticket)}
      className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4"
    >
      {/* Thumbnail */}
      <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100">
        {ticket.image ? (
          <img
            src={ticket.image}
            alt={ticket.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            Brak zdj.
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 justify-between py-1">
        <div>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-gray-800 line-clamp-1">{ticket.title}</h3>
            <StatusBadge status={mapStatusToBadge(ticket.status)} />
          </div>
          <p className="text-xs text-gray-500 font-medium">
            Priorytet: <span className="text-gray-700">{mapPriorityToLabel(ticket.priority)}</span>
            {ticket.category?.name && ` • ${ticket.category.name}`}
          </p>
        </div>
        <div className="text-[11px] text-gray-400">
          Zgłoszono: {formatDate(ticket.created_at)}
        </div>
      </div>
    </div>
  );
};

const TicketModal = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const position = ticket.location?.coordinates
    ? [ticket.location.coordinates[1], ticket.location.coordinates[0]] // [lat, lng] wg PostGIS [lng, lat]
    :[51.764, 19.511]; //fallback na stadion widzew xd

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-800">{ticket.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 pt-0 overflow-y-auto space-y-6">
          <div className="flex gap-2">
            <StatusBadge status={mapStatusToBadge(ticket.status)} />
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-gray-100 text-gray-600">
              {mapPriorityToLabel(ticket.priority)}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Opis usterki</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
              {ticket.description || 'Brak opisu.'}
            </p>
          </div>
          {ticket.image && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Zdjęcie</h4>
              <img
                src={ticket.image}
                alt="Pełny podgląd usterki"
                className="w-full h-auto rounded-2xl bg-gray-50 object-cover max-h-[40vh]"
              />
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Lokalizacja</h4>
            <div className="h-48 w-full rounded-2xl overflow-hidden shadow-sm">
              <MapContainer
                center={position}
                zoom={16}
                className="h-full w-full"
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} />
              </MapContainer>
            </div>
            {ticket.building?.name && (
              <p className="text-xs text-gray-500 mt-2">
                Przypisano do: {ticket.building.name}
                {ticket.room ? `, sala ${ticket.room}` : ''}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const[isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        // pobieranie zgloszen
        const response = await api.get('tickets/my/');
        // Obsługa paginacji response.data.results
        const results = response.data.results || response.data;
        setTickets(results);
      } catch (err) {
        console.error('Błąd pobierania zgłoszeń:', err);
        setError('Nie udało się pobrać Twoich zgłoszeń. Spróbuj ponownie.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  },[]);
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight text-center">
          Moje Zgłoszenia
        </h1>
        <p className="text-gray-500 text-sm mt-1 text-center">
          Śledź statusy zgłoszonych przez Ciebie usterek.
        </p>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white p-4 rounded-2xl h-32 w-full"></div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">Brak zgłoszeń</h3>
          <p className="text-sm text-gray-500 mt-1">
            Nie zgłosiłeś jeszcze żadnej usterki na kampusie.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={setSelectedTicket}
            />
          ))}
        </div>
      )}
      <TicketModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}