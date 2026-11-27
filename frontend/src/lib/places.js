// ── Dynamic place search (no hardcoding) ──
// Live autocomplete + geocoding via backend proxy (/api/places)
// -> Geoapify Places API, biased to the user's location / Olongapo area.
// Falls back to Photon + Nominatim when GEOAPIFY_API_KEY is unset.
// Supports location-biased search when the user's GPS fix is available.
import { API_BASE, MAP_DEFAULT_CENTER } from '../config.js';

// Default map center used to bias searches (single source: config.js).
const OLONGAPO = { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] };

// Small in-memory cache so re-typing doesn't re-hit the network.
// Key: "${query}|${lat}|${lng}" when location-aware, else just the query.
const searchCache = new Map();

// Cache for computed routes so the same pickup→dropoff doesn't re-hit the
// backend on every recalculation (key: "lat,lng|lat,lng:mode").
const routeCache = new Map();

// Request-ID guard: only the latest keystroke may update the dropdown.
let latestSearchId = 0;

export function clearPlaceCache() {
  searchCache.clear();
}

// Last-known user location (set from MapApp when GPS fix arrives).
export let userLocation = { lat: OLONGAPO.lat, lng: OLONGAPO.lng };

export function setUserLocation(lat, lng) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    userLocation = { lat, lng };
  }
}

async function fetchJson(url, timeoutMs = 7000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/**
 * Autocomplete: "sm" -> [{ name, full, lat, lng, source, distM? }]
 * Optionally biased to userLocation. Always biased to the default area;
 * client just renders.
 */
export async function searchPlaces(query, { useLocation = true } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const lat = useLocation ? userLocation.lat : OLONGAPO.lat;
  const lng = useLocation ? userLocation.lng : OLONGAPO.lng;
  const key = `${q.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
  if (searchCache.has(key)) return searchCache.get(key);

  const myId = ++latestSearchId;
  try {
    const qs = new URLSearchParams({ q, lat: String(lat), lng: String(lng) });
    const d = await fetchJson(`${API_BASE}/places/search?${qs.toString()}`);
    const results = Array.isArray(d?.results) ? d.results : [];
    searchCache.set(key, results);
    // Stale response (user kept typing) -> drop it.
    if (myId !== latestSearchId) return [];
    return results;
  } catch {
    return [];
  }
}

/**
 * Location-biased autocomplete: explicitly passes user coordinates to the
 * /search/near endpoint so results are ranked by proximity.
 */
export async function searchPlacesNear(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const { lat, lng } = userLocation;
  const key = `near|${q.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
  if (searchCache.has(key)) return searchCache.get(key);

  const myId = ++latestSearchId;
  try {
    const qs = new URLSearchParams({ q, lat: String(lat), lng: String(lng) });
    const d = await fetchJson(`${API_BASE}/places/search/near?${qs.toString()}`);
    const results = Array.isArray(d?.results) ? d.results : [];
    searchCache.set(key, results);
    if (myId !== latestSearchId) return [];
    return results;
  } catch {
    // Fall back to regular search if the near endpoint fails.
    return searchPlaces(q);
  }
}

/**
 * Resolve free text to coordinates by asking the server.
 * Used by Calculate Route so users don't need to pick a suggestion first.
 */
export async function geocodePlaceFreeText(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  try {
    const { lat, lng } = userLocation;
    const qs = new URLSearchParams({ q, lat: String(lat), lng: String(lng) });
    const d = await fetchJson(`${API_BASE}/places/search?${qs.toString()}`);
    const hit = d?.results?.[0];
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
      return { lat: hit.lat, lng: hit.lng, label: hit.name };
    }
  } catch { /* offline */ }
  return null;
}

/**
 * Human-readable label for a GPS fix ("Use Current Location").
 */
export async function reverseGeocode(lat, lng) {
  try {
    const d = await fetchJson(`${API_BASE}/places/reverse?lat=${lat}&lng=${lng}`);
    return d?.label || 'Current Location';
  } catch {
    return 'Current Location';
  }
}

/**
 * Routed distance/duration/line via backend OSRM proxy.
 * Uses ROUTING_MODE from config (default: 'driving' for tricycles).
 * Results are cached by "lat,lng|lat,lng:mode" so repeat lookups for the same
 * ride don't re-hit the backend.
 */
export async function fetchRoute(a, b, mode = 'driving') {
  const key = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}|${b.lat.toFixed(5)},${b.lng.toFixed(5)}:${mode}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  const qs = new URLSearchParams({
    fromLat: String(a.lat),
    fromLng: String(a.lng),
    toLat: String(b.lat),
    toLng: String(b.lng),
    mode,
  });
  const d = await fetchJson(`${API_BASE}/places/route?${qs.toString()}`, 9000);
  const result = { distanceM: d.distanceM, durationS: d.durationS, line: d.line };
  routeCache.set(key, result);
  return result;
}

export { OLONGAPO };
