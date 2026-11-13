import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { LoadingProvider } from './loading/LoadingContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { IS_NATIVE_APP } from './config.js';
import { useVersionCheck, injectAppVersion } from './hooks/useVersionCheck.js';
import 'leaflet/dist/leaflet.css';
import './css/main.css';
import './css/design-update.css';

// ── PWA service worker (app-like install + offline shell) ──
// Skipped inside the native shell: Capacitor already ships the bundle locally on
// every install, and a worker would start caching cross-origin API/uploads
// responses on the WebView's own origin for no benefit.
if (!IS_NATIVE_APP && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ });
  });
}

function dismissBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  el.classList.add('boot-hidden');
  setTimeout(() => el.remove(), 450);
}

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);

// Keep the branded splash visible on every refresh so the logo + name animation plays.
const BOOT_MIN_MS = 5000;
// Absolute backstop so the splash can never stick forever (e.g. WebView never
// fires `load` / reports readyState incorrectly).
const BOOT_BACKSTOP_MS = 7000;
const bootStart = Date.now();
function dismissBootWhenReady() {
  const wait = Math.max(0, BOOT_MIN_MS - (Date.now() - bootStart));
  setTimeout(dismissBootSplash, wait);
}
// Guaranteed dismissal: never let the boot-splash remain visible indefinitely.
setTimeout(dismissBootSplash, BOOT_BACKSTOP_MS);

if (document.readyState === 'complete') {
  dismissBootWhenReady();
} else {
  window.addEventListener('load', dismissBootWhenReady, { once: true });
}

// Inject version meta tag for SW version comparison
injectAppVersion();

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LoadingProvider>
        <AuthProvider>
          <ToastProvider>
            {/* Version check: auto-reload on new deploy */}
            <VersionChecker />
            <App />
          </ToastProvider>
        </AuthProvider>
      </LoadingProvider    </BrowserRouter>
  </React.StrictMode>
);

function VersionChecker() {
  useVersionCheck({ intervalMs: 30000, enabled: !IS_NATIVE_APP });
  return null;
}