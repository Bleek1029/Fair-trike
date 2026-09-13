import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';

const router = Router();

// Center of Olongapo City — used if every geolocation source fails.
const OLONGAPO = { lat: 14.832, lon: 120.28 };
const SOURCES = [
  'https://ipapi.co/json/',
  'http://ip-api.com/json/',
  'https://ipwho.is/json',
];
const UPSTREAM_TIMEOUT_MS = 6000;

// ── GET /api/geo/ip ─────────────────────────────────────
// Resolves the caller's public IP to approximate coordinates using a free,
// keyless service. Routed through the backend to avoid browser CORS errors.
router.get('/ip', asyncHandler(async (_req, res) => {
  for (const url of SOURCES) {
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) continue;
      const d = await r.json();

      const lat = Number(d.latitude ?? d.lat);
      const lon = Number(d.longitude ?? d.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
        return ok(res, { lat, lon, source: url.split('//')[1].split('/')[0] });
      }
    } catch {
      // try the next source
    }
  }
  ok(res, { lat: OLONGAPO.lat, lon: OLONGAPO.lon, source: 'fallback' });
}));

export default router;