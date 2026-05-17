import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

const DEFAULT_OPTIONS = { radius: 25, blur: 15, maxZoom: 17 };

export default function HeatmapLayer({ points, radius, blur, maxZoom, redrawOnMove = false }) {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        // czyszczenie poprzedniej warstwy
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (!points?.length) return;

        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity]);
        layerRef.current = L.heatLayer(heatPoints, {
            radius: radius ?? DEFAULT_OPTIONS.radius,
            blur: blur ?? DEFAULT_OPTIONS.blur,
            maxZoom: maxZoom ?? DEFAULT_OPTIONS.maxZoom,
        }).addTo(map);
        
        const redraw = () => {
            if (layerRef.current) {
                layerRef.current._reset();
            }
        }

        if (redrawOnMove) {
            map.on('move', redraw);
        }

        return () => {
            if (redrawOnMove) {
                map.off('move', redraw);
            }

            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [map, points, radius, blur, maxZoom, redrawOnMove]);

    return null;
}
