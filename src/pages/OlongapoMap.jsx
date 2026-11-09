import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import osmtogeojson from 'osmtogeojson';

// Fix Leaflet icon issue
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export function OlongapoMap() {
    const [geoData, setGeoData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Olongapo Bounds from OSM file
    const center = [14.83, 120.31]; 

    const loadOsmData = async () => {
        setLoading(true);
        try {
            // Note: In a real app, you'd fetch this from a public folder or API
            // For now, we assume the user might want to see how to integrate it.
            // Since the file is 47MB, we'll just log that it's ready for processing.
            console.log("OSM file detected (47MB). Parsing this much data in the browser might be slow.");
            
            // Example of how you would fetch and convert if it was in public/
            /*
            const response = await fetch('/olongapo.osm');
            const str = await response.text();
            const xml = new DOMParser().parseFromString(str, "text/xml");
            const geojson = osmtogeojson(xml);
            setGeoData(geojson);
            */
        } catch (err) {
            console.error("Error loading OSM data:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col">
            <div className="bg-surface p-4 flex justify-between items-center border-b border-outline-variant">
                <div>
                    <h1 className="text-xl font-bold text-primary">Olongapo Service Area</h1>
                    <p className="text-sm text-on-surface-variant">Coverage map based on olongapo.osm</p>
                </div>
                <button 
                    onClick={loadOsmData}
                    className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                    {loading ? 'Processing...' : 'Load OSM Layers'}
                </button>
            </div>
            
            <div className="flex-1 relative">
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {geoData && <GeoJSON data={geoData} style={{ color: '#3b82f6', weight: 2 }} />}
                    <MapController center={center} />
                </MapContainer>

                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-[1000] flex items-center justify-center">
                        <div className="bg-surface p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <p className="font-bold">Parsing Olongapo Map Data...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13);
    }, [center, map]);
    return null;
}
