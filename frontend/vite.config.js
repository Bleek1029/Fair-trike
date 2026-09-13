import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api and /uploads to the Node backend on :5000
// so the browser only ever talks to http://localhost:5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});