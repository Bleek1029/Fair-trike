// ── Dynamic place search (no hardcoding) ──
// Live autocomplete + geocoding via backend proxy (/api/places)
// -> Photon (autocomplete) + Nominatim fallback, biased to the default area.
import { API_BASE, MAP_DEFAULT_CENTER, ROUTING_MODE } from '../config.js';

// Default map center used to bias searches (single source: config.js).
const OLONGAPO = { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] };

// Small in-memory cache so re-typing doesn't re-hit the network.
const searchCache = new Map();

// Cache for computed routes so the same pickup→dropoff doesn't re-hit the
// backend on every recalculation (key: "lat,lng|lat,lng:mode").
const routeCache = new Map();

// Request-ID guard: only the latest keystroke may update the dropdown.
let latestSearchId = 0;

export function clearPlaceCache() {
  searchCache.clear();
}

async function fetchJson(url, timeoutMs = 7000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/**
 * Autocomplete: "sm" -> [{ name, full, lat, lng, source }]
 * Always biased to the default area; client just renders.
 */
export async function searchPlaces(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  if (searchCache.has(key)) return searchCache.get(key);

  const myId = ++latestSearchId;
  try {
    const d = await fetchJson(`${API_BASE}/places/search?q=${encodeURIComponent(q)}`);
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
 * Resolve free text to coordinates by asking the server.
 * Used by Calculate Route so users don't need to pick a suggestion first.
 */
export async function geocodePlaceFreeText(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  try {
    const d = await fetchJson(`${API_BASE}/places/search?q=${encodeURIComponent(q)}`);
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
 * Uses ROUTING_MODE from config (default: 'cycling' for tricycles).
 * Results are cached by "lat,lng|lat,lng:mode" so repeat lookups for the same
 * ride don't re-hit the backend.
 */
export async function fetchRoute(a, b, mode = ROUTING_MODE) {
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
