// ── Dynamic place search: Geoapify (free tier, 5,000 req/day) ──
// Proxies Geoapify Places API for autocomplete + reverse geocoding so the
// frontend never hardcodes places or API hosts. OSRM (free, no key) still
// handles routing for fare/ETA calculation.
// Falls back to Photon + Nominatim when GEOAPIFY_API_KEY is not set.
import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest } from '../lib/AppError.js';
import { env } from '../config.js';

const router = Router();

// Olongapo City bounds: minLat,minLon,maxLat,maxLon (for results biasing)
const OLONGAPO_MIN = { lat: 14.79, lon: 120.25 };
const OLONGAPO_MAX = { lat: 14.88, lon: 120.33 };
const OLONGAPO_CENTER = { lat: 14.83, lon: 120.285 };
const UPSTREAM_TIMEOUT_MS = 7000;

const GEOAPIFY_BASE = 'https://api.geoapify.com/v1';

function inOlongapo(lat, lon) {
  return lat >= OLONGAPO_MIN.lat && lat <= OLONGAPO_MAX.lat
    && lon >= OLONGAPO_MIN.lon && lon <= OLONGAPO_MAX.lon;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function geoapifyHeaders() {
  const headers = { Accept: 'application/json' };
  return headers;
}

function geoapifyQueryParams(baseParams = {}) {
  const params = { ...baseParams };
  if (env.geoapifyApiKey) {
    params.apiKey = env.geoapifyApiKey;
  }
  return params;
}

function hasGeoapifyKey() {
  return Boolean(env.geoapifyApiKey);
}

// ── Geoapify place/autocomplete ──────────────────────────────────────────────
async function geoapifyAutocomplete(q, biasLat, biasLon) {
  if (!hasGeoapifyKey()) return [];
  // Geoapify circle filter format: lon,lat,radius (meters)
  const qs = new URLSearchParams(geoapifyQueryParams({
    text: q,
    format: 'json',
    limit: '10',
    filter: `circle:${biasLon.toFixed(6)},${biasLat.toFixed(6)},50000`,
    type: 'city,street,house,building,amenity,tourism',
  }));
  const url = `${GEOAPIFY_BASE}/place/autocomplete?${qs.toString()}`;
  const r = await fetch(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: geoapifyHeaders(),
  });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d?.features) ? d.features : [];
}

// ── Geoapify reverse geocode ─────────────────────────────────────────────────
async function geoapifyReverse(lat, lng) {
  if (!hasGeoapifyKey()) return null;
  const qs = new URLSearchParams(geoapifyQueryParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
  }));
  const url = `${GEOAPIFY_BASE}/geocode/reverse?${qs.toString()}`;
  const r = await fetch(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: geoapifyHeaders(),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const f = d?.features?.[0];
  const props = f?.properties || {};
  return props.formatted || props.city || null;
}

// ── Photon autocomplete fallback (no key) ────────────────────────────────────
async function photonAutocomplete(q, biasLat, biasLon) {
  const OLONGAPO_BBOX = '120.25,14.79,120.33,14.88';
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(`${q}, Olongapo City`)}` +
      `&bbox=${OLONGAPO_BBOX}&limit=10&lang=en&lat=${biasLat}&lon=${biasLon}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d?.features) ? d.features : [];
  } catch {
    return [];
  }
}

// ── Nominatim reverse geocode fallback (no key) ──────────────────────────────
async function nominatimReverse(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { Accept: 'application/json', 'User-Agent': 'FairTrike/1.0 (olingapo-trike-app)' },
      },
    );
    if (!r.ok) return null;
    const d = await r.json();
    const a = d.address || {};
    return d.display_name || [a.road, a.suburb || a.village, a.city || 'Olongapo City'].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

// ── Core search: Geoapify first, Photon fallback ─────────────────────────────
async function searchPlacesCore(q, userLat, userLng) {
  const hasUserLoc = Number.isFinite(userLat) && Number.isFinite(userLng);
  const biasLat = hasUserLoc ? userLat : OLONGAPO_CENTER.lat;
  const biasLon = hasUserLoc ? userLng : OLONGAPO_CENTER.lon;

  const out = [];
  const seen = new Set();
  const push = (name, full, lat, lng, source) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = `${name}|${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const r = { name, full, lat, lng, source };
    if (hasUserLoc) {
      r.distM = Math.round(haversineM(userLat, userLng, lat, lng));
    }
    out.push(r);
  };

  // 1. Try Geoapify (with key), else Photon.
  const features = hasGeoapifyKey()
    ? await geoapifyAutocomplete(q, biasLat, biasLon)
    : await photonAutocomplete(q, biasLat, biasLon);

  for (const f of features) {
    const props = f?.properties || {};
    const lat = Number(props.lat);
    const lng = Number(props.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = props.name || props.street || q;
    const full = props.formatted || props.name || props.street || q;
    push(name, full, lat, lng, hasGeoapifyKey() ? 'geoapify' : 'photon');
  }

  // 2. If we got very few results, try Nominatim as an extra fallback.
  if (!hasGeoapifyKey() && out.length < 6) {
    try {
      const OLONGAPO_VIEWBOX = '120.25,14.88,120.33,14.79';
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10` +
        `&countrycodes=ph&viewbox=${OLONGAPO_VIEWBOX}&bounded=1&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { Accept: 'application/json', 'User-Agent': 'FairTrike/1.0 (olingapo-trike-app)' },
      });
      if (r.ok) {
        const d = await r.json();
        for (const p of d || []) {
          const lat = Number(p.lat);
          const lng = Number(p.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          push(p.name || p.display_name?.split(',')[0] || q, p.display_name, lat, lng, 'nominatim');
        }
      }
    } catch { /* offline -> return what we have */ }
  }

  // Rank: inside Olongapo first, then by distance from user location (if known).
  out.sort((a, b) => {
    const aIn = inOlongapo(a.lat, a.lng);
    const bIn = inOlongapo(b.lat, b.lng);
    if (aIn !== bIn) return Number(bIn) - Number(aIn);
    if (hasUserLoc) return (a.distM ?? Infinity) - (b.distM ?? Infinity);
    return 0;
  });
  return out.slice(0, 8);
}

// ── GET /api/places/search?q=sm[&lat=..&lng=..] ──────────────────────────
// Returns { results: [{ name, full, lat, lng, source, distM? }] }
// Optional lat/lng biases results toward the user's location.
router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return ok(res, { results: [] });

  const userLat = Number(req.query.lat);
  const userLng = Number(req.query.lng);
  const results = await searchPlacesCore(q, userLat, userLng);
  ok(res, { results, userLocation: Number.isFinite(userLat) && Number.isFinite(userLng) });
}));

// ── GET /api/places/search/near?q=sm&lat=..&lng=.. ────────────────────────
// Location-biased search: requires user coordinates and ranks results purely
// by proximity.
router.get('/search/near', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return ok(res, { results: [] });

  const userLat = Number(req.query.lat);
  const userLng = Number(req.query.lng);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    throw badRequest('lat and lng are required.');
  }

  const results = await searchPlacesCore(q, userLat, userLng);
  results.sort((a, b) => (a.distM ?? Infinity) - (b.distM ?? Infinity));
  ok(res, { results, userLocation: true });
}));

// ── GET /api/places/reverse?lat=14.83&lng=120.28 ─────────
// Human-readable address for a GPS fix (used for "Use Current Location").
router.get('/reverse', asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng ?? req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ok(res, { label: 'Current Location' });

  const label = hasGeoapifyKey()
    ? await geoapifyReverse(lat, lng)
    : await nominatimReverse(lat, lng);
  ok(res, { label: label || 'Current Location' });
}));

// ── GET /api/places/route?fromLat=..&fromLng=..&toLat=..&toLng=..&mode=driving ──
// Server-side OSRM proxy so the app works even where router.project-osrm.org
// is blocked by CORS/adblock.
// mode: driving | walking | cycling   (default: driving — tricycles use roads)
// alternatives: 1 to return up to 3 alternative routes
// waypoints:   semicolon-separated "lat,lng;lat,lng" intermediate stops
router.get('/route', asyncHandler(async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);
  const mode = ['driving', 'walking', 'cycling'].includes(req.query.mode) ? req.query.mode : 'driving';
  const wantAlternatives = req.query.alternatives === '1';

  // Validate coordinates are finite
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    throw badRequest('Invalid coordinates.');
  }

  // Validate coordinates are within reasonable Olongapo bounds (with small buffer)
  // Olongapo City: ~14.79-14.88 lat, 120.25-120.33 lng
  // Allow ~10km buffer for nearby areas (Subic, SBMA, etc.)
  const MIN_LAT = 14.7, MAX_LAT = 14.95;
  const MIN_LNG = 120.15, MAX_LNG = 120.45;
  const latCoords = [fromLat, toLat];
  const lngCoords = [fromLng, toLng];

  for (const lat of latCoords) {
    if (lat < MIN_LAT || lat > MAX_LAT) {
      throw badRequest(`Latitude out of bounds (${MIN_LAT}–${MAX_LAT}).`);
    }
  }
  for (const lng of lngCoords) {
    if (lng < MIN_LNG || lng > MAX_LNG) {
      throw badRequest(`Longitude out of bounds (${MIN_LNG}–${MAX_LNG}).`);
    }
  }

  // Prevent zero-distance routes
  if (fromLat === toLat && fromLng === toLng) {
    throw badRequest('Origin and destination cannot be identical.');
  }

  // Build the OSRM coordinate string: from;waypoint1;waypoint2;...;to
  let coords = `${fromLng},${fromLat}`;
  const waypoints = [];
  if (req.query.waypoints) {
    for (const wp of String(req.query.waypoints).split(';')) {
      const [wLat, wLng] = wp.split(',').map(Number);
      if (Number.isFinite(wLat) && Number.isFinite(wLng)) {
        waypoints.push({ lat: wLat, lng: wLng });
        coords += `;${wLng},${wLat}`;
      }
    }
  }
  coords += `;${toLng},${toLat}`;

  const qs = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
    ...(wantAlternatives ? { alternatives: 'true' } : {}),
  });
  const url = `https://router.project-osrm.org/route/v1/${mode}/${coords}?${qs.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  const d = await r.json();

  const buildRoute = (route) => ({
    distanceM: route.distance,
    durationS: route.duration,
    line: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    weight: route.weight,
  });

  const routes = (d?.routes || []).map(buildRoute);
  if (routes.length === 0) {
    // Fallback: return direct distance with 30% padding for tricycle road routing
    const haversine = (locA, locB) => {
      const R = 6371000;
      const toRad = (x) => (x * Math.PI) / 180;
      const dLat = toRad(locB.lat - locA.lat);
      const dLon = toRad(locB.lng - locA.lng);
      const lat1 = toRad(locA.lat);
      const lat2 = toRad(locB.lat);
      const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(hav));
    };
    const directM = haversine({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
    const distanceM = Math.max(600, Math.round(directM * 1.3));
    const durationS = Math.round((distanceM / 1000) / 18 * 3600); // 18 km/h avg tricycle speed
    return res.json({
      mode,
      distanceM,
      durationS,
      line: [[fromLat, fromLng], [toLat, toLng]],
      alternatives: [],
    });
  }

  ok(res, {
    mode,
    waypoints,
    distanceM: routes[0].distanceM,
    durationS: routes[0].durationS,
    line: routes[0].line,
    alternatives: routes.slice(1),
  });
}));

export default router;
