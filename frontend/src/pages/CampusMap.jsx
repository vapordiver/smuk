import {useState, useEffect, useCallback} from 'react';
import {MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';

// leaflet icon fix (same as MyTickets.jsx)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// campus center (calculated from campuses A, B, C polygons)
const CAMPUS_CENTER = [51.7500, 19.4520];
const DEFAULT_ZOOM = 15;

const PRIORITY_COLORS = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#ef4444',
    CRITICAL: '#171717',
};

const PRIORITY_LABELS = {
    LOW: 'Niski',
    MEDIUM: 'Średni',
    HIGH: 'Wysoki',
    CRITICAL: 'Krytyczny',
};

const createPriorityIcon = (priority) => {
    const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.LOW;
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 24px;
            height: 24px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const createClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    let diameter = 36;
    if (count >= 10) diameter = 44;
    if (count >= 25) diameter = 52;

    return L.divIcon({
        html: `<div style="
            width: ${diameter}px;
            height: ${diameter}px;
            background: rgba(17, 50, 212, 0.85);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: ${count >= 100 ? '13' : '15'}px;
            font-family: 'Lexend', sans-serif;
            box-shadow: 0 3px 10px rgba(17, 50, 212, 0.4);
        ">${count}</div>`,
        className: '',
        iconSize: L.point(diameter, diameter),
    });
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

/**
 * Inner component that listens to map move events 
 * and fetches GeoJSON data with bbox filtering
 */
function MapEvents({onFeaturesLoaded}) {
    const map = useMap();

    const fetchGeoJSON = useCallback(() => {
        const bounds = map.getBounds();
        const bbox = [
            bounds.getSouthWest().lng,
            bounds.getSouthWest().lat,
            bounds.getNorthEast().lng,
            bounds.getNorthEast().lat,
        ].join(',');

        api.get('tickets/geojson/', {params: {bbox}})
            .then(res => {
                onFeaturesLoaded(res.data.features || []);
            })
            .catch(err => {
                console.error('[CampusMap] GET /api/tickets/geojson/ failed:', err.message);
            });
    }, [map, onFeaturesLoaded]);

    // fetch on initial render
    useEffect(() => {
        fetchGeoJSON();
    }, [fetchGeoJSON]);

    // fetch on every map move/zoom
    useMapEvents({
        moveend: fetchGeoJSON,
    });

    return null;
}

export default function CampusMap() {
    const [features, setFeatures] = useState([]);

    return (
        <div className="flex flex-col h-full">
            <MapContainer
                center={CAMPUS_CENTER}
                zoom={DEFAULT_ZOOM}
                className="flex-1 w-full z-0"
                scrollWheelZoom={true}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                <MapEvents onFeaturesLoaded={setFeatures}/>
                <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterIcon}>
                    {features.map(feature => {
                        const {coordinates} = feature.geometry;
                        const props = feature.properties;
                        // GeoJSON: [lng, lat] -> Leaflet: [lat, lng]
                        const position = [coordinates[1], coordinates[0]];

                        return (
                            <Marker
                                key={props.id}
                                position={position}
                                icon={createPriorityIcon(props.priority)}
                            >
                                <Popup>
                                    <div className="font-['Lexend'] min-w-[200px]">
                                        <h3 className="font-bold text-slate-900 text-sm mb-2">{props.title}</h3>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <p>
                                                <span className="font-semibold">Kategoria:</span>{' '}
                                                {props.category || '—'}
                                            </p>
                                            <p>
                                                <span className="font-semibold">Priorytet:</span>{' '}
                                                <span style={{color: PRIORITY_COLORS[props.priority]}}>
                                                    {PRIORITY_LABELS[props.priority] || props.priority}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="font-semibold">Zgłoszono:</span>{' '}
                                                {formatDate(props.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}
