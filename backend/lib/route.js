// ── Server-side route distance computation (OSRM + haversine fallback) ──────
// Single source of truth: the backend never trusts client-supplied distance.
// Used by POST /api/rides to authoritatively compute fare from the routed
// distance between pickup and dropoff coordinates.
import { badRequest } from './AppError.js';

const OSRM_URL = 'https://router.project-osrm.org/route/v1';
const UPSTREAM_TIMEOUT_MS = 8000;

// Olongapo City bounds (+ ~10km buffer for Subic / SBMA).
const MIN_LAT = 14.7, MAX_LAT = 14.95;
const MIN_LNG = 120.15, MAX_LNG = 120.45;

export function haversineMeters(latA, lngA, latB, lngB) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLon = toRad(lngB - lngA);
  const lat1 = toRad(latA);
  const lat2 = toRad(latB);
  const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(hav));
}

/**
 * Compute the routed distance (meters) and duration (seconds) between two
 * coordinates. Tries OSRM first; falls back to a padded haversine estimate.
 * Returns { distanceM, durationS, source } where source is 'osrm' or 'estimate'.
 * Throws badRequest for invalid / out-of-bounds / identical coordinates.
 */
export async function computeRouteDistance(fromLat, fromLng, toLat, toLng, mode = 'driving') {
  for (const lat of [fromLat, toLat]) {
    if (!Number.isFinite(lat) || lat < MIN_LAT || lat > MAX_LAT) {
      throw badRequest('Latitude out of bounds.');
    }
  }
  for (const lng of [fromLng, toLng]) {
    if (!Number.isFinite(lng) || lng < MIN_LNG || lng > MAX_LNG) {
      throw badRequest('Longitude out of bounds.');
    }
  }
  if (fromLat === toLat && fromLng === toLng) {
    throw badRequest('Origin and destination cannot be identical.');
  }

  try {
    const url = `${OSRM_URL}/${mode}/${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=false&geometries=geojson&steps=false`;
    const r = await fetch(url, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    const d = await r.json();
    const route = d?.routes?.[0];
    if (route) {
      return {
        distanceM: Math.round(route.distance),
        durationS: Math.round(route.duration),
        source: 'osrm',
      };
    }
  } catch { /* fall through to haversine estimate */ }

  const directM = haversineMeters(fromLat, fromLng, toLat, toLng);
  // Pad by 30% for road routing (tricycles often take smaller roads), minimum 600m.
  const distanceM = Math.max(600, Math.round(directM * 1.3));
  // Tricycle avg speed ~18 km/h in city traffic.
  const durationS = Math.round((distanceM / 1000) / 18 * 3600);
  return { distanceM, durationS, source: 'estimate' };
}
