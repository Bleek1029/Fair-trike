// ── Frontend API: thin typed endpoints over the shared fetch wrapper ──
import { rawRequest } from './api/http.js';
import { API_BASE } from './config.js';

// ── Storage (single source of truth for the session token + user) ──
// "Remember device" picks the backing store:
//   remember  → localStorage   (survives browser restarts)
//   !remember → sessionStorage (cleared when the browser/tab closes)
// The token chooses the session's store; the user record always follows it so
// the pair can't split across stores, and every write clears the other store.
const TOKEN_KEY = 'fairtrike_token';
const USER_KEY = 'fairtrike_user';

export function getToken() {
  // localStorage first (remembered sessions), then sessionStorage.
  return globalThis.localStorage?.getItem(TOKEN_KEY)
    ?? globalThis.sessionStorage?.getItem(TOKEN_KEY)
    ?? null;
}
export function setToken(token, { remember = true } = {}) {
  if (token) {
    const other = remember ? globalThis.sessionStorage : globalThis.localStorage;
    other?.removeItem(TOKEN_KEY);
    (remember ? globalThis.localStorage : globalThis.sessionStorage)?.setItem(TOKEN_KEY, token);
  } else {
    // Logout / invalid token: end the session in both stores.
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    globalThis.sessionStorage?.removeItem(TOKEN_KEY);
  }
}
export function getStoredUser() {
  try {
    const raw = globalThis.localStorage?.getItem(USER_KEY)
      ?? globalThis.sessionStorage?.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setStoredUser(user) {
  if (!user) {
    globalThis.localStorage?.removeItem(USER_KEY);
    globalThis.sessionStorage?.removeItem(USER_KEY);
    return;
  }
  // Mirror the token's store: a session-only login keeps its user session-only.
  const remembered = Boolean(globalThis.localStorage?.getItem(TOKEN_KEY));
  const other = remembered ? globalThis.sessionStorage : globalThis.localStorage;
  other?.removeItem(USER_KEY);
  (remembered ? globalThis.localStorage : globalThis.sessionStorage)
    ?.setItem(USER_KEY, JSON.stringify(user));
}

const request = (method, path, opts = {}) =>
  rawRequest(method, `${API_BASE}${path}`, { ...opts, token: opts.token ?? getToken() });

// ── Auth ──
export const apiRegister = (payload) => request('POST', '/auth/register', { body: payload });
export const apiRegisterDriver = (payload) => request('POST', '/auth/register-driver', { body: payload });
export const apiLogin = (payload) => request('POST', '/auth/login', { body: payload });
export const apiLoginDriver = (payload) => request('POST', '/auth/login-driver', { body: payload });
export const apiLoginAdmin = (payload) => request('POST', '/auth/login-admin', { body: payload });
export const apiResetPassword = (payload) => request('POST', '/auth/reset-password', { body: payload });

// ── User ──
export const apiGetMe = () => request('GET', '/users/me');
export const apiUpdateProfile = (formData) => request('PUT', '/users/profile', { body: formData, isForm: true });
export const apiRemovePicture = () => request('DELETE', '/users/profile/picture');

// ── Drivers ──
export const apiListDrivers = (approved = true) => request('GET', `/drivers${approved ? '' : '?approved=false'}`);
export const apiGetMyDriver = () => request('GET', '/drivers/me');
export const apiUpdateMyDriver = (payload) => request('PUT', '/drivers/me', { body: payload });

// ── Driver documents ──
export const apiUploadDriverDocument = (formData) => request('POST', '/drivers/me/documents', { body: formData, isForm: true });
export const apiGetDriverDocuments = () => request('GET', '/drivers/me/documents');

// ── Rides ──
export const apiGetAvailableRides = () => request('GET', '/rides/available');
export const apiAcceptRide = (id) => request('POST', `/rides/${id}/accept`);
export const apiCompleteRide = (id) => request('POST', `/rides/${id}/complete`);
export const apiGetMyRides = () => request('GET', '/rides/mine');
export const apiGetRideHistory = () => request('GET', '/rides/history');
export const apiGetEarnings = () => request('GET', '/rides/earnings');
export const apiCreateRide = (payload) => request('POST', '/rides', { body: payload });

// ── Admin ──
export const apiAdminStats = () => request('GET', '/admin/stats');
export const apiAdminDrivers = () => request('GET', '/admin/drivers');
export const apiSetDriverStatus = (userId, status) => request('POST', `/admin/drivers/${userId}/status`, { body: { status } });
export const apiAdminDocuments = () => request('GET', '/admin/documents');
export const apiSetDocumentStatus = (id, status) => request('POST', `/admin/documents/${id}/status`, { body: { status } });
export const apiAdminUsers = () => request('GET', '/admin/users');
export const apiAdminRides = () => request('GET', '/admin/rides');