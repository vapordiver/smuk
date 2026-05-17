import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { formatDate, PRIORITY_LABELS, PRIORITY_COLORS } from '../../utils/formatters';

const createPriorityIcon = (priority) => {
    const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.LOW;
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 30px;
            height: 30px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
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
            font-family: 'Lexend Variable', sans-serif;
            box-shadow: 0 3px 10px rgba(17, 50, 212, 0.4);
        ">${count}</div>`,
        className: '',
        iconSize: L.point(diameter, diameter),
    });
};

export default function MarkersClusterLayer({ features }) {
    if (!features || features.length === 0) return null;

    return (
        <MarkerClusterGroup
            iconCreateFunction={createClusterIcon}
            zoomToBoundsOnClick={true}
            spiderfyOnMaxZoom={true}
            spiderfyDistanceMultiplier={1.5}
            maxClusterRadius={60}
            removeOutsideVisibleBounds={false}
            showCoverageOnHover={false}
        >
            {features.map(feature => {
                const { coordinates } = feature.geometry;
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
                            <div className="font-['Lexend_Variable'] min-w-[200px]">
                                <h3 className="font-bold text-slate-900 text-sm mb-2">{props.title}</h3>
                                <div className="space-y-1 text-xs text-slate-600">
                                    <p>
                                        <span className="font-semibold">Kategoria:</span>{' '}
                                        {props.category || '—'}
                                    </p>
                                    <p>
                                        <span className="font-semibold">Priorytet:</span>{' '}
                                        <span style={{ color: PRIORITY_COLORS[props.priority] }}>
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
    );
}
