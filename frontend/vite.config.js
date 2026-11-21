import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin to inject version into service worker at build time
function swVersionPlugin() {
  return {
    name: 'sw-version',
    generateBundle() {
      const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
      const version = pkg.version;
      const swPath = resolve(__dirname, 'public', 'sw.js');
      let swContent = readFileSync(swPath, 'utf-8');
      swContent = swContent
        .replace(/<%= version %>/g, version)
        .replace(/<%= Date\.now\(\) %>/g, Date.now());
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: swContent,
      });
    },
  };
}

// Plugin to process index.html as template
function indexHtmlVersionPlugin() {
  return {
    name: 'index-html-version',
    transformIndexHtml(html) {
      const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
      const version = pkg.version;
      return html.replace(/<%= version %>/g, version);
    },
  };
}

// Dev server proxies /api and /uploads to the Node backend on :5000
// so the browser only ever talks to http://localhost:5173.
export default defineConfig({
  plugins: [
    react(),
    swVersionPlugin(),
    indexHtmlVersionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Fairtrike',
        short_name: 'Fairtrike',
        description: 'Olongapo City tricycle transit hailing and regulated fare matrix.',
        theme_color: '#0d5c3a',
        background_color: '#faf8ff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': 'http://localhost:5000',
    },
  },
});