// ── Shared string / validation helpers ──
import { UPLOADS_BASE } from '../config.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Builds a stable 2-letter avatar acronym.
export function initialsOf(name) {
  return ((name || '').trim().split(/\s+/).map((p) => p[0]).join('') || 'FT').slice(0, 2).toUpperCase();
}

export const emailOk = (email) => EMAIL_RE.test((email || '').trim());

// Mirrors the backend password policy (6+ chars, uppercase, number).
export function passwordChecks(val) {
  const v = val || '';
  return {
    hasMinLength: v.length >= 6,
    hasUppercase: /[A-Z]/.test(v),
    hasNumber: /[0-9]/.test(v),
    ok: v.length >= 6 && /[A-Z]/.test(v) && /[0-9]/.test(v),
  };
}

// Turns a stored profile-picture path into an absolute route.
// Handles both POSIX and Windows-style stored paths.
// UPLOADS_BASE is `/uploads` in the browser and the backend origin in the native
// shell (Capacitor serves the bundle from https://localhost).
export function avatarUrl(profilePicture) {
  if (!profilePicture) return null;
  const filename = String(profilePicture).split(/[\\/]/).pop();
  return filename ? `${UPLOADS_BASE}/${filename}` : null;
}

// Haversine formula: great-circle distance between two lat/lng points in meters.
// Used for fallback distance estimates when routed distance is unavailable.
export function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}