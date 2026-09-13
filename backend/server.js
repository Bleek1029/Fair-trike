import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config.js';
import { testConnection, ensureDatabase } from './db.js';
import authRouter from './routes/auth.js';
import usersRouter, { uploadDir } from './routes/users.js';
import driversRouter from './routes/drivers.js';
import routingRouter from './routes/routing.js';
import geoRouter from './routes/geo.js';
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

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'fairtrike-backend' }));

// 404 for unknown API routes
app.use('/api', notFoundHandler);

// ── Serve the built React app (single-process mode) ──────
const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: 'index.html', maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log(`🌐 Serving frontend from ${distDir}`);
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
  const server = app.listen(env.port, async () => {
    console.log(`🚀 Fairtrike backend running at http://localhost:${env.port}`);
    console.log(`📡 API base: http://localhost:${env.port}/api`);
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
      console.error(`   Fix: stop the other process first, e.g.:`);
      console.error(`     PowerShell: Get-NetTCPConnection -LocalPort ${env.port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
      console.error(`     or:         npx kill-port ${env.port}`);
      process.exit(1);
    }
    throw err;
  });
}

// Export for Vercel serverless (see api/index.js)
export default app;