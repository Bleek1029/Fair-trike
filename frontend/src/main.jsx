import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { LoadingProvider } from './loading/LoadingContext.jsx';
import 'leaflet/dist/leaflet.css';
import './css/main.css';

// ── PWA service worker (app-like install + offline shell) ──
if ('serviceWorker' in navigator) {
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
const BOOT_MIN_MS = 1200;
const bootStart = Date.now();
function dismissBootWhenReady() {
  const wait = Math.max(0, BOOT_MIN_MS - (Date.now() - bootStart));
  setTimeout(dismissBootSplash, wait);
}
if (document.readyState === 'complete') {
  dismissBootWhenReady();
} else {
  window.addEventListener('load', dismissBootWhenReady, { once: true });
  // Safety net in case load is delayed by slow tiles/fonts.
  setTimeout(dismissBootSplash, 6000);
}

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LoadingProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  </React.StrictMode>
);