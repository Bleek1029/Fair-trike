// ── Input validation & sanitisation helpers ──
import { badRequest } from './AppError.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

export const normalizeEmail = (v = '') => String(v).trim().toLowerCase();
export const trim = (v = '') => String(v).trim();

export function requireFields(values, labels) {
  for (const key of labels) {
    if (!values[key]) throw badRequest(`${key} is required.`);
  }
}

export function assertEmail(value) {
  if (!EMAIL_RE.test(value)) throw badRequest('A valid email address is required.');
}

export function assertPassword(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
}

// Coordinate sanity bounds for the Olongapo metro region + loose global guard.
const LAT_MIN = -90, LAT_MAX = 90, LNG_MIN = -180, LNG_MAX = 180;
export function assertCoordPair([lat, lon]) {
  if (!Array.isArray([lat, lon]) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw badRequest('Invalid coordinates.');
  }
  if (lat < LAT_MIN || lat > LAT_MAX || lon < LNG_MIN || lon > LNG_MAX) {
    throw badRequest('Coordinates out of range.');
  }
}