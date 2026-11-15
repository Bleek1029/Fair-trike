import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.vectorgrid/dist/VectorGrid.css';
import L from 'leaflet';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Vector tile layer URL from Neon Function
const VECTOR_TILE_URL = 'https://br-hidden-frost-a1p9er7h-vectortiles.compute.c-1.ap-southeast-1.aws.neon.tech/tiles/{z}/{x}/{y}.pbf';

// Olongapo bounds
const OLONGAPO_BOUNDS = [[14.75, 120.15], [14.95, 120.45]];
const OLONGAPO_CENTER = [14.83, 120.31];

// Custom VectorTileLayer component for Leaflet
function VectorTileLayer({ url, options = {} }) {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        if (!map) return;

        // Check if L.VectorGrid is available (from leaflet.vectorgrid)
        if (!L.VectorGrid) {
            console.warn('leaflet.vectorgrid not loaded, falling back to raster tiles');
            return;
        }

        layerRef.current = L.VectorGrid.protobuf(url, {
            vectorTileLayerStyles: {
                // Style for OSM line features (roads, waterways, boundaries)
                'olongapo': {
                    'highway': (properties, zoom) => ({
                        weight: zoom >= 14 ? 2 : 1,
                        color: '#3b82f6',
                        opacity: 0.8,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }),
                    'waterway': () => ({
                        weight: 2,
                        color: '#3b82f6',
                        opacity: 0.7,
                        dashArray: '5,5'
                    }),
                    'boundary': (properties) => {
                        const level = properties.admin_level;
                        if (level === '8' || level === '9') {
                            return { weight: 2, color: '#ef4444', opacity: 0.8, dashArray: '10,5' };
                        }
                        return { weight: 1, color: '#9ca3af', opacity: 0.6, dashArray: '5,5' };
                    },
                    'building': () => ({
                        weight: 1,
                        color: '#6b7280',
                        fillColor: '#9ca3af',
                        fillOpacity: 0.3
                    }),
                    'landuse': () => ({
                        weight: 0.5,
                        color: '#6b7280',
                        fillColor: '#d1d5db',
                        fillOpacity: 0.2
                    }),
                    'natural': (properties) => {
                        if (properties.natural === 'water') {
                            return { weight: 1, color: '#3b82f6', fillColor: '#bfdbfe', fillOpacity: 0.5 };
                        }
                        return { weight: 1, color: '#22c55e', fillColor: '#86efac', fillOpacity: 0.3 };
                    }
                }
            },
            interactive: true,
            getFeatureId: (f) => f.properties?.osm_id,
            ...options
        });

        layerRef.current.addTo(map);
        map.fitBounds(OLONGAPO_BOUNDS);

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
            }
        };
    }, [map, url]);

    return null;
}

export function OlongapoMap() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadVectorTiles = async () => {
        setLoading(true);
        setError(null);
        try {
            // Test the vector tile endpoint
            const testUrl = VECTOR_TILE_URL.replace('{z}', '14').replace('{x}', '8912').replace('{y}', '5623');
            const response = await fetch(testUrl);
            if (!response.ok) {
                throw new Error(`Vector tile service returned ${response.status}`);
            }
            console.log('Vector tile service is ready');
        } catch (err) {
            console.error('Vector tile test failed:', err);
            setError('Vector tile service unavailable. Showing base map only.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col">
            <div className="bg-surface p-4 flex justify-between items-center border-b border-outline-variant">
                <div>
                    <h1 className="text-xl font-bold text-primary">Olongapo Service Area</h1>
                    <p className="text-sm text-on-surface-variant">Vector tile map powered by PostGIS + Neon Functions</p>
                </div>
                <button
                    onClick={loadVectorTiles}
                    disabled={loading}
                    className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Test Vector Tiles'}
                </button>
            </div>

            <div className="flex-1 relative">
                <MapContainer
                    center={OLONGAPO_CENTER}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    maxBounds={OLONGAPO_BOUNDS}
                    maxBoundsViscosity={0.9}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={19}
                    />
                    {/* Vector tile layer - loads OSM data from Neon PostGIS */}
                    <VectorTileLayer url={VECTOR_TILE_URL} />

                    <MapController center={OLONGAPO_CENTER} />
                </MapContainer>

                {error && (
                    <div className="absolute bottom-4 left-4 right-4 bg-error-container/90 text-error p-4 rounded-xl shadow-xl border border-error">
                        <p className="text-body-sm">{error}</p>
                        <p className="text-body-xs mt-1">Run <code>osm2pgsql</code> locally to import olongapo.osm to Neon PostGIS.</p>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-[1000] flex items-center justify-center">
                        <div className="bg-surface p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <p className="font-bold">Testing Vector Tile Service...</p>
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