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