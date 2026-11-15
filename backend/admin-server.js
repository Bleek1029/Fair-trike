// ── Admin Server ──────────────────────────────────────
// Serves admin SPA on port 5001, proxies /api and /uploads to main backend
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { env } from './config.js';
import { testConnection } from './db.js';
import { sendIndex, originFor } from './lib/spa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
const API_ORIGIN = `http://localhost:${env.port}`;

const app = express();
app.disable('x-powered-by');

// Create HTTP server to handle WebSocket upgrades
const server = createServer(app);

// CORS for admin origin
const corsOrigin = env.adminSpaOrigin ? env.adminSpaOrigin : originFor({ headers: { host: `localhost:${env.adminPort}` } }, env.adminPort);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = corsOrigin || origin || `http://localhost:${env.adminPort}`;
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Proxy /api and /uploads to main backend
async function proxyRequest(req, res) {
  const url = `${API_ORIGIN}${req.originalUrl}`;
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  delete headers['transfer-encoding'];
  headers['accept-encoding'] = 'identity';

  // Forward cookie header for authentication
  if (req.headers.cookie) {
    headers.cookie = req.headers.cookie;
  }

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
      credentials: 'include',
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (!['connection', 'content-length', 'content-encoding', 'keep-alive', 'transfer-encoding', 'upgrade'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
    if (cookies.length > 0) res.setHeader('Set-Cookie', cookies);
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
  } catch (err) {
    console.error(`   ⚠️  Proxy error for ${req.method} ${req.originalUrl}:`, err.message);
    res.status(502).json({ success: false, code: 'UPSTREAM_ERROR', message: 'Main backend unreachable.' });
  }
}

app.use('/api', proxyRequest);
app.use('/uploads', proxyRequest);
app.use('/socket.io', proxyRequest);

// Serve static files
app.use(express.static(distDir, { index: false, maxAge: '1h' }));

// Admin SPA routes
app.get(['/admin', '/admin/login'], (req, res) => sendIndex(res, distDir, req, true));
app.use((_req, res) => res.redirect('/admin'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'fairtrike-admin' }));

// Handle WebSocket upgrade for Socket.io proxy
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io')) {
    const url = `ws://localhost:${env.port}${req.url}`;

    const ws = new WebSocket(url, {
      headers: {
        ...req.headers,
        host: `localhost:${env.port}`,
      },
    });

    ws.on('open', () => {
      ws.write(head);
      socket.pipe(ws).pipe(socket);
    });

    ws.on('error', (err) => {
      console.error('WebSocket proxy error:', err.message);
      socket.destroy();
    });

    ws.on('close', () => {
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.error('Client socket error:', err.message);
      ws.close();
    });

    socket.on('close', () => {
      ws.close();
    });
  }
});

async function booting() {
  console.log('🛠️  Admin server: checking database…');
  await testConnection();
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(port, () => {
      console.log(`🛡️  Fairtrike admin dashboard running at http://localhost:${port}/admin`);
      console.log(`📡 Proxying /api, /uploads, and /socket.io to http://localhost:${env.port}`);
      booting();
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(err);
      } else {
        reject(err);
      }
    });
  });
}

async function startAdminServer() {
  const port = env.adminPort;
  try {
    return await startServer(port);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use.`);
      console.error(`   Run \`npm run stop\` to free the port, then try again.`);
      console.error(`   Or set a different ADMIN_PORT in backend/.env`);
      process.exit(1);
    }
    throw err;
  }
}

startAdminServer().catch((err) => {
  console.error('❌ Failed to start admin server:', err.message);
  process.exit(1);
});