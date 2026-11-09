// Server-side fare policy (PHP) — single source of truth for pricing on the API.
export const FARE = {
  base: 30.0,                 // ₱ standard fare (flag-down) — ₱30.00
  perKm: 3.0,                 // ₱ per succeeding km
  discounts: {
    pwd: 0.2,                 // 20% statutory discount for Persons with Disabilities
    discounted: 0.2,          // 20% statutory discount for students / senior citizens
  },
  minFloors: { regular: 30.0, pwd: 24.0, discounted: 24.0 },
};

// Fare tiers accepted by POST /api/rides (ride_type).
export const RIDE_TYPES = ['regular', 'pwd', 'discounted'];

// Coerce a client-supplied ride type to a known tier (defaults to full fare).
export function normalizeRideType(value) {
  const type = String(value ?? '').trim().toLowerCase();
  return RIDE_TYPES.includes(type) ? type : 'regular';
}

// Fare from a distance in meters for the given tier.
// PWD / student-senior tiers apply the mandatory 20% discount:
// ₱30.00 × 0.20 = ₱6.00 deducted → ₱24.00 to pay.
export function computeFare(distanceMeters, rideType = 'regular') {
  const km = Math.max(0, distanceMeters / 1000);
  const type = normalizeRideType(rideType);
  const regular = FARE.base + FARE.perKm * km;
  const fare = regular * (1 - (FARE.discounts[type] || 0));
  return Math.round(Math.max(FARE.minFloors[type], fare) * 100) / 100;
}

