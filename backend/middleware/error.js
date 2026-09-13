// ── Centralized error handling ──
import { AppError } from '../lib/AppError.js';
import { env } from '../config.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Endpoint not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, code: err.code, message: err.message });
  }

  // Do not leak internals to clients, even in development.
  console.error('[error]', req.method, req.path, err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL',
    message: env.isProd ? 'Internal server error' : err.message,
  });
}