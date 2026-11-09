// ── Driver-side map: shows the passenger (pickup → dropoff) and the driver's
// live position. Reuses Leaflet + OSM tiles, same as the passenger MapApp.
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { fmtDist } from '../lib/format.js';

const MAP_DEFAULT_CENTER = [14.830, 120.285];
const MAP_DEFAULT_ZOOM = 13;

const PASSENGER_ICON = L.divIcon({
  className: 'passenger-marker',
  html: '<div style="font-size:22px; line-height:1;">👤</div>',
  iconSize: [24, 24], iconAnchor: [12, 12],
});
const DESTINATION_ICON = L.divIcon({
  className: 'destination-marker',
  html: '<div style="font-size:22px; line-height:1;">🏁</div>',
  iconSize: [24, 24], iconAnchor: [12, 12],
});
const DRIVER_ICON = L.divIcon({
  className: 'driver-marker',
  html: '<div style="font-size:22px; line-height:1;">🚕</div>',
  iconSize: [24, 24], iconAnchor: [12, 12],
});

export function DriverMap({
  pickupCoord,
  dropoffCoord,
  pickupLabel = 'Pickup',
  dropoffLabel = 'Drop-off',
  driverCoord, // { lat, lng } live driver position
  onDriverLocationChange, // optional callback when the map centers on driver
}) {
  const mapRef = useRef(null);
  const passengerMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // (Re)draw passenger + destination markers + route.
    if (pickupCoord) {
      if (passengerMarkerRef.current) {
        passengerMarkerRef.current.setLatLng([pickupCoord.lat, pickupCoord.lng]);
      } else {
        passengerMarkerRef.current = L.marker(
          [pickupCoord.lat, pickupCoord.lng],
          { icon: PASSENGER_ICON }
        ).addTo(mapRef.current);
        passengerMarkerRef.current.bindPopup(`Pickup: ${pickupLabel}`);
      }
    }
    if (dropoffCoord) {
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([dropoffCoord.lat, dropoffCoord.lng]);
      } else {
        destMarkerRef.current = L.marker(
          [dropoffCoord.lat, dropoffCoord.lng],
          { icon: DESTINATION_ICON }
        ).addTo(mapRef.current);
        destMarkerRef.current.bindPopup(`Drop-off: ${dropoffLabel}`);
      }
    }
    if (pickupCoord && dropoffCoord && !routeLineRef.current) {
      routeLineRef.current = L.polyline(
        [[pickupCoord.lat, pickupCoord.lng], [dropoffCoord.lat, dropoffCoord.lng]],
        { color: '#0d5c3a', weight: 4, opacity: 0.9 }
      ).addTo(mapRef.current);
      const lats = [pickupCoord.lat, dropoffCoord.lat];
      const lngs = [pickupCoord.lng, dropoffCoord.lng];
      mapRef.current.fitBounds(
        [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        { padding: [60, 60] }
      );
    }

    // Driver marker: follows the driver's live position.
    if (driverCoord) {
      updateDriverMarker(driverCoord.lat, driverCoord.lng);
    }
  }, [mapReady, pickupCoord, dropoffCoord, pickupLabel, dropoffLabel, driverCoord]);

  const updateDriverMarker = (lat, lng) => {
    if (!mapRef.current) return;
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([lat, lng]);
    } else {
      driverMarkerRef.current = L.marker([lat, lng], { icon: DRIVER_ICON }).addTo(mapRef.current);
      driverMarkerRef.current.bindPopup('You (driver)');
    }
    // Auto-pan the map to follow the driver while on an active trip.
    mapRef.current.panTo([lat, lng]);
    onDriverLocationChange?.({ lat, lng });
  };

  useEffect(() => {
    const container = document.getElementById('driver-map-container');
    if (!container || mapRef.current) return undefined;
    const map = L.map('driver-map-container', {
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, minZoom: 3,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    setMapReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  const distanceKm = pickupCoord && dropoffCoord
    ? Math.round(
        Math.sqrt(
          Math.pow(dropoffCoord.lat - pickupCoord.lat, 2) +
            Math.pow(dropoffCoord.lng - pickupCoord.lng, 2)
        ) * 111
      )
    : 0;

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-md bg-surface-container-low border border-surface-container-highest">
      <div id="driver-map-container" className="w-full h-[400px] z-0" />
      <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
        <span className="text-label-sm text-primary tracking-wide uppercase">Live Driver Map</span>
      </div>
      <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur px-2 py-1 rounded-lg shadow-md text-[11px] text-on-surface-variant flex items-center gap-1">
        <span className="text-[10px] font-bold text-on-surface">≈ {distanceKm} km</span>
      </div>
    </div>
  );
}
