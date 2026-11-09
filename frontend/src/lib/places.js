// ── Dynamic place search (no hardcoding) ──
// Live autocomplete + geocoding via backend proxy (/api/places)
// -> Photon (autocomplete) + Nominatim fallback, biased to the default area.
import { API_BASE, MAP_DEFAULT_CENTER } from '../config.js';

// Default map center used to bias searches (single source: config.js).
const OLONGAPO = { lat: MAP_DEFAULT_CENTER[0], lng: MAP_DEFAULT_CENTER[1] };

// Small in-memory cache so re-typing doesn't re-hit the network.
const searchCache = new Map();

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
 * mode: 'driving' | 'walking' | 'cycling'
 */
export async function fetchRoute(a, b, mode = 'driving') {
  const qs = new URLSearchParams({
    fromLat: String(a.lat),
    fromLng: String(a.lng),
    toLat: String(b.lat),
    toLng: String(b.lng),
    mode,
  });
  const d = await fetchJson(`${API_BASE}/places/route?${qs.toString()}`, 9000);
  return { distanceM: d.distanceM, durationS: d.durationS, line: d.line };
}

export { OLONGAPO };
