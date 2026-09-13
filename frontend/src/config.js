// ── Frontend app constants & configuration ──

// Fare policy (PHP). Single source of truth for the fare engine.
export const FARE = {
  base: 30.0,                 // ₱ base flag-down
  perKm: 3.0,                 // ₱ per succeeding km
  specialSurcharge: 20.0,     // additional for "Special Express"
  studentDiscount: 0.2,       // 20% statutory discount
  minFloors: { regular: 45.0, special: 65.0, discounted: 12.0 },
};

// Default map center (Olongapo City).
export const MAP_DEFAULT_CENTER = [14.830, 120.285];
export const MAP_DEFAULT_ZOOM = 13;

// Search debounce (ms).
export const SEARCH_DEBOUNCE_MS = 350;

// Contact + emergency.
export const EMERGENCY_TEL = '911';
export const WALLET_BALANCE_PLACEHOLDER = '₱350.00';

// API base path (network-relative so it works in dev, prod, and Capacitor).
export const API_BASE = '/api';