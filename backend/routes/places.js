// ── Dynamic place search: free, no API key, no hardcoding ──
// Proxies Photon (autocomplete) + Nominatim (fallback) biased to Olongapo City,
// and OSRM routing so the frontend never hardcodes places or API hosts.
import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';

const router = Router();

// Olongapo City bbox: minLon,minLat,maxLon,maxLat
const OLONGAPO_BBOX = '120.25,14.79,120.33,14.88';
const OLONGAPO_VIEWBOX = '120.25,14.88,120.33,14.79'; // left,top,right,bottom for Nominatim
const OLONGAPO_CENTER = { lat: 14.83, lon: 120.285 };
const UPSTREAM_TIMEOUT_MS = 7000;

function inOlongapo(lat, lon) {
  return lat >= 14.79 && lat <= 14.88 && lon >= 120.25 && lon <= 120.33;
}

function photonLabel(p = {}) {
  const parts = [p.name || p.street, p.district || p.suburb, p.city || 'Olongapo City'].filter(Boolean);
  return parts.join(', ');
}

// ── GET /api/places/search?q=sm ──────────────────────────
// Returns { results: [{ name, full, lat, lng, source }] }
router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return ok(res, { results: [] });

  const out = [];
  const seen = new Set();
  const push = (r) => {
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return;
    const key = `${r.name}|${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  };

  // 1. Photon — built for autocomplete, CORS-open, no key.
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(`${q}, Olongapo City`)}` +
      `&bbox=${OLONGAPO_BBOX}&limit=8&lang=en&lat=${OLONGAPO_CENTER.lat}&lon=${OLONGAPO_CENTER.lon}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (r.ok) {
      const d = await r.json();
      for (const f of d?.features || []) {
        const c = f?.geometry?.coordinates;
        if (!c) continue;
        const lng = Number(c[0]);
        const lat = Number(c[1]);
        const name = f.properties?.name || f.properties?.street || f.properties?.district || q;
        push({ name, full: photonLabel(f.properties), lat, lng, source: 'photon' });
      }
    }
  } catch { /* fall through to Nominatim */ }

  // 2. Nominatim fallback — strict Olongapo-bounded search.
  if (out.length < 6) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8` +
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
          push({ name: p.name || p.display_name?.split(',')[0] || q, full: p.display_name, lat, lng, source: 'nominatim' });
        }
      }
    } catch { /* offline -> return what we have */ }
  }

  // Prefer results inside the bbox, but don't drop valid nearby (e.g. Harbor Point / SBMA).
  out.sort((a, b) => Number(inOlongapo(b.lat, b.lng)) - Number(inOlongapo(a.lat, a.lng)));
  ok(res, { results: out.slice(0, 8) });
}));

// ── GET /api/places/reverse?lat=14.83&lng=120.28 ─────────
// Human-readable address for a GPS fix (used for "Use Current Location").
router.get('/reverse', asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng ?? req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ok(res, { label: 'Current Location' });
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { Accept: 'application/json', 'User-Agent': 'FairTrike/1.0 (olingapo-trike-app)' },
      },
    );
    if (r.ok) {
      const d = await r.json();
      const a = d.address || {};
      const label = d.display_name || [a.road, a.suburb || a.village, a.city || 'Olongapo City'].filter(Boolean).join(', ');
      return ok(res, { label: label || 'Current Location', raw: d });
    }
  } catch { /* offline */ }
  ok(res, { label: 'Current Location' });
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
    return res.status(400).json({ success: false, message: 'Invalid coordinates.' });
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
      return res.status(400).json({ success: false, message: `Latitude out of bounds (${MIN_LAT}–${MAX_LAT}).` });
    }
  }
  for (const lng of lngCoords) {
    if (lng < MIN_LNG || lng > MAX_LNG) {
      return res.status(400).json({ success: false, message: `Longitude out of bounds (${MIN_LNG}–${MAX_LNG}).` });
    }
  }

  // Prevent zero-distance routes
  if (fromLat === toLat && fromLng === toLng) {
    return res.status(400).json({ success: false, message: 'Origin and destination cannot be identical.' });
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
