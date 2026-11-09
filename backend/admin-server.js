// ── Dedicated admin server: serves ONLY the admin dashboard on its own port ──
// The SPA's API calls (/api) and uploads (/uploads) are proxied to the main
// backend on env.port, so the admin UI is reachable separately (e.g. :5001)
// without exposing anything beyond what the main server already serves.
//
// SPA shell: served from frontend/dist by default. Set ADMIN_SPA_ORIGIN (e.g.
// http://localhost:5173) to proxy the shell from the Vite dev server instead,
// which keeps hot-reload while developing the admin UI.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config.js';
import { testConnection } from './db.js';
import { sendIndex, originFor } from './lib/spa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
const API_ORIGIN = `http://localhost:${env.port}`;

const app = express();
app.disable('x-powered-by');

// Hop-by-hop headers must not be forwarded when re-issuing a request. `expect`
// is also dropped because fetch() rejects it ("expect header not supported") —
// some clients (e.g. PowerShell, curl with large bodies) send `Expect: 100-continue`.
const STRIPPED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'expect',
  'accept-encoding',
  'te',
  'trailer',
  'proxy-connection',
  'proxy-authorization',
]);

// Headers we never copy onto our own response: hop-by-hop ones, plus the ones
// this proxy sets itself (`content-length`). `content-encoding` is excluded
// because we always ask the backend for an already-decoded (`identity`) body.
const STRIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

// Forward a request to the target backend and return the response verbatim.
function makeProxy(targetOrigin) {
  return async function proxy(req, res) {
    const url = `${targetOrigin}${req.originalUrl}`;
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) headers[key] = value;
    }
    // Ask for an uncompressed body so it can be relayed byte-for-byte.
    headers['accept-encoding'] = 'identity';

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    try {
      const upstream = await fetch(url, {
        method: req.method,
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(20000),
        // duplex stays off — the body is a fully buffered Buffer, not a stream.
      });

      const buf = Buffer.from(await upstream.arrayBuffer());
      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
      });
      // set-cookie must be forwarded as separate headers, never comma-joined.
      const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
      if (cookies.length > 0) res.setHeader('Set-Cookie', cookies);
      res.setHeader('Content-Length', buf.length);
      res.end(buf);
    } catch (err) {
      const cause = err?.cause?.message || err?.cause || err?.message || err;
      console.error(`   ⚠️  Proxy error for ${req.method} ${req.originalUrl}: ${cause}`);
      res.status(502).json({
        success: false,
        code: 'UPSTREAM_ERROR',
        message: 'Main backend is not reachable.',
        ...(env.isProd ? {} : { debug: String(cause) }),
      });
    }
  };
}

const proxyToApi = makeProxy(API_ORIGIN);
app.use('/api', proxyToApi);
app.use('/uploads', proxyToApi);

// Routes that belong to the commuter/driver app — on the admin port they are
// bounced to the app's own port so each surface stays on its own port.
const APP_ONLY_PATHS = [
  /^\/app(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/driver(\/|$)/,
  /^\/driver-info(\/|$)/,
  /^\/history(\/|$)/,
  /^\/login-driver(\/|$)/,
  /^\/register(\/|$)/,
  /^\/register-driver(\/|$)/,
];

function redirectAppSurfaces(req, res, next) {
  if (APP_ONLY_PATHS.some((re) => re.test(req.path))) {
    return res.redirect(302, `${originFor(req, env.port)}${req.originalUrl}`);
  }
  return next();
}

// Admin entry point.
app.get('/', (_req, res) => res.redirect('/admin'));

if (env.adminSpaOrigin) {
  // Dev mode: let the Vite dev server serve the shell so the admin UI hot-reloads.
  const proxyToSpa = makeProxy(env.adminSpaOrigin);
  app.use(redirectAppSurfaces);
  app.get('/admin', proxyToSpa);
  app.use(proxyToSpa);
  console.log(`🔁 Serving the SPA shell from ${env.adminSpaOrigin}`);
} else {
  app.use(redirectAppSurfaces);
  app.use(express.static(distDir, { index: false }));
  // Admin-only pages. Anything else redirects to /admin below, so this port
  // never renders the commuter/driver app.
  app.get(['/admin', '/login'], (req, res) => sendIndex(res, distDir, req));
  app.use((_req, res) => res.redirect('/admin'));
}

async function booting() {
  console.log('🛠️  Admin server: checking database…');
  await testConnection();
}

const server = app.listen(env.adminPort, () => {
  console.log(`🛡️  Fairtrike admin dashboard running at http://localhost:${env.adminPort}/admin`);
  console.log(`📡 Proxying /api and /uploads to http://localhost:${env.port}`);
  booting();
});

// A clear message beats an unhandled EADDRINUSE stack trace.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Admin port ${env.adminPort} is already in use.`);
    console.error('   Free the Fairtrike ports with `npm run stop` (project root),');
    console.error('   or set ADMIN_PORT in backend/.env to a different free port.');
    process.exit(1);
  }
  throw err;
});
