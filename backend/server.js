import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { createServer } from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config.js';
import { testConnection, ensureDatabase } from './db.js';
import { initSocket } from './socket.js';
import { initWebSocketServer } from './ws-server.js';
import authRouter from './routes/auth.js';
import usersRouter, { uploadDir } from './routes/users.js';
import driversRouter from './routes/drivers.js';
import routingRouter from './routes/routing.js';
import geoRouter from './routes/geo.js';
import placesRouter from './routes/places.js';
import ridesRouter from './routes/rides.js';
import adminRouter from './routes/admin.js';
import { sendIndex, originFor } from './lib/spa.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

fs.mkdirSync(uploadDir, { recursive: true });

// ── Middleware ──────────────────────────────────────────
// Restrict CORS to an explicit allow-list (falls back to same-origin / none
// when unset, instead of reflecting arbitrary origins).
const corsOrigins = env.corsOrigins.length
  ? env.corsOrigins
  : env.isProd
    ? []
    : undefined;

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded profile pictures statically
app.use('/uploads', express.static(uploadDir));

// ── Request logger ──────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── API Routes ──────────────────────────────────────────
// Rate-limit credential endpoints to blunt brute-force/password spraying.
const authLimiter = rateLimit({
  windowMs: env.authRateLimit.windowMs,
  max: env.authRateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later.', code: 'RATE_LIMITED' },
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/users', usersRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/route', routingRouter);
app.use('/api/geo', geoRouter);
app.use('/api/places', placesRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'fairtrike-backend' }));

// 404 for unknown API routes
app.use('/api', notFoundHandler);

// ── Serve the built React app (single-process mode) ──────
const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  // index: false so index.html is only ever sent through sendIndex() below,
  // which injects the runtime config (app port vs admin port).
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  // The admin dashboard has its own port — send browsers there instead of
  // rendering it inside the app.
  app.get(['/admin', '/admin/*'], (req, res) => {
    res.redirect(302, `${originFor(req, env.adminPort)}/admin`);
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    sendIndex(res, distDir, req);
  });
  console.log(`🌐 Serving frontend from ${distDir}`);
  console.log(`🛡️  Admin dashboard lives on port ${env.adminPort} — /admin here redirects there.`);
} else {
  console.log('⚠️  frontend/dist not found — API-only mode. Run `npm run setup` in the project root to build it.');
}

// ── Central error handler (must be last) ────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────────────
// On Vercel (serverless), the app is exported and invoked per-request;
// only listen when running as a normal server.
const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  // Express MUST be the request listener BEFORE Socket.io attaches: engine.io
  // caches the listeners present at attach time and re-invokes them for every
  // non-/socket.io request. (Adding Express afterwards left it as a separate
  // listener that also ran on /socket.io requests → ERR_HTTP_HEADERS_SENT.)
  const appServer = createServer(app);

  // Attach Socket.io first (must be before Express becomes the sole listener)
  initSocket(appServer);

  // Attach raw WebSocket server (ws) to the same HTTP server
  initWebSocketServer(appServer);

  const server = appServer.listen(env.port, async () => {
    console.log(`🚀 Fairtrike backend running at http://localhost:${env.port}`);
    console.log(`📡 API base: http://localhost:${env.port}/api`);
    console.log(`🔌 Socket.io on http://localhost:${env.port}/socket.io`);
    console.log(`💬 Raw WebSocket on ws://localhost:${env.port}`);
    try {
      await testConnection();
      await ensureDatabase();
    } catch (err) {
      console.error('❌ Startup database check failed:', err.message);
      console.error('   Verify PostgreSQL is running and backend/.env credentials are correct.');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${env.port} is already in use — a previous server instance is likely still running.`);
      console.error(`   Fix: free the Fairtrike ports, then start again:`);
      console.error(`     npm run stop        (from the project root)`);
      console.error(`     PowerShell: Get-NetTCPConnection -LocalPort ${env.port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
      console.error(`     or:         npx kill-port ${env.port}`);
      process.exit(1);
    }
    throw err;
  });
}

// Export for Vercel serverless (see api/index.js)
export default app;