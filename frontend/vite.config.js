import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

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
  plugins: [react(), swVersionPlugin(), indexHtmlVersionPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': 'http://localhost:5000',
    },
  },
});