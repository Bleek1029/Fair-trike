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
// is blocked by CORS/adblock. mode: driving | walking | cycling.
router.get('/route', asyncHandler(async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);
  const mode = ['driving', 'walking', 'cycling'].includes(req.query.mode) ? req.query.mode : 'driving';
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return res.status(400).json({ success: false, message: 'Invalid coordinates.' });
  }
  const url =
    `https://router.project-osrm.org/route/v1/${mode}/${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=geojson&steps=false`;
  const r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  const d = await r.json();
  const route = d?.routes?.[0];
  if (!route) return res.status(502).json({ success: false, message: 'Routing service error.' });
  ok(res, {
    mode,
    distanceM: route.distance,
    durationS: route.duration,
    line: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  });
}));

export default router;
