import { Router } from 'express';
import { env } from '../config.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest, serviceUnavailable } from '../lib/AppError.js';
import { assertCoordPair } from '../lib/validation.js';

const router = Router();

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
const UPSTREAM_TIMEOUT_MS = 8000;

// ── POST /api/route/directions ─────────────────────────
// Proxies a driving route request to openrouteservice if an API key is
// configured. If no key is set, returns 400 so the client falls back to OSRM.
router.post('/directions', asyncHandler(async (req, res) => {
  const key = env.orsApiKey;
  if (!key) throw badRequest('ORS API key not configured.');

  const { coordinates } = req.body ?? {};
  if (!coordinates || coordinates.length !== 2) throw badRequest('Invalid coordinates.');
  for (const pair of coordinates) assertCoordPair(pair);

  let upstream;
  try {
    upstream = await fetch(ORS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: key },
      body: JSON.stringify({ coordinates }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw serviceUnavailable('Routing service unavailable.');
  }

  const data = await upstream.json();
  if (!upstream.ok) throw serviceUnavailable('Routing service error.');
  ok(res, data);
}));

export default router;