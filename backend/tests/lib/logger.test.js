// ── Tests: backend/lib/logger.js ──
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { logger, requestLogger, createChildLogger } from '../../lib/logger.js';

describe('logger', () => {
  it('exports a logger instance', () => {
    assert.ok(logger);
    assert.ok(typeof logger.info === 'function');
    assert.ok(typeof logger.warn === 'function');
    assert.ok(typeof logger.error === 'function');
    assert.ok(typeof logger.debug === 'function');
  });

  it('createChildLogger returns a child logger with bindings', () => {
    const child = createChildLogger({ requestId: 'test-123' });
    assert.ok(child);
    assert.ok(typeof child.info === 'function');
  });
});

describe('requestLogger middleware', () => {
  let req, res, nextCalled;

  beforeEach(() => {
    const headers = new Map();
    req = {
      method: 'GET',
      path: '/api/test',
      headers: {},
      ip: '127.0.0.1',
      get: (name) => name === 'user-agent' ? 'test-agent' : undefined,
      query: {},
    };
    res = {
      statusCode: 200,
      headers,
      getHeader: (name) => headers.get(name.toLowerCase()),
      setHeader: (name, value) => headers.set(name.toLowerCase(), value),
      on: (event, fn) => { if (event === 'finish') setTimeout(fn, 0); },
    };
    nextCalled = false;
  });

  afterEach(() => {
    // Clear any timers
  });

  it('adds correlationId to request and response', async () => {
    await new Promise((resolve) => {
      requestLogger(req, res, () => {
        assert.ok(req.correlationId);
        assert.ok(res.getHeader('x-correlation-id'));
        resolve();
      });
    });
  });

  it('attaches logger to request', async () => {
    await new Promise((resolve) => {
      requestLogger(req, res, () => {
        assert.ok(req.log);
        assert.ok(typeof req.log.info === 'function');
        resolve();
      });
    });
  });

  it('generates correlationId if not provided', async () => {
    await new Promise((resolve) => {
      requestLogger(req, res, () => {
        assert.ok(req.correlationId);
        assert.ok(req.correlationId.length > 0);
        resolve();
      });
    });
  });

  it('uses existing correlationId from headers', async () => {
    req.headers['x-correlation-id'] = 'existing-correlation-id';
    await new Promise((resolve) => {
      requestLogger(req, res, () => {
        assert.equal(req.correlationId, 'existing-correlation-id');
        resolve();
      });
    });
  });
});