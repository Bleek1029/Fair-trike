// ── Prometheus Metrics ────────────────────────────────────────────────
//
// Exposes /metrics endpoint for Prometheus scraping.
// Tracks HTTP requests, DB pool, rate limiter, and custom metrics.

import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

// Add default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register, prefix: 'nodejs_' });

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const dbPoolConnections = new Gauge({
  name: 'db_pool_connections',
  help: 'Current database pool connections',
  labelNames: ['state'], // idle, waiting, total
  registers: [register],
});

export const rateLimiterHits = new Counter({
  name: 'rate_limiter_hits_total',
  help: 'Total rate limiter hits',
  labelNames: ['limiter', 'result'], // limiter: auth, api, ai; result: allowed, limited
  registers: [register],
});

export const activeSocketConnections = new Gauge({
  name: 'active_socket_connections',
  help: 'Number of active Socket.io connections',
  registers: [register],
});

export const emailSent = new Counter({
  name: 'email_sent_total',
  help: 'Total emails sent',
  labelNames: ['type', 'result'], // type: reset, test; result: success, failed
  registers: [register],
});

export const ridesCreated = new Counter({
  name: 'rides_created_total',
  help: 'Total rides created',
  labelNames: ['ride_type'], // regular, pwd, discounted
  registers: [register],
});

export const ridesCompleted = new Counter({
  name: 'rides_completed_total',
  help: 'Total rides completed',
  registers: [register],
});

export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total user registrations',
  labelNames: ['role'], // passenger, driver
  registers: [register],
});

export const authErrors = new Counter({
  name: 'auth_errors_total',
  help: 'Total authentication errors',
  labelNames: ['type'], // invalid_credentials, expired_token, invalid_token, etc.
  registers: [register],
});

// Metrics middleware for Express
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';

    httpRequestsTotal.inc({ method: req.method, path: route, status_code: res.statusCode });
    httpRequestDuration.observe({ method: req.method, path: route, status_code: res.statusCode }, duration);
  });

  next();
}

// Get metrics as Prometheus format
export async function getMetrics() {
  return register.metrics();
}

// Get content type for Prometheus
export function getMetricsContentType() {
  return register.contentType;
}

export { register };