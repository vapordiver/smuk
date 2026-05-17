import { Polygon } from 'react-leaflet';

export default function CampusPolygonsLayer({ campuses }) {
    if (!campuses || campuses.length === 0) return null;

    return campuses.map(campus => campus.polygon && (
        <Polygon
            key={`campus-${campus.id}`}
            positions={campus.polygon.coordinates[0].map(c => [c[1], c[0]])}
            pathOptions={{
                color: '#1132d4',
                weight: 2,
                fillColor: '#1132d4',
                fillOpacity: 0.08,
                dashArray: '6 4',
            }}
        />
    ));
}
