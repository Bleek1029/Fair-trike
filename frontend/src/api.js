// ── Frontend API: thin typed endpoints over the shared fetch wrapper ──
import { rawRequest } from './api/http.js';
import { API_BASE } from './config.js';

// ── Storage (single source of truth for localStorage) ──
export function getToken() {
  return localStorage.getItem('fairtrike_token');
}
export function setToken(token) {
  if (token) localStorage.setItem('fairtrike_token', token);
  else localStorage.removeItem('fairtrike_token');
}
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('fairtrike_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setStoredUser(user) {
  if (user) localStorage.setItem('fairtrike_user', JSON.stringify(user));
  else localStorage.removeItem('fairtrike_user');
}

const request = (method, path, opts = {}) =>
  rawRequest(method, `${API_BASE}${path}`, { ...opts, token: opts.token ?? getToken() });

// ── Auth ──
export const apiRegister = (payload) => request('POST', '/auth/register', { body: payload });
export const apiRegisterDriver = (payload) => request('POST', '/auth/register-driver', { body: payload });
export const apiLogin = (payload) => request('POST', '/auth/login', { body: payload });
export const apiResetPassword = (payload) => request('POST', '/auth/reset-password', { body: payload });

// ── User ──
export const apiGetMe = () => request('GET', '/users/me');
export const apiUpdateProfile = (formData) => request('PUT', '/users/profile', { body: formData, isForm: true });
export const apiRemovePicture = () => request('DELETE', '/users/profile/picture');

// ── Drivers ──
export const apiListDrivers = (approved = true) => request('GET', `/drivers${approved ? '' : '?approved=false'}`);
export const apiGetMyDriver = () => request('GET', '/drivers/me');
export const apiUpdateMyDriver = (payload) => request('PUT', '/drivers/me', { body: payload });