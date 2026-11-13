// ── Shared SPA index serving ─────────────────────────────────────────────
// Two servers hand out the same built React bundle:
//
//   • the Fairtrike app      → env.port      (default 5000)
//   • the admin dashboard    → env.adminPort (default 5001)
//
// So the bundle needs to know *where* it is running. This module injects a tiny
// runtime-config global into index.html right before </head>:
//
//   window.__FAIRTRIKE__ = { appPort, adminPort, appOrigin, adminOrigin }
//
// The SPA reads it (frontend/src/lib/ports.js) to keep each surface on its own
// port. If the global is missing (e.g. a static host like Vercel), the SPA falls
// back to treating the current origin as both — i.e. the old single-port
// behaviour, so nothing breaks.
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
export function sendIndex(res, distDir, req) {
  // In single-port mode, both app and admin share the same origin
  const isSinglePort = env.singlePort;
  const appOrigin = originFor(req, env.port);
  const adminOrigin = isSinglePort ? appOrigin : originFor(req, env.adminPort);

  const config = JSON.stringify({
    appPort: env.port,
    adminPort: env.adminPort,
    appOrigin,
    adminOrigin,
  });

  const html = readIndex(distDir).replace(
    '</head>',
    `<script>window.__FAIRTRIKE__=${config};</script></head>`,
  );

  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(html);
}
