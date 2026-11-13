import { useEffect } from 'react';

// Checks for new service worker version and reloads if found
// Runs on mount and then every 30 seconds (configurable)
export function useVersionCheck({ intervalMs = 30000, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let checkTimer;

    async function checkVersion() {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.active) return;

        // Send version check message to SW
        const swVersion = await new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (e) => resolve(e.data?.version);
          reg.active.postMessage({ type: 'VERSION_CHECK' }, [channel.port2]);
          // Timeout after 2s
          setTimeout(() => resolve(null), 2000);
        });

        // Get current version from meta tag (injected at build)
        const meta = document.querySelector('meta[name="app-version"]');
        const currentVersion = meta?.content;

        if (swVersion && currentVersion && swVersion !== currentVersion) {
          console.log('[VersionCheck] New version detected:', swVersion, '->', currentVersion);
          // Force reload to get fresh assets
          window.location.reload();
        }
      } catch (e) {
        console.debug('[VersionCheck] Check failed:', e.message);
      }
    }

    // Initial check after a short delay
    const initialTimer = setTimeout(checkVersion, 5000);

    // Periodic checks
    checkTimer = setInterval(checkVersion, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(checkTimer);
    };
  }, [intervalMs, enabled]);
}

// Inject current version into document for comparison
export function injectAppVersion() {
  if (typeof document !== 'undefined') {
    // Version is injected at build time via index.html template
    // This runs on client to ensure meta tag exists
    const version = import.meta.env.VITE_APP_VERSION || 'dev';
    let meta = document.querySelector('meta[name="app-version"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'app-version';
      document.head.appendChild(meta);
    }
    meta.content = version;
  }
}