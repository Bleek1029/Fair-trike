// ── Structured Logging (pino) ────────────────────────────────────────
//
// JSON logs in production, pretty-printed in development.
// Includes request correlation IDs for traceability.

import pino from 'pino';
import { env } from '../config.js';
import { randomUUID } from 'node:crypto';

// Pretty printer for development
const isDev = !env.isProd;

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'fairtrike-backend',
    env: env.nodeEnv,
  },
});

// Child logger with request context
export function createChildLogger(bindings) {
  return logger.child(bindings);
}

// Request logger middleware with correlation ID
export function requestLogger(req, res, next) {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    randomUUID();

  // Attach correlation ID to request for downstream use
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const reqLogger = logger.child({
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  req.log = reqLogger;

  // Log request start
  reqLogger.info({ query: req.query }, 'request started');

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logFn = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    reqLogger[logFn]({
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.getHeader('content-length'),
    }, 'request completed');
  });

  next();
}

// Export main logger
export { logger };

export { randomUUID };