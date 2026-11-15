// ── Test Application Setup ────────────────────────────────────────────
//
// Lightweight Express app for integration tests without heavy middleware dependencies.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { env } from '../../config.js';
import authRouter from '../../routes/auth.js';
import usersRouter, { uploadDir } from '../../routes/users.js';
import driversRouter from '../../routes/drivers.js';
import routingRouter from '../../routes/routing.js';
import geoRouter from '../../routes/geo.js';
import placesRouter from '../../routes/places.js';
import ridesRouter from '../../routes/rides.js';
import aiRouter from '../../routes/ai.js';
import { sendIndex, originFor } from '../../lib/spa.js';
import { notFoundHandler, errorHandler } from '../../middleware/error.js';
import { rateLimiters } from '../../lib/rateLimiter.js';
import { logger, requestLogger } from '../../lib/logger.js';
import { metricsMiddleware, getMetrics, getMetricsContentType } from '../../lib/metrics.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Trust proxy (required on Render, Fly.io, Heroku, etc.)
if (env.isProd) {
  app.set('trust proxy', 1);
}

fs.mkdirSync(uploadDir, { recursive: true });

// CORS
const corsOrigin = env.corsOrigins.includes('*') ? true : (env.corsOrigins.length ? env.corsOrigins : undefined);
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Security headers (helmet)
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: env.isProd ? [] : null,
};

app.use(helmet({
  contentSecurityPolicy: env.isProd ? { directives: cspDirectives } : false,
  crossOriginEmbedderPolicy: false,
  hsts: env.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve uploaded profile pictures statically
app.use('/uploads', express.static(uploadDir));

// Structured request logging
app.use(requestLogger);

// Prometheus metrics
app.use(metricsMiddleware);

// API Routes
app.use('/api/auth', rateLimiters.auth, authRouter);
app.use('/api/users', usersRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/route', routingRouter);
app.use('/api/geo', geoRouter);
app.use('/api/places', placesRouter);
app.use('/api/rides', ridesRouter);
// AI routes - simplified for tests (no auth required)
app.use('/api/ai', rateLimiters.ai, aiRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'fairtrike-backend' }));

// Prometheus metrics
app.get('/metrics', async (_req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', getMetricsContentType());
    res.send(metrics);
  } catch (err) {
    logger.error({ err }, 'Failed to generate metrics');
    res.status(500).send('Failed to generate metrics');
  }
});

// 404 for unknown API routes
app.use('/api', notFoundHandler);

// Serve the built React app (single-process mode)
const distDir = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  const APP_ONLY_PATHS = [
    /^\/$/, /^\/app(\/|$)/, /^\/dashboard(\/|$)/, /^\/driver(\/|$)/,
    /^\/driver-info(\/|$)/, /^\/history(\/|$)/, /^\/login(\/|$)/,
    /^\/login-driver(\/|$)/, /^\/register(\/|$)/, /^\/register-driver(\/|$)/,
    /^\/assets(\/|$)/, /^\/favicon/, /^\/manifest/, /^\/icons/,
    /^\/seal/, /^\/fairtrike-logo/,
  ];

  if (env.singlePort) {
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      sendIndex(res, distDir, req);
    });
    console.log(`🌐 Serving frontend from ${distDir}`);
  } else {
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      sendIndex(res, distDir, req);
    });
    console.log(`🌐 Serving frontend from ${distDir}`);
  }
} else {
  console.log('⚠️  frontend/dist not found — API-only mode. Run `npm run setup` in the project root to build it.');
}

// Central error handler (must be last)
app.use(errorHandler);

export default app;