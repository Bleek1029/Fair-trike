// ── Typed application error with a stable HTTP contract ──
export class AppError extends Error {
  constructor(message, { status = 400, code = 'BAD_REQUEST', cause } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

export const badRequest = (message, extra = {}) => new AppError(message, { status: 400, code: 'BAD_REQUEST', ...extra });
export const unauthorized = (message = 'Not authenticated') => new AppError(message, { status: 401, code: 'UNAUTHORIZED' });
export const forbidden = (message = 'Forbidden') => new AppError(message, { status: 403, code: 'FORBIDDEN' });
export const notFound = (message = 'Not found') => new AppError(message, { status: 404, code: 'NOT_FOUND' });
export const conflict = (message) => new AppError(message, { status: 409, code: 'CONFLICT' });
export const serviceUnavailable = (message) => new AppError(message, { status: 502, code: 'UPSTREAM_ERROR' });