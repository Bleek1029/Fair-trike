// ── Central configuration: single source of truth for env-derived settings ──
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

// Load backend/.env relative to THIS file (not the process cwd) so the servers
// behave identically no matter which directory launched them (npm start from the
// repo root, `node backend/admin-server.js`, etc.).
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

// Read DATABASE_URL from Secret File (Render) or env var (local/other platforms)
function getDatabaseUrl() {
  // Render Secret File path (when DATABASE_URL is added as Secret File in dashboard)
  const secretPath = '/etc/secrets/DATABASE_URL';
  if (existsSync(secretPath)) {
    try {
      return readFileSync(secretPath, 'utf-8').trim();
    } catch {
      // fall through to env var
    }
  }
  // Fallback to environment variable (local dev, other platforms)
  return process.env.DATABASE_URL;
}

function intFromEnv(name, fallback) {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) ? n : fallback;
}

function requireSecret(name, fallback) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    if (fallback !== undefined) return fallback;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required secret: ${name}. Set ${name} environment variable in production.`);
    }
    throw new Error(`Missing required secret: ${name}. Set ${name} in backend/.env for local development.`);
  }
  return value;
}

// Parse DATABASE_URL if provided (Render, Railway, Fly.io, Neon, etc.)
// Format: postgresql://user:pass@host:port/dbname?sslmode=require
function parseDatabaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const sslMode = parsed.searchParams.get('sslmode');
    const channelBinding = parsed.searchParams.get('channel_binding');
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1), // remove leading /
      ssl: sslMode === 'require' || sslMode === 'verify-full' || channelBinding === 'require',
      sslMode,
    };
  } catch {
    return null;
  }
}

const dbFromUrl = parseDatabaseUrl(getDatabaseUrl());

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: intFromEnv('PORT', 5000),
  adminPort: intFromEnv('ADMIN_PORT', 5002),
  // Optional: serve the admin SPA shell from the Vite dev server (e.g.
  // http://localhost:5173) instead of frontend/dist — keeps HMR in dev.
  adminSpaOrigin: (process.env.ADMIN_SPA_ORIGIN || '').trim().replace(/\/+$/, ''),
  jwt: {
    // Fallback for Render: if JWT_SECRET not set, generate one at startup.
    // NOTE: This invalidates all tokens on each restart. Set JWT_SECRET in Render Dashboard for production.
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
      ? randomBytes(64).toString('hex')
      : 'dev_secret_change_me_please_use_a_long_random_string'),
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m').trim(),        // Short-lived access token
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d').trim(), // Long-lived refresh token
  },
  db: {
    host: dbFromUrl?.host || process.env.PGHOST || 'localhost',
    port: dbFromUrl?.port || intFromEnv('PGPORT', 5432),
    user: dbFromUrl?.user || process.env.PGUSER || 'postgres',
    password: dbFromUrl?.password || process.env.PGPASSWORD || '',
    database: dbFromUrl?.database || process.env.PGDATABASE || 'appdev',
    ssl: dbFromUrl?.ssl || false,
    sslMode: dbFromUrl?.sslMode,
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: intFromEnv('MAX_FILE_SIZE_MB', 5),
  },
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  orsApiKey: (process.env.ORS_API_KEY || '').trim(),
  // Brute-force protection on credential endpoints (fixed-window limiter).
  authRateLimit: {
    windowMs: intFromEnv('AUTH_RATE_WINDOW_MS', 15 * 60 * 1000),
    max: intFromEnv('AUTH_RATE_MAX', 100),
  },
  // Single-port mode (e.g., Render): serve admin on same port as app
  // Auto-detect Render: PORT=10000 is Render's default web port
  singlePort: process.env.SINGLE_PORT === 'true' || (process.env.NODE_ENV === 'production' && process.env.PORT === '10000'),

  // CORS allowed origins — explicit allowlist required. In development, defaults to
  // Vite dev server (5173) and backend (5000). In production, MUST be set via
  // CORS_ORIGINS env var (comma-separated). Empty = same-origin only.
  corsOrigins: (process.env.CORS_ORIGINS ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://localhost:5000,http://localhost:5001'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};