// ── Frontend API: thin typed endpoints over the shared fetch wrapper ──
import { rawRequest } from './api/http.js';
import { API_BASE } from './config.js';

// ── Storage (single source of truth for the session tokens + user) ──
// "Remember device" picks the backing store:
//   remember  → localStorage   (survives browser restarts)
//   !remember → sessionStorage (cleared when the browser/tab closes)
// Access token is short-lived (15m), refresh token is long-lived (30d, HttpOnly cookie).
// We store only the access token in web storage; refresh token lives in HttpOnly cookie.
const ACCESS_TOKEN_KEY = 'fairtrike_access_token';
const USER_KEY = 'fairtrike_user';

export function getAccessToken() {
  return globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY)
    ?? globalThis.sessionStorage?.getItem(ACCESS_TOKEN_KEY)
    ?? null;
}
export function setAccessToken(token, { remember = true } = {}) {
  if (token) {
    const other = remember ? globalThis.sessionStorage : globalThis.localStorage;
    other?.removeItem(ACCESS_TOKEN_KEY);
    (remember ? globalThis.localStorage : globalThis.sessionStorage)?.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY);
    globalThis.sessionStorage?.removeItem(ACCESS_TOKEN_KEY);
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
  const remembered = Boolean(globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY));
  const other = remembered ? globalThis.sessionStorage : globalThis.localStorage;
  other?.removeItem(USER_KEY);
  (remembered ? globalThis.localStorage : globalThis.sessionStorage)
    ?.setItem(USER_KEY, JSON.stringify(user));
}

// Clear all auth state (logout)
export function clearAuth() {
  setAccessToken(null);
  globalThis.localStorage?.removeItem(USER_KEY);
  globalThis.sessionStorage?.removeItem(USER_KEY);
}

const request = (method, path, opts = {}) =>
  rawRequest(method, `${API_BASE}${path}`, { ...opts, token: opts.token ?? getAccessToken() });

// ── Auth ──
export const apiRegister = (payload) => request('POST', '/auth/register', { body: payload });
export const apiRegisterDriver = (payload) => request('POST', '/auth/register-driver', { body: payload });

// Login returns { accessToken, refreshToken, user }
export const apiLogin = (payload) => request('POST', '/auth/login', { body: payload });
export const apiLoginDriver = (payload) => request('POST', '/auth/login-driver', { body: payload });

export const apiChangePassword = (payload) => request('POST', '/auth/change-password', { body: payload });
export const apiForgotPassword = (payload) => request('POST', '/auth/forgot-password', { body: payload });
export const apiResetPassword = (payload) => request('POST', '/auth/reset-password', { body: payload });

// Token management
export const apiRefreshToken = (refreshToken) => request('POST', '/auth/refresh', { body: { refresh_token: refreshToken } });
export const apiLogout = () => request('POST', '/auth/logout');
export const apiLogoutAll = () => request('POST', '/auth/logout-all');

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
export const apiAdminResetRequests = () => request('GET', '/admin/reset-requests');
export const apiAdminPendingUsers = () => request('GET', '/admin/users/pending');
export const apiSetUserStatus = (userId, status, admin_note) => request('POST', `/admin/users/${userId}/status`, { body: { status, admin_note } });
export const apiApproveResetRequest = (id, body = {}) => request('POST', `/admin/reset-requests/${id}/approve`, { body });
export const apiRejectResetRequest = (id, body = {}) => request('POST', `/admin/reset-requests/${id}/reject`, { body });
export const apiAdminDeleteAllDrivers = () => request('POST', '/admin/drivers/delete-all', { body: { confirmation: 'CONFIRM_DELETE_ALL_DRIVERS' } });
export const apiAdminDeleteAllUsers = () => request('POST', '/admin/users/delete-all', { body: { confirmation: 'CONFIRM_DELETE_ALL_USERS' } });
export const apiAdminDeleteAllResetRequests = () => request('POST', '/admin/reset-requests/delete-all', { body: { confirmation: 'CONFIRM_DELETE_ALL_RESET_REQUESTS' } });
export const apiAdminDeleteAllDocuments = () => request('POST', '/admin/documents/delete-all', { body: { confirmation: 'CONFIRM_DELETE_ALL_DOCUMENTS' } });
export const apiLoginAdmin = (payload) => request('POST', '/auth/login-admin', { body: payload });

// ── AI Assistant ───────────────────────────────────────────────
export const apiAiAssistant = (message) => request('POST', '/ai/assistant', { body: { message } });
export const apiAiSummary = (type, context) => request('POST', '/ai/summary', { body: { type, context } });
export const apiAiNotification = (data) => request('POST', '/ai/notification', { body: data });
export const apiAiParseBooking = (text) => request('POST', '/ai/parse-booking', { body: { text } });