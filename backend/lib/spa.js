// ── Shared SPA index serving ─────────────────────────────────────────────
// Single server hands out the built React bundle on env.port (default 5000)
//
// The bundle needs to know where it is running. This module injects a tiny
// runtime-config global into index.html right before </head>:
//
//   window.__FAIRTRIKE__ = { appPort, appOrigin }
//
// If the global is missing (e.g. a static host like Vercel), the SPA falls
// back to treating the current origin as the app origin.
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config.js';

// distDir -> { mtimeMs, html } — re-read whenever index.html changes on disk,
// so a rebuild is picked up without restarting the server.
const cache = new Map();

function readIndex(distDir) {
  const file = path.join(distDir, 'index.html');
  const { mtimeMs } = fs.statSync(file);
  const hit = cache.get(distDir);
  if (hit && hit.mtimeMs === mtimeMs) return hit.html;

  const html = fs.readFileSync(file, 'utf8');
  cache.set(distDir, { mtimeMs, html });
  return html;
}

// Origin of a server as reached by the browser. The hostname comes from the
// incoming request so LAN access (e.g. http://192.168.1.5:5000) keeps working;
// only the port is taken from config.
export function originFor(req, port) {
  return `${req.protocol}://${req.hostname}:${port}`;
}

// Send index.html with the runtime config injected.
// If isAdmin is true, inject dark theme configuration.
export function sendIndex(res, distDir, req, isAdmin = false) {
  const appOrigin = originFor(req, env.port);

  const config = JSON.stringify({
    appPort: env.port,
    appOrigin,
    isAdmin,
    theme: isAdmin ? 'dark' : 'light',
  });

  const html = readIndex(distDir).replace(
    /<\/head>/i,
    `<script>window.__FAIRTRIKE__=${config};</script></head>`,
  );

  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(html);
}
