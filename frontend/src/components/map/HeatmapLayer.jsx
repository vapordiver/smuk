import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

const DEFAULT_OPTIONS = { radius: 25, blur: 15, maxZoom: 17, incidentNum: 10 };

export default function HeatmapLayer({ points, radius, blur, maxZoom, max, redrawOnMove = false }) {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        // remove previous layer
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (!points?.length) return;
        
        const maxIntensity = max ?? points.reduce((m, p) => Math.max(m, p.intensity), DEFAULT_OPTIONS.incidentNum);

        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity]);
        layerRef.current = L.heatLayer(heatPoints, {
            radius: radius ?? DEFAULT_OPTIONS.radius,
            blur: blur ?? DEFAULT_OPTIONS.blur,
            maxZoom: maxZoom ?? DEFAULT_OPTIONS.maxZoom,
            max: maxIntensity,
        }).addTo(map);
        
        let throttleTimer = null;
        const redraw = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                if (layerRef.current) {
                    layerRef.current._reset();
                }
                throttleTimer = null;
            }, 100);
        }

        if (redrawOnMove) {
            map.on('move', redraw);
        }

        return () => {
            if (redrawOnMove) {
                map.off('move', redraw);
            }

            if (layerRef.current) {
                if (throttleTimer) clearTimeout(throttleTimer);
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [map, points, radius, blur, maxZoom, max, redrawOnMove]);

    return null;
}
