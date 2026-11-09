// ── Native (Capacitor) runtime helpers ──────────────────────────────
// The Android/iOS shell loads the built SPA from Capacitor's own local asset
// server (https://localhost), NOT from the Node backend. Origin-relative URLs
// such as `/api` or `/uploads/foo.png` therefore hit the asset loader and 404,
// so native builds must talk to a real backend origin instead.
//
// Default target = 10.0.2.2, the Android loopback alias for the host
// machine. Kept working, but on this machine the supported path
// is a physical phone over USB — override at build time with
// VITE_NATIVE_API_ORIGIN, e.g.
//   VITE_NATIVE_API_ORIGIN=http://192.168.0.121:5000 npm run android:sync
export const DEFAULT_NATIVE_API_ORIGIN = 'http://10.0.2.2:5000';

// True when running inside the native Capacitor shell. Capacitor injects its
// runtime global (`window.Capacitor`) before the bundle executes, so no
// @capacitor/core import is needed just to detect the platform.
// `win` is injectable so this stays unit-testable outside a browser.
export function isNativeApp(win = typeof window !== 'undefined' ? window : undefined) {
  const capacitor = win?.Capacitor;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === 'function') return capacitor.isNativePlatform() === true;
  // Older/edge runtimes only expose getPlatform().
  if (typeof capacitor.getPlatform === 'function') return capacitor.getPlatform() !== 'web';
  return false;
}