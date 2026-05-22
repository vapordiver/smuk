import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useHeatmapData from '../../hooks/useHeatmapData';
import HeatmapLayer from '../map/HeatmapLayer';
import '../../utils/leafletSetup';

const CAMPUS_CENTER = [51.7500, 19.4520];
const DEFAULT_ZOOM = 15;

export default function DashboardMapPreview() {
    const { points } = useHeatmapData();
    
    return (
        <MapContainer
            center={CAMPUS_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full z-0"
            scrollWheelZoom={false}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={22}
                maxNativeZoom={19}
            />
            {points && points.length > 0 && <HeatmapLayer points={points} redrawOnMove={true} />}
        </MapContainer>
    );
}
