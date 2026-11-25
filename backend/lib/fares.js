// Server-side fare policy — single source of truth for pricing on the API.
//
// Tariff scenarios:
//   • Terminal / Queue (Pila): ₱30.00 flag-down base fare (covers first passenger
//     boarding at an official TODA line).
//   • Street Hail: ₱20.00–₱25.00 base fare (flagging down a moving tricycle already
//     inside its zone); driver/operator sets the base within that range.
//   • Additional passenger: +₱10.00 regular / +₱8.00 discounted per extra head.
//   • Cross-zone / Out-of-route: ₱40.00+ surcharge (negotiated / tariff-based;
//     discounted tiers get 20% off the cross-zone tariff too).
//   • Statutory 20% discount: Students, PWDs, Senior Citizens — applied to the
//     base + distance fare and cross-zone surcharge. Extra-passenger charge is
//     already the discounted rate (+₱8 vs +₱10), so it is not discounted again.
//
export const FARE = {
  base: {
    terminal: 30.0, // Terminal / Queue (Pila) — flag-down at official TODA line
    street: 20.0,   // Street Hail — default base when flagging down in-zone
  },
  streetBaseRange: { min: 20.0, max: 25.0 }, // allowed street-hail base range
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

export const RIDE_TYPES = ['regular', 'pwd', 'discounted'];

export const BOARDING_CONTEXTS = ['terminal', 'street'];

export function normalizeRideType(value) {
  const type = String(value ?? '').trim().toLowerCase();
  return RIDE_TYPES.includes(type) ? type : 'regular';
}

export function normalizeBoardingContext(value) {
  const ctx = String(value ?? '').trim().toLowerCase();
  return BOARDING_CONTEXTS.includes(ctx) ? ctx : 'terminal';
}

// Minimum floor for a given base fare + tier (base fare, discounted for
// non-regular tiers). E.g. terminal: ₱30.00 regular / ₱24.00 discounted;
// street ₱20 base: ₱20.00 regular / ₱16.00 discounted.
export function minFloor(baseFare, rideType = 'regular') {
  const type = normalizeRideType(rideType);
  const discount = FARE.discounts[type] || 0;
  return baseFare * (1 - discount);
}

// Compute the fare for a ride.
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

  // ── Base + distance fare (the "regular fare" before statutory discount) ──
  const km = Math.max(0, distanceMeters / 1000);
  const baseDistanceFare = baseFare + FARE.perKm * km;

  // ── Additional passenger surcharge (already tier-adjusted: ₱10 / ₱8) ──
  const extraPerHead = isDiscounted ? FARE.extraPassenger.discounted : FARE.extraPassenger.regular;
  const extraFare = Math.max(0, Math.floor(extraPassengers)) * extraPerHead;

  // ── Cross-zone / out-of-route surcharge ──
  const crossZoneFare = crossZone ? FARE.crossZoneSurcharge : 0;

  // ── Apply statutory 20% discount to base+distance and cross-zone ──
  // Extra-passenger charge is already the discounted rate, so it is added after.
  let fare;
  if (isDiscounted) {
    fare = baseDistanceFare * (1 - discountRate) + extraFare + crossZoneFare * (1 - discountRate);
  } else {
    fare = baseDistanceFare + extraFare + crossZoneFare;
  }

  // ── Minimum floor: base fare (discounted for discounted tiers) ──
  return Math.round(Math.max(minFloor(baseFare, type), fare) * 100) / 100;
}
