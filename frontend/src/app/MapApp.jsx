import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { useAuth } from '../auth/AuthContext.jsx';
import { LOCATIONS, STATIC_COORDS } from '../data/locations.js';
import { MobileHeader } from '../components/MobileHeader.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Icon } from '../components/Icon.jsx';
import { QuickDestButton } from '../components/QuickDestButton.jsx';
import { RideOptionCard } from '../components/RideOptionCard.jsx';
import { DriverProximityCard } from '../components/DriverProximityCard.jsx';
import { PaymentToggle } from '../components/PaymentToggle.jsx';
import { FareEstimator } from '../components/FareEstimator.jsx';
import { FARE, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, SEARCH_DEBOUNCE_MS } from '../config.js';
import { initialsOf } from '../lib/utils.js';
import { fmtDist, fmtTime, formatPeso } from '../lib/format.js';

const BASE_FARE = FARE.base;
const PER_KM = FARE.perKm;

export function getInitials(fullname) {
  return initialsOf(fullname);
}

function geocodeQuery(q) {
  const key = (q || '').trim().toLowerCase();
  if (!key) return null;
  if (STATIC_COORDS[key]) {
    const [lat, lng] = STATIC_COORDS[key];
    return { lat, lng };
  }
  const hit = LOCATIONS.find((l) => l.name.toLowerCase() === key || l.full.toLowerCase() === key);
  if (hit) {
    const ck = hit.name.toLowerCase();
    if (STATIC_COORDS[ck]) {
      const [lat, lng] = STATIC_COORDS[ck];
      return { lat, lng };
    }
  }
  return null;
}

const QUICK_DESTS = [
  { icon: 'home', label: 'Home', sub: 'Gordon Hts. Phase 1', distance: '3.2 km', value: 'Gordon Heights, Olongapo City' },
  { icon: 'business_center', label: 'Work', sub: 'SBMA Main Gate', distance: '1.8 km', value: 'SBMA Main Gate, Rizal Ave' },
  { icon: 'shopping_bag', label: 'SM Central', sub: 'Magsaysay Dr.', distance: '1.1 km', value: 'SM City Olongapo Central, Magsaysay Dr.' },
  { icon: 'storefront', label: 'Public Market', sub: 'Bajac-Bajac Hub', distance: '0.6 km', value: 'Olongapo City Public Market, Bajac-Bajac' },
];

const RIDE_OPTIONS = [
  {
    id: 'regular', icon: 'electric_rickshaw', title: 'Standard Regular', badge: 'BEST VALUE',
    badgeClass: 'bg-primary text-on-primary', desc: 'Shared/Direct municipal loop',
    meta: '2-3 mins away • Cap: 3 Pax', fare: 45.0, fareNote: 'Fixed Matrix',
  },
  {
    id: 'special', icon: 'bolt', title: 'TODA Special Express', badge: 'SOLO DIRECT',
    badgeClass: 'bg-secondary-container text-on-secondary-container', desc: 'Point-to-point non-stop dispatch',
    meta: '1 min pickup • Full Sidecar', fare: 65.0, fareNote: 'Express Rate',
  },
  {
    id: 'discounted', icon: 'school', title: 'Student / Senior Pass', badge: '20% OFF',
    badgeClass: 'bg-surface-container-high text-primary', desc: 'Validated via PhilSys ID / OSCA',
    meta: 'Pre-verified • Single Fare', fare: 36.0, strikeFare: '₱45.00',
  },
];

export function MapApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const mapRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const initialPickup = location.state?.pickup || 'East Bajac-Bajac Public Plaza Terminal';
  const initialDest = location.state?.destination || '';

  const [startStr, setStartStr] = useState(initialPickup);
  const [destStr, setDestStr] = useState(initialDest);
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null);
  const [gpsText, setGpsText] = useState('Acquiring GPS...');
  const [routeResult, setRouteResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [rideId, setRideId] = useState('regular');
  const [payMethod, setPayMethod] = useState('wallet');
  const [dispatchState, setDispatchState] = useState('idle');

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
        () => setGpsText('GPS not available • Using Olongapo City center'),
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

  const searchSuggestions = (value) => {
    const q = (value || '').trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); return; }
    const hits = LOCATIONS.filter((l) => l.name.toLowerCase().includes(q) || l.full.toLowerCase().includes(q));
    setSuggestions(hits.slice(0, 6));
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
    if (which === 'start') setStartStr(name); else setDestStr(name);
    setSuggestions([]);
    setActiveInput(null);
  };

  const chooseSuggestion = (s) => {
    const geo = geocodeQuery(s.name) || geocodeQuery(s.full);
    if (!geo || !mapRef.current) {
      if (activeInput === 'start') setStartStr(s.name); else setDestStr(s.name);
      setSuggestions([]); setActiveInput(null); return;
    }
    mapRef.current.setView([geo.lat, geo.lng], 14);
    if (activeInput === 'start') placeMarker('start', s.name, geo.lat, geo.lng, 'Start');
    else placeMarker('dest', s.name, geo.lat, geo.lng, 'Destination');
  };

  const applyQuickDest = (value) => {
    setDestStr(value);
    setRouteResult(null);
    const geo = geocodeQuery(value);
    if (geo && mapRef.current) {
      mapRef.current.setView([geo.lat, geo.lng], 14);
      placeMarker('dest', value, geo.lat, geo.lng, 'Destination');
    }
  };

  const calculateRoute = () => {
    const a = geocodeQuery(startStr);
    const b = geocodeQuery(destStr);
    if (!a || !b) { setRouteResult(null); return; }
    setCalculating(true);
    setTimeout(() => {
      const toRad = (d) => (d * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      const dist = Math.max(600, 1.25 * 2 * R * Math.asin(Math.sqrt(h)));
      const duration = ((dist / 1000) / 22) * 3600;
      setRouteResult({ distance: dist, duration });
      setCalculating(false);
      if (mapRef.current) {
        if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: '#0d5c3a', weight: 4 }).addTo(mapRef.current);
        mapRef.current.fitBounds([[a.lat, a.lng], [b.lat, b.lng]], { padding: [40, 40] });
      }
    }, 450);
  };

  const selectedRide = RIDE_OPTIONS.find((r) => r.id === rideId) || RIDE_OPTIONS[0];
  const computedFare = useMemo(() => {
    if (!routeResult) return selectedRide.fare;
    const km = routeResult.distance / 1000;
    if (rideId === 'special') return Math.max(FARE.minFloors.special, BASE_FARE + PER_KM * km + FARE.specialSurcharge);
    if (rideId === 'discounted') return Math.max(FARE.minFloors.discounted, (1 - FARE.studentDiscount) * (BASE_FARE + PER_KM * km));
    return Math.max(FARE.minFloors.regular, BASE_FARE + PER_KM * km);
  }, [routeResult, rideId, selectedRide.fare]);

  const fareLabel = formatPeso(computedFare);
  const etaLabel = routeResult ? fmtTime(routeResult.duration) : '12 mins';

  const confirmRide = () => {
    if (!destStr.trim() || dispatchState !== 'idle') return;
    setDispatchState('dispatching');
    setTimeout(() => {
      setDispatchState('enroute');
      setTimeout(() => setDispatchState('idle'), 3500);
    }, 1200);
  };

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
                <span className="text-label-sm text-secondary uppercase font-bold tracking-wider">Pickup Point</span>
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
              {suggestions.map((s) => (
                <button type="button" key={s.name} onClick={() => chooseSuggestion(s)} className="suggestion-item w-full text-left">
                  <span className="font-semibold">{s.name}</span>
                  <span className="block text-body-sm text-on-surface-variant">{s.full}</span>
                </button>
              ))}
            </div>
          )}
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
                {fmtDist(routeResult.distance)} • {fmtTime(routeResult.duration)} via Rizal Ave &amp; Magsaysay Dr
              </span>
              <span className="text-label-sm bg-primary-container text-on-primary px-2 py-0.5 rounded-full font-bold">Standard TODA</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-sm text-on-surface">Frequent Stops</h3>
            <span className="text-label-md text-secondary">Tap to pick</span>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            {QUICK_DESTS.map((d) => (
              <QuickDestButton key={d.label} icon={d.icon} label={d.label} sub={d.sub} distance={d.distance} onSelect={() => applyQuickDest(d.value)} />
            ))}
          </div>
        </div>

        <FareEstimator
          range={routeResult ? `${fareLabel} • ${fmtDist(routeResult.distance)}` : '₱15.00 - ₱45.00'}
          note={routeResult ? 'Computed municipal rate' : 'Strict Metered Rate'}
        />

        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-on-surface">Select Tricycle Service</h2>
            <span className="text-label-sm text-secondary font-bold uppercase tracking-wider">LGU Regulated Fares</span>
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
              meta={<span>{r.meta}</span>}
              fare={r.id === rideId ? fareLabel : `₱${r.fare.toFixed(2)}`}
              strikeFare={r.strikeFare}
              fareNote={r.fareNote}
              active={rideId === r.id}
              onSelect={() => setRideId(r.id)}
            />
          ))}
        </div>

        <DriverProximityCard
          name="Kuya Renato Diaz"
          toda="Yellow Line TODA"
          trike="#241"
          rating="4.9"
          distance="180m away"
          trips="1,240 Verified Trips"
          certified="LGU Health Certified"
          onCall={() => { window.location.href = 'tel:911'; }}
          onChat={() => navigate('/driver-info')}
        />

        <PaymentToggle
          method={payMethod}
          balance="₱350.00"
          onToggle={() => setPayMethod((m) => (m === 'wallet' ? 'gcash' : 'wallet'))}
        />

        <div className="w-full bg-tertiary-fixed/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
            <Icon name="verified_user" size={18} />
          </div>
          <div className="min-w-0 grow">
            <h5 className="text-label-md text-primary font-bold leading-tight">Audited TODA Franchise Protected</h5>
            <p className="text-[11px] text-on-surface-variant leading-tight truncate">Direct PNP 911 SOS Integrated • Fair Fare Guarantee</p>
          </div>
          <a href="tel:911" className="text-error bg-error-container/50 px-2 py-1 rounded-md text-label-sm font-bold flex items-center gap-0.5 shrink-0">
            <Icon name="emergency" size={14} /> SOS
          </a>
        </div>

        <div className="w-full pt-1 pb-2">
          <button
            type="button"
            onClick={confirmRide}
            disabled={!destStr.trim() || dispatchState === 'dispatching'}
            className={`w-full h-14 rounded-xl text-on-primary text-label-lg shadow-md flex items-center justify-between px-space-lg transition-all active:scale-[0.98] ${
              dispatchState === 'enroute' ? 'bg-secondary' : 'bg-primary-container hover:bg-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={dispatchState === 'enroute' ? 'check' : 'hail'} size={24} />
              <span className="text-headline-sm text-on-primary">
                {dispatchState === 'dispatching' ? 'Dispatching Kuya Renato...' : dispatchState === 'enroute' ? 'Trike En Route (#241)' : 'Confirm & Call Tricycle'}
              </span>
            </div>
            <span className="bg-primary px-3 py-1.5 rounded-lg text-headline-sm text-on-primary font-bold shadow-inner">{fareLabel}</span>
          </button>
          <p className="text-label-sm text-center text-outline mt-2">Cashless fare automatically deducted upon trip completion</p>
          {user && (
            <p className="text-body-sm text-center text-on-surface-variant mt-1">Booking as {user.fullname} • {user.email}</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

