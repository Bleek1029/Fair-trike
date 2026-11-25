// ── Frontend app constants & configuration ──

// Fare policy (PHP). Single source of truth for the fare engine.
//
// Tariff scenarios:
//   • Terminal / Queue (Pila): ₱30.00 flag-down base fare.
//   • Street Hail: ₱20.00–₱25.00 base fare.
//   • Additional passenger: +₱10.00 regular / +₱8.00 discounted per extra head.
//   • Cross-zone / Out-of-route: ₱40.00+ surcharge.
//   • Statutory 20% discount: Students, PWDs, Senior Citizens.
//
export const FARE = {
  base: {
    terminal: 30.0, // Terminal / Queue (Pila) — flag-down at official TODA line
    street: 20.0,   // Street Hail — default base when flagging down in-zone
  },
  streetBaseRange: { min: 20.0, max: 25.0 },
  perKm: 3.0,                            // ₱ per succeeding kilometre
  discounts: {
    pwd: 0.2,                            // 20% statutory — Persons with Disabilities
    discounted: 0.2,                     // 20% statutory — students / senior citizens
  },
  extraPassenger: {
    regular: 10.0,                       // +₱10 per extra head (regular)
    discounted: 8.0,                     // +₱8 per extra head (20% off ₱10)
  },
  crossZoneSurcharge: 40.0,              // ₱40+ cross-zone / out-of-route surcharge
};

// Minimum floor for a given base fare + tier.
export function minFloor(baseFare, rideType = 'regular') {
  const type = String(rideType ?? 'regular').trim().toLowerCase();
  const discount = FARE.discounts[type] || 0;
  return baseFare * (1 - discount);
}

export const RIDE_TYPES = ['regular', 'pwd', 'discounted'];
export const BOARDING_CONTEXTS = ['terminal', 'street'];

export function normalizeRideType(value) {
  const type = String(value ?? 'regular').trim().toLowerCase();
  return RIDE_TYPES.includes(type) ? type : 'regular';
}

export function normalizeBoardingContext(value) {
  const ctx = String(value ?? 'terminal').trim().toLowerCase();
  return BOARDING_CONTEXTS.includes(ctx) ? ctx : 'terminal';
}

// Compute the fare for a ride (mirrors backend/lib/fares.js).
//
//   distanceMeters   – route distance in metres
//   rideType         – 'regular' | 'pwd' | 'discounted'
//   boardingContext  – 'terminal' | 'street'
//   streetBase       – specific street-hail base (₱20–₱25), defaults to ₱20
//   extraPassengers  – number of additional passengers beyond the first
//   crossZone        – whether the trip crosses into a different color zone
//
export function computeFare({
  distanceMeters,
  rideType = 'regular',
  boardingContext = 'terminal',
  streetBase = null,
  extraPassengers = 0,
  crossZone = false,
} = {}) {
  const type = normalizeRideType(rideType);
  const ctx = normalizeBoardingContext(boardingContext);
  const isDiscounted = type !== 'regular';
  const discountRate = FARE.discounts[type] || 0;

  // ── Base (flag-down) fare by boarding context ──
  let baseFare;
  if (ctx === 'street') {
    baseFare = Number.isFinite(streetBase) ? Number(streetBase) : FARE.base.street;
    baseFare = Math.min(Math.max(baseFare, FARE.streetBaseRange.min), FARE.streetBaseRange.max);
  } else {
    baseFare = FARE.base.terminal;
  }

  // ── Distance fare: base + per-km ──
  const km = Math.max(0, distanceMeters / 1000);
  const distanceFare = baseFare + FARE.perKm * km;

  // ── Additional passenger surcharge ──
  const extraPerHead = isDiscounted ? FARE.extraPassenger.discounted : FARE.extraPassenger.regular;
  const extraFare = Math.max(0, Math.floor(extraPassengers)) * extraPerHead;

  // ── Cross-zone / out-of-route surcharge ──
  const crossZoneFare = crossZone ? FARE.crossZoneSurcharge : 0;

  // ── Apply statutory 20% discount to base+distance and cross-zone ──
  // Extra-passenger charge is already the discounted rate (₱8 vs ₱10), so it
  // is added after discounting and is not discounted again.
  let fare;
  if (isDiscounted) {
    fare = baseDistanceFare * (1 - discountRate) + extraFare + crossZoneFare * (1 - discountRate);
  } else {
    fare = baseDistanceFare + extraFare + crossZoneFare;
  }

  // ── Minimum floor: base fare (discounted for discounted tiers) ──
  return Math.round(Math.max(minFloor(baseFare, type), fare) * 100) / 100;
}

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