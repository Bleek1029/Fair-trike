// ── Frontend app constants & configuration ──
import { isNativeApp, DEFAULT_NATIVE_API_ORIGIN } from './lib/native.js';

// Fare policy (PHP). Single source of truth for the fare engine.
// Philippine law: students, senior citizens, and PWDs get a mandatory
// 20% discount on regular tricycle fares — ₱30.00 × 0.20 = ₱6.00 off → ₱24.00.
export const FARE = {
  base: 30.0,                 // ₱ standard fare (flag-down) — ₱30.00
  perKm: 3.0,                 // ₱ per succeeding km
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
// Native Capacitor builds can't use a relative path — the WebView serves the
// bundle from its own origin (https://localhost), so /api would resolve to the
// asset loader. They target a real backend origin instead (see lib/native.js),
// overridable with VITE_NATIVE_API_ORIGIN at build time.
//
// `import.meta.env` is undefined outside Vite (e.g. `node --test`), hence the guard.
const viteEnv = import.meta.env || {};

const nativeApiOrigin = (viteEnv.VITE_NATIVE_API_ORIGIN || DEFAULT_NATIVE_API_ORIGIN)
  .trim()
  .replace(/\/+$/, '');

export const IS_NATIVE_APP = isNativeApp();

// Origin of the backend when running natively — '' in the browser, where every
// URL is relative to whatever server handed out the bundle.
export const API_ORIGIN = IS_NATIVE_APP ? nativeApiOrigin : '';

export const API_BASE = viteEnv.VITE_API_URL || (IS_NATIVE_APP ? `${API_ORIGIN}/api` : '/api');

// Profile pictures are served by the backend too (/uploads/<file>).
export const UPLOADS_BASE = IS_NATIVE_APP ? `${API_ORIGIN}/uploads` : '/uploads';