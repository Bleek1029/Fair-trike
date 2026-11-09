import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../auth/AuthContext.jsx';
import { fetchRoute, geocodePlaceFreeText, reverseGeocode, searchPlaces } from '../lib/places.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { RideOptionCard } from '../components/RideOptionCard.jsx';
import { FareEstimator } from '../components/FareEstimator.jsx';
import { FARE, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, SEARCH_DEBOUNCE_MS, EMERGENCY_TEL } from '../config.js';
import { apiCreateRide, getToken } from '../api.js';
import {
  connectSocket, joinRide, leaveRide, onDriverLocation, onRideEvent,
} from '../lib/socket.js';
import { initialsOf, avatarUrl } from '../lib/utils.js';
import { fmtDist, fmtTime, formatPeso } from '../lib/format.js';

const BASE_FARE = FARE.base;
const PER_KM = FARE.perKm;

export function getInitials(fullname) {
  return initialsOf(fullname);
}

// ── Ride options (fare tiers). The tricycle is the only ride —
//    Drive / Walk / Bike travel modes have been removed. ──
const RIDE_OPTIONS = [
  { id: 'regular', title: 'Standard Regular', icon: 'electric_rickshaw', desc: 'Standard trike fare · ₱30.00 flag-down' },
  { id: 'pwd', title: 'PWD', icon: 'accessible', badge: '20% OFF', badgeClass: 'bg-primary-container text-on-primary', desc: 'Persons with Disability — 20% off by law' },
  { id: 'discounted', title: 'Student / Senior Pass', icon: 'badge', badge: '20% OFF', badgeClass: 'bg-primary-container text-on-primary', desc: 'Students & senior citizens — 20% off by law' },
];

export function MapApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const mapRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const driverRouteLineRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const initialPickup = location.state?.pickup || 'East Bajac-Bajac Public Plaza Terminal';
  const initialDest = location.state?.destination || '';

  const [startStr, setStartStr] = useState(initialPickup);
  const [destStr, setDestStr] = useState(initialDest);
  const [startCoord, setStartCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [gpsText, setGpsText] = useState('Acquiring GPS...');
  const [routeResult, setRouteResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [rideId, setRideId] = useState('regular');
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [booked, setBooked] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverAccepted, setDriverAccepted] = useState(false);
  const [driverName, setDriverName] = useState(null);
  const [driverAvatar, setDriverAvatar] = useState(null);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [rideStatus, setRideStatus] = useState(booked ? booked.status : null);

  useEffect(() => {
    const container = document.getElementById('mobile-map-container');
    if (!container || mapRef.current) return undefined;
    const map = L.map('mobile-map-container', {
      center: MAP_DEFAULT_CENTER, zoom: MAP_DEFAULT_ZOOM, zoomControl: false, attributionControl: false,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, minZoom: 3 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          map.setView([lat, lng], 15);
          setGpsText('GPS lock acquired • East Bajac-Bajac');
          const icon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-location-marker"><div class="pulse-ring"></div><div class="dot"></div></div>',
            iconSize: [28, 28], iconAnchor: [14, 14],
          });
          L.marker([lat, lng], { icon }).addTo(map);
        },
        () => setGpsText('GPS not available • Using default location'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      setGpsText('Geolocation not supported');
    }
    return () => {
      if (mapRef.current && typeof mapRef.current.remove === 'function') mapRef.current.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Dynamic autocomplete (no hardcoding) ──
  // Every keystroke hits /api/places/search -> Photon + Nominatim,
  // Area-biased server-side. No LOCATIONS / STATIC_COORDS needed.
  const searchSuggestions = async (value) => {
    const q = (value || '').trim();
    if (q.length < 2) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    try {
      const hits = await searchPlaces(q);
      setSuggestions(hits);
    } finally {
      setSearching(false);
    }
  };

  const onStartChange = (value) => {
    setStartStr(value);
    setRouteResult(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchSuggestions(value), SEARCH_DEBOUNCE_MS);
  };

  const onDestChange = (value) => {
    setDestStr(value);
    setRouteResult(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchSuggestions(value), SEARCH_DEBOUNCE_MS);
  };

  const placeMarker = (which, name, lat, lng, label) => {
    if (!mapRef.current) return;
    const ref = which === 'start' ? startMarkerRef : endMarkerRef;
    if (ref.current) mapRef.current.removeLayer(ref.current);
    ref.current = L.marker([lat, lng], { draggable: false }).addTo(mapRef.current);
    ref.current.bindPopup(label || name);
    if (which === 'start') { setStartStr(name); setStartCoord({ lat, lng }); }
    else { setDestStr(name); setDestCoord({ lat, lng }); }
    setSuggestions([]);
    setActiveInput(null);
  };

  // Resolve a place to coordinates: stored marker first, then live geocode.
  // Works for ANY place in the search area — nothing is hardcoded.
  const resolveCoord = async (which, name) => {
    const stored = which === 'start' ? startCoord : destCoord;
    const cur = which === 'start' ? startStr : destStr;
    if (stored && cur === name) return stored;
    return geocodePlaceFreeText(name);
  };

  const chooseSuggestion = (s) => {
    // Suggestion already carries lat/lng from Photon/Nominatim.
    if (!Number.isFinite(s?.lat) || !Number.isFinite(s?.lng)) {
      if (activeInput === 'start') setStartStr(s.name); else setDestStr(s.name);
      setSuggestions([]); setActiveInput(null); return;
    }
    if (mapRef.current) mapRef.current.setView([s.lat, s.lng], 15);
    if (activeInput === 'start') placeMarker('start', s.name, s.lat, s.lng, s.full || s.name);
    else placeMarker('dest', s.name, s.lat, s.lng, s.full || s.name);
  };

  // Resolve the pickup point from given coords: reverse-geocode the label,
  // move the map, and place the pulsing pickup marker.
  const applyCurrentPickup = async (lat, lng) => {
    let name = 'Current Location';
    try { name = await reverseGeocode(lat, lng); } catch { /* keep default */ }
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
      const ref = startMarkerRef.current;
      if (ref) mapRef.current.removeLayer(ref);
      const icon = L.divIcon({
        className: 'user-location-marker',
        html: '<div class="user-location-marker"><div class="pulse-ring"></div><div class="dot"></div></div>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      startMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
      startMarkerRef.current.bindPopup(`Pickup: ${name}`);
    }
    setStartStr(name);
    setStartCoord({ lat, lng });
    setRouteResult(null);
  };

  // Approximate location from the caller's public IP (backend proxies keyless
  // geo services). Used when browser GPS fails — denied permission, insecure
  // HTTP origin (e.g. testing over LAN), timeout, or no GPS hardware.
  const pickupFromIpLocation = async () => {
    const r = await fetch('/api/geo/ip');
    const d = await r.json();
    if (!Number.isFinite(d?.lat) || !Number.isFinite(d?.lon)) return false;
    await applyCurrentPickup(d.lat, d.lon);
    setGpsText('Using approximate location • type a pickup point to refine');
    setRouteError('Precise GPS is unavailable — pickup set to your approximate location. Type a pickup point to change it.');
    return true;
  };

  // Use the device's real GPS position as the pickup point + reverse-geocoded label.
  const useCurrentLocation = () => {
    setLocating(true);
    setRouteError('');

    const onGeoError = async (err) => {
      let approx = false;
      try { approx = await pickupFromIpLocation(); } catch { /* ignore */ }
      if (!approx) {
        const code = err?.code;
        setRouteError(
          code === 1
            ? 'Location permission denied. Please allow location access in your browser, or type a pickup point.'
            : code === 3
              ? 'Location request timed out. Please try again or type a pickup point.'
              : 'Could not get your location. Please allow location access or type a pickup point.'
        );
      }
      setLocating(false);
    };

    if (!navigator.geolocation) {
      // No geolocation API at all (e.g. insecure context) → try IP fallback.
      onGeoError({ code: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          await applyCurrentPickup(lat, lng);
          setGpsText('Pickup set to your current location');
        } finally {
          setLocating(false);
        }
      },
      onGeoError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ── Real-time driver tracking for a booked ride ──────────────────────────
  // Connects to Socket.io, joins the ride room, and listens for the driver
  // accepting the trip, live location updates, and completion/cancellation.
  useEffect(() => {
    if (!booked || !user) return;
    const token = getToken();
    if (!token) return;

    const s = connectSocket(token);
    socketRef.current = s;
    joinRide(s, booked.id);
    setRideStatus(booked.status);

    const unsubAccepted = onRideEvent(s, 'ride-accepted', (data) => {
      setDriverAccepted(true);
      setRideStatus('accepted');
      // Capture driver details from the accepted-ride payload so the
      // passenger can see who accepted their booking.
      if (data?.driverName) setDriverName(data.driverName);
      if (data.driverAvatar !== undefined) setDriverAvatar(data.driverAvatar);
      // Driver may already be at/near pickup; draw a line to pickup if provided.
      if (data?.pickupCoord) {
        drawDriverLine(data.pickupCoord.lat, data.pickupCoord.lng);
      }
    });
    const unsubCompleted = onRideEvent(s, 'ride-completed', () => {
      setRideCompleted(true);
      setRideStatus('completed');
    });
    const unsubCancelled = onRideEvent(s, 'ride-cancelled', () => {
      setRideStatus('cancelled');
    });
    const unsubLocation = onDriverLocation(s, (data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng, at: data.at });
      updateDriverMarker(data.lat, data.lng);
      if (booked?.pickupCoord) {
        drawDriverLine(data.lat, data.lng, booked.pickupCoord.lat, booked.pickupCoord.lng);
      }
    });

    return () => {
      unsubAccepted();
      unsubCompleted();
      unsubCancelled();
      unsubLocation();
      leaveRide(s, booked.id);
      disconnectSocket();
      socketRef.current = null;
    };
  }, [booked, user]);

  const applyQuickDest = async (value) => {
    setDestStr(value);
    setRouteResult(null);
    const geo = await geocodePlaceFreeText(value);
    if (geo && mapRef.current) {
      mapRef.current.setView([geo.lat, geo.lng], 14);
      placeMarker('dest', value, geo.lat, geo.lng, 'Destination');
    }
  };

  // Haversine straight-line distance (meters), padded for road routing.
  const haversine = (a, b) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.max(600, 1.25 * 2 * R * Math.asin(Math.sqrt(h)));
  };

  const drawRoute = (coords) => {
    if (!mapRef.current) return;
    if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
    routeLineRef.current = L.polyline(coords, { color: '#0d5c3a', weight: 4 }).addTo(mapRef.current);
    const lats = coords.map((c) => c[0]);
    const lngs = coords.map((c) => c[1]);
    mapRef.current.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [40, 40] });
  };

  // ── Driver live marker + approaching line ────────────────────────────────
  const DRIVER_ICON = L.divIcon({
    className: 'driver-marker',
    html: '<div style="font-size:22px; line-height:1;">🚕</div>',
    iconSize: [24, 24], iconAnchor: [12, 12],
  });

  const updateDriverMarker = (lat, lng) => {
    if (!mapRef.current) return;
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([lat, lng]);
    } else {
      driverMarkerRef.current = L.marker([lat, lng], { icon: DRIVER_ICON }).addTo(mapRef.current);
      driverMarkerRef.current.bindPopup('Driver');
    }
  };

  const drawDriverLine = (fromLat, fromLng, toLat, toLng) => {
    if (!mapRef.current) return;
    if (driverRouteLineRef.current) mapRef.current.removeLayer(driverRouteLineRef.current);
    driverRouteLineRef.current = L.polyline(
      [[fromLat, fromLng], [toLat, toLng]],
      { color: '#1a73e8', weight: 3, dashArray: '6, 8', opacity: 0.8 }
    ).addTo(mapRef.current);
  };

  const calculateRoute = async () => {
    const a = await resolveCoord('start', startStr);
    const b = await resolveCoord('dest', destStr);
    if (!a || !b) {
      setRouteResult(null);
      setRouteError('Location not recognized. Pick a place from the suggestions, or tap "Use Current Location" for pickup.');
      return;
    }
    setRouteError('');
    setCalculating(true);
    try {
      // Backend OSRM proxy (driving profile — the trike follows roads) ->
      // real street route. Falls back to direct OSRM, then haversine estimate.
      let distance = null;
      let duration = null;
      let line = null;
      try {
        const routed = await fetchRoute(a, b);
        distance = routed.distanceM;
        duration = routed.durationS;
        line = routed.line;
      } catch { /* try direct OSRM */ }
      if (distance == null) {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
          const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (r.ok) {
            const d = await r.json();
            const route = d?.routes?.[0];
            if (route) {
              distance = route.distance;
              duration = route.duration;
              line = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            }
          }
        } catch { /* fall back to estimate */ }
      }
      if (distance == null) {
        distance = haversine(a, b);
        duration = ((distance / 1000) / 22) * 3600;
        line = [[a.lat, a.lng], [b.lat, b.lng]];
      }
      setRouteResult({ distance, duration });
      drawRoute(line);
    } finally {
      setCalculating(false);
    }
  };

  // ── Request a ride ──────────────────────────────────────
  // POSTs the booking to /api/rides so the driver console queue and the admin
  // ride log actually receive it. The server recomputes the fare authoritatively
  // (backend/lib/fares.js), so we only send distance, coordinates, and the
  // selected fare tier (regular / pwd / discounted — the statutory 20%
  // discount for PWD, student, and senior fares is applied server-side).
  const requestRide = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const a = await resolveCoord('start', startStr);
    const b = await resolveCoord('dest', destStr);
    if (!a || !b) {
      setBookError('Pick a valid pickup and drop-off point before requesting a ride.');
      return;
    }
    setBookError('');
    setBooking(true);
    try {
      // Reuse the routed distance when available, otherwise estimate it.
      const distance = Number.isFinite(routeResult?.distance) ? routeResult.distance : haversine(a, b);
      const data = await apiCreateRide({
        passenger_name: user.fullname || null,
        pickup_label: startStr,
        dropoff_label: destStr,
        pickup_coord: a,
        dropoff_coord: b,
        distance_m: Math.round(distance),
        ride_type: rideId,
      });
      setBooked(data.ride);
    } catch (err) {
      setBookError(err.message);
    } finally {
      setBooking(false);
    }
  };

  const selectedRide = RIDE_OPTIONS.find((r) => r.id === rideId) || RIDE_OPTIONS[0];

  // Per-tier fares from the routed distance. PWD and student/senior tiers apply
  // the mandatory 20% discount: ₱30.00 × 0.20 = ₱6.00 off → ₱24.00 to pay.
  const fares = useMemo(() => {
    if (!routeResult) return null;
    const km = routeResult.distance / 1000;
    const round = (n) => Math.round(n * 100) / 100;
    const regular = Math.max(FARE.minFloors.regular, BASE_FARE + PER_KM * km);
    const pwd = Math.max(FARE.minFloors.pwd, (1 - FARE.pwdDiscount) * (BASE_FARE + PER_KM * km));
    const discounted = Math.max(FARE.minFloors.discounted, (1 - FARE.studentDiscount) * (BASE_FARE + PER_KM * km));
    return { regular: round(regular), pwd: round(pwd), discounted: round(discounted) };
  }, [routeResult]);
  const computedFare = fares ? fares[rideId] : null;

  const fareLabel = computedFare == null ? '—' : formatPeso(computedFare);
  const etaLabel = routeResult ? fmtTime(routeResult.duration) : '—';

  return (
    <div className="w-full min-h-screen bg-surface text-on-surface pt-16 pb-24">
      <MobileHeader />
      <main className="w-full max-w-[1280px] mx-auto px-margin flex flex-col gap-space-md py-space-md">
        <div className="relative w-full rounded-xl overflow-hidden shadow-md bg-surface-container-low">
          <div id="mobile-map-container" className="w-full h-44 z-0" />
          <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-space-sm py-1 rounded-full shadow-sm flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
            <span className="text-label-sm text-primary tracking-wide uppercase">Live Route Nav</span>
          </div>
          <div className="absolute bottom-3 right-3 bg-primary text-on-primary px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
            <Icon name="schedule" size={18} />
            <span className="text-label-lg">{calculating ? '...' : etaLabel}</span>
          </div>
        </div>
        <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
          <Icon name="my_location" size={16} className="text-secondary" /> {gpsText}
        </p>

        <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center self-stretch py-1">
              <div className="w-3 h-3 rounded-full bg-secondary flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest" />
              </div>
              <div className="w-0.5 grow bg-outline-variant/60 my-1" />
              <div className="w-3 h-3 rounded-sm bg-primary flex items-center justify-center">
                <div className="w-1 h-1 bg-surface-container-lowest" />
              </div>
            </div>
            <div className="flex flex-col grow min-w-0 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-label-sm text-secondary uppercase font-bold tracking-wider">Pickup Point</span>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="flex items-center gap-1 text-label-sm text-primary font-bold hover:text-on-primary-container disabled:opacity-50"
                  >
                    <Icon name="my_location" size={14} />
                    {locating ? 'Locating…' : 'Use Current Location'}
                  </button>
                </div>
                <input
                  value={startStr}
                  onChange={(e) => { setActiveInput('start'); onStartChange(e.target.value); }}
                  onFocus={() => setActiveInput('start')}
                  placeholder="East Bajac-Bajac Public Plaza Terminal"
                  className="w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-label-md text-on-surface focus:outline-none"
                />
              </div>
              <div>
                <span className="text-label-sm text-outline uppercase font-bold tracking-wider">Drop-Off Destination</span>
                <input
                  value={destStr}
                  onChange={(e) => { setActiveInput('dest'); onDestChange(e.target.value); }}
                  onFocus={() => setActiveInput('dest')}
                  placeholder="Enter landmark or street address"
                  className="w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-label-md text-on-surface focus:outline-none"
                />
              </div>
            </div>
          </div>
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button type="button" key={`${s.name}-${s.lat?.toFixed?.(5)}-${i}`} onClick={() => chooseSuggestion(s)} className="suggestion-item w-full text-left">
                  <span className="font-semibold">{s.name}</span>
                  <span className="block text-body-sm text-on-surface-variant">{s.full}</span>
                </button>
              ))}
            </div>
          )}
          {searching && suggestions.length === 0 && (
            <p className="text-label-sm text-on-surface-variant">Searching places…</p>
          )}
          {routeError && (
            <p className="text-label-sm text-error bg-error-container/40 rounded-lg p-2 flex items-center gap-1">
              <Icon name="error" size={14} /> {routeError}
            </p>
          )}
          {/* The tricycle is the only ride — Drive/Walk/Bike mode chips removed */}
          <button
            type="button"
            onClick={calculateRoute}
            disabled={calculating || !startStr.trim() || !destStr.trim()}
            className="w-full h-11 rounded-lg bg-surface-container text-primary text-label-md font-bold disabled:opacity-60"
          >
            {calculating ? 'Calculating route…' : 'Calculate Route & Fare'}
          </button>
          {routeResult && (
            <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant">
                {fmtDist(routeResult.distance)} • {fmtTime(routeResult.duration)} • Trike
              </span>
              <span className="text-label-sm bg-primary-container text-on-primary px-2 py-0.5 rounded-full font-bold">{selectedRide.title}</span>
            </div>
          )}
        </div>

        <FareEstimator
          range={routeResult ? `${fareLabel} • ${fmtDist(routeResult.distance)}` : '—'}
          note={routeResult ? (rideId === 'regular' ? 'Computed from route distance' : '20% statutory discount applied') : 'Calculate a route to see the fare'}
        />

        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-on-surface">Select Tricycle Service</h2>
          </div>
          {RIDE_OPTIONS.map((r) => (
            <RideOptionCard
              key={r.id}
              id={r.id}
              icon={r.icon}
              title={r.title}
              badge={r.badge}
              badgeClass={r.badgeClass}
              desc={r.desc}
              fare={fares ? formatPeso(fares[r.id]) : '—'}
              strikeFare={fares && r.id !== 'regular' ? formatPeso(fares.regular) : undefined}
              active={rideId === r.id}
              onSelect={() => setRideId(r.id)}
            />
          ))}
        </div>

        <div className="w-full flex flex-col gap-2">
          {bookError && (
            <p className="text-label-sm text-error bg-error-container/40 rounded-lg p-2 flex items-center gap-1">
              <Icon name="error" size={14} /> {bookError}
            </p>
          )}
          {booked ? (
            <div className="w-full bg-tertiary-fixed/40 rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                {rideCompleted ? (
                  <span className="text-tertiary">✓</span>
                ) : driverAccepted && driverAvatar ? (
                  <img src={avatarUrl(driverAvatar)} alt={driverName || 'Driver'} className="w-full h-full object-cover" />
                ) : driverAccepted ? (
                  <div className="w-full h-full flex items-center justify-center text-label-sm font-bold text-on-surface">
                    {initialsOf(driverName || 'D')}
                  </div>
                ) : driverAccepted ? (
                  <Icon name="electric_rickshaw" size={16} />
                ) : (
                  <Icon name="check_circle" size={18} />
                )}
              </div>
              <div className="min-w-0 grow">
                <h5 className="text-label-md font-bold leading-tight">
                  {rideCompleted
                    ? `Ride #{booked.id} completed`
                    : driverAccepted
                      ? `Ride #{booked.id} accepted`
                      : `Ride #{booked.id} requested`}
                </h5>
                {driverAccepted && driverName && (
                  <p className="text-[11px] text-on-surface-variant leading-tight font-medium">
                    Driver: {driverName}
                  </p>
                )}
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  {booked.pickup} → {booked.dropoff} • {formatPeso(booked.fare)}
                </p>
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  {rideCompleted
                    ? 'Thank you for riding with Fairtrike.'
                    : driverAccepted
                      ? driverLocation
                        ? `Driver is on the way · ${Math.round(
                            haversine(
                              { lat: driverLocation.lat, lng: driverLocation.lng },
                              { lat: booked.pickupCoord.lat, lng: booked.pickupCoord.lng }
                            ) / 1000
                          )} km away`
                        : 'Driver is on the way'
                      : `Waiting for a driver to accept · Status: ${booked.status}`}
                </p>
                {driverAccepted && driverLocation && !rideCompleted && (
                  <p className="text-[10px] text-on-surface-variant leading-tight">
                    <span style={{ color: '#1a73e8', fontWeight: 600 }}>🚕</span>{' '}
                    Driver location is live on the map.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestRide}
              disabled={booking}
              className="w-full h-12 rounded-xl bg-primary text-on-primary text-label-lg font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              <Icon name="near_me" size={20} />
              {booking ? 'Requesting…' : 'Request Ride'}
            </button>
          )}
          <p className="text-[10px] text-on-surface-variant text-center">
            Fare is computed on the server from the route distance when the trip is dispatched.
          </p>
        </div>

        <div className="w-full bg-tertiary-fixed/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
            <Icon name="verified_user" size={18} />
          </div>
          <div className="min-w-0 grow">
            <h5 className="text-label-md text-primary font-bold leading-tight">Support &amp; assistance</h5>
            <p className="text-[11px] text-on-surface-variant leading-tight truncate">Emergency: call {EMERGENCY_TEL}</p>
          </div>
          <a href={`tel:${EMERGENCY_TEL}`} className="text-error bg-error-container/50 px-2 py-1 rounded-md text-label-sm font-bold flex items-center gap-0.5 shrink-0">
            <Icon name="emergency" size={14} /> SOS
          </a>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}

