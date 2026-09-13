// ── Central configuration: single source of truth for env-derived settings ──
import 'dotenv/config';

function intFromEnv(name, fallback) {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) ? n : fallback;
}

function requireSecret(name, fallback) {
  const value = (process.env[name] || '').trim();
  return value || fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: intFromEnv('PORT', 5000),
  jwt: {
    secret: requireSecret('JWT_SECRET', 'dev-insecure-secret-change-me'),
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d').trim(),
  },
  db: {
    host: process.env.PGHOST || 'localhost',
    port: intFromEnv('PGPORT', 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'appdev',
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
};