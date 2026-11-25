// ── Frontend app constants & configuration ──

// Fare policy (PHP). Single source of truth for the fare engine.
// Philippine law: students, senior citizens, and PWDs get a mandatory
// 20% discount on regular tricycle fares — ₱30.00 × 0.20 = ₱6.00 off → ₱24.00.
export const FARE = {
  base: 30.0,                 // ₱ standard fare (flag-down) — ₱30.00
  pwdDiscount: 0.2,           // 20% statutory PWD discount (₱30.00 → ₱24.00)
  studentDiscount: 0.2,       // 20% statutory student/senior discount
  minFloors: { regular: 30.0, pwd: 24.0, discounted: 24.0 },
};

// Default map center used when no live GPS fix is available.
export const MAP_DEFAULT_CENTER = [14.830, 120.285];
export const MAP_DEFAULT_ZOOM = 13;

// Search debounce (ms).
export const SEARCH_DEBOUNCE_MS = 350;

// Contact + emergency.
export const EMERGENCY_TEL = '911';

// ── API base path ──
// Browser builds stay network-relative so /api works everywhere it already did:
// the Vite dev proxy, the Node server that serves this bundle, the Vercel
// rewrite (vercel.json), and LAN access.
//
// `import.meta.env` is undefined outside Vite (e.g. `node --test`), hence the guard.
const viteEnv = import.meta.env || {};

export const API_BASE = viteEnv.VITE_API_URL || '/api';

// Profile pictures are served by the backend too (/uploads/<file>).
export const UPLOADS_BASE = '/uploads';

// Routing mode: 'driving' | 'cycling' | 'walking'
// 'cycling' often better for tricycles (smaller vehicles, narrower roads)
export const ROUTING_MODE = 'cycling';