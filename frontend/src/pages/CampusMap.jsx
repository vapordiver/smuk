import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../utils/leafletSetup';

import CampusPolygonsLayer from '../components/map/CampusPolygonsLayer';
import MarkersClusterLayer from '../components/map/MarkersClusterLayer';
import HeatmapLayer from '../components/map/HeatmapLayer';
import MapViewToggle from '../components/map/MapViewToggle';
import MapFilters from '../components/map/MapFilters';
import useTicketsGeoJSON from '../hooks/useTicketsGeoJSON';
import useHeatmapData from '../hooks/useHeatmapData';
import useCampuses from '../hooks/useCampuses';
import useCategories from '../hooks/useCategories';

// campus center (calculated from campuses A, B, C polygons)
const CAMPUS_CENTER = [51.7500, 19.4520];
const DEFAULT_ZOOM = 15;
const SVG_RENDERER = L.svg({ padding: 1.0 });

function MapResizeListener() {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const timer1 = setTimeout(() => map.invalidateSize(), 100);
        const timer2 = setTimeout(() => map.invalidateSize(), 500);
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [map]);
    return null;
}

export default function CampusMap() {
    const [viewMode, setViewMode] = useState('markers'); // 'markers' | 'heatmap'
    const [filters, setFilters] = useState({
        date_from: null,
        date_to: null,
        category_id: null,
    });

    // all data fetched on mount, cached in hook state
    // view toggle never re-fetches
    // both modes re-fetch when filters change
    const { features } = useTicketsGeoJSON(filters);
    const { points: heatPoints } = useHeatmapData(filters);
    const { campuses } = useCampuses();
    const { categories } = useCategories();

    useEffect(() => {
        if (filters.category_id && categories.length > 0
            && !categories.some(c => c.id === filters.category_id)) {
            setFilters(prev => ({ ...prev, category_id: null }));
        }
    }, [categories, filters.category_id]);

    return (
        <div className="flex flex-col h-full relative">
            <MapContainer
                center={CAMPUS_CENTER}
                zoom={DEFAULT_ZOOM}
                maxZoom={22}
                className="flex-1 w-full z-0"
                scrollWheelZoom={true}
                tap={false}
            >
                <MapResizeListener />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={22}
                    maxNativeZoom={19}
                />

                <CampusPolygonsLayer campuses={campuses} />

                {viewMode === 'markers' && (
                    <MarkersClusterLayer features={features} />
                )}

                {viewMode === 'heatmap' && heatPoints.length > 0 && (
                    <HeatmapLayer points={heatPoints} redrawOnMove={true} />
                )}
            </MapContainer>
            {/* map toolbar */}
            <div className="absolute top-4 right-4 z-10 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <MapViewToggle viewMode={viewMode} onChange={setViewMode} />
                <MapFilters
                    filters={filters}
                    onChange={setFilters}
                    categories={categories}
                />
            </div>
        </div>
    );
}
