// ── Frontend runtime config ─────────────────────────────
// The backend injects window.__FAIRTRIKE__ into index.html (see
// backend/lib/spa.js) telling the SPA which port it is running on:
//
//   • the Fairtrike app    → appPort / appOrigin    (default 5000)
//   • the admin dashboard  → adminPort / adminOrigin (default 5001)
//
// When the global is absent (static hosting such as Vercel) every helper below
// degrades to "this origin is both ports", which is the previous single-port
// behaviour.
const injected = (typeof window !== 'undefined' && window.__FAIRTRIKE__) || {};
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

// When the server injects no config (e.g. static hosting like Vercel, where one
// origin serves everything) both surfaces fall back to the current origin — the
// original single-port behaviour.
export const APP_ORIGIN = injected.appOrigin || currentOrigin;
export const ADMIN_ORIGIN = injected.adminOrigin || currentOrigin;
export const APP_PORT = injected.appPort ?? null;
export const ADMIN_PORT = injected.adminPort ?? null;

// Are we currently being served by the admin dashboard's own port?
export const onAdminPort = () =>
  Boolean(injected.adminOrigin) && window.location.origin === injected.adminOrigin;

// Are we currently being served by the app's port?
export const onAppPort = () =>
  Boolean(injected.appOrigin) && window.location.origin === injected.appOrigin;

// Is the admin dashboard on a *different* origin than the app? False in
// single-port mode, where /admin is just another route of the same SPA.
export const separateAdminPort = () => APP_ORIGIN !== ADMIN_ORIGIN;

// Cross-port hops. These are full page loads (different origins), and the two
// surfaces don't share localStorage — so each side signs in independently.
export function goToAdminPort(path = '/admin') {
  window.location.replace(`${ADMIN_ORIGIN}${path}`);
  return true;
}

export function goToAppPort(path = '/') {
  window.location.replace(`${APP_ORIGIN}${path}`);
  return true;
}
