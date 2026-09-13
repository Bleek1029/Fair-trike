// ── Tests: backend/lib/AppError.js + http.js ──
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, badRequest, unauthorized, forbidden, notFound, conflict, serviceUnavailable } from '../../lib/AppError.js';
import { ok, created } from '../../lib/http.js';

describe('AppError', () => {
  it('carries message, status, and code', () => {
    const err = new AppError('boom', { status: 409, code: 'CONFLICT' });
    assert.equal(err.status, 409);
    assert.equal(err.code, 'CONFLICT');
    assert.equal(err.name, 'AppError');
  });
  it('defaults to 400/BAD_REQUEST', () => {
    const err = new AppError('boom');
    assert.equal(err.status, 400);
    assert.equal(err.code, 'BAD_REQUEST');
  });
});

describe('error factories', () => {
  it('map to the documented status codes', () => {
    assert.equal(badRequest('x').status, 400);
    assert.equal(unauthorized().status, 401);
    assert.equal(forbidden().status, 403);
    assert.equal(notFound().status, 404);
    assert.equal(conflict('dup').status, 409);
    assert.equal(serviceUnavailable('upstream down').status, 502);
  });
  it('all instances of AppError for the central handler', () => {
    for (const err of [badRequest(), unauthorized(), forbidden(), notFound(), conflict(), serviceUnavailable()]) {
      assert.ok(err instanceof AppError);
    }
  });
});

describe('http response helpers', () => {
  const fakeRes = () => ({
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  });

  it('ok() sends success:true with merged data', () => {
    const res = fakeRes();
    ok(res, { user: { id: 1 } });
    assert.deepEqual(res.body, { success: true, user: { id: 1 } });
  });

  it('created() uses status 201', () => {
    const res = fakeRes();
    created(res, { token: 't' });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { success: true, token: 't' });
  });
});

// Silence unused-import lint noise in environments that flag `mock`.
void mock;
