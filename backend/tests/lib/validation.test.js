// ── Tests: backend/lib/validation.js ──
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  trim,
  requireFields,
  assertEmail,
  assertPassword,
  assertCoordPair,
} from '../../lib/validation.js';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    assert.equal(normalizeEmail('  Juan@MAIL.com '), 'juan@mail.com');
  });
  it('defaults empty input to empty string', () => {
    assert.equal(normalizeEmail(), '');
  });
});

describe('trim', () => {
  it('coerces non-strings safely', () => {
    assert.equal(trim(undefined), '');
    assert.equal(trim('  hi  '), 'hi');
  });
});

describe('assertEmail', () => {
  it('accepts a valid address', () => {
    assert.doesNotThrow(() => assertEmail('driver@mail.com'));
  });
  it('rejects malformed addresses with a 400 AppError', () => {
    for (const bad of ['', 'nope', 'a@b', 'a b@c.com']) {
      assert.throws(() => assertEmail(bad), (err) => err.status === 400 && err.code === 'BAD_REQUEST');
    }
  });
});

describe('assertPassword', () => {
  it('accepts 6+ character strings', () => {
    assert.doesNotThrow(() => assertPassword('abcdef'));
  });
  it('rejects short passwords', () => {
    assert.throws(() => assertPassword('abc12'), (err) => err.status === 400);
  });
  it('rejects non-strings', () => {
    assert.throws(() => assertPassword(null), (err) => err.status === 400);
    assert.throws(() => assertPassword(123456), (err) => err.status === 400);
  });
});

describe('assertCoordPair', () => {
  it('accepts valid finite coordinates', () => {
    assert.doesNotThrow(() => assertCoordPair([14.83, 120.28]));
    assert.doesNotThrow(() => assertCoordPair([-90, -180]));
    assert.doesNotThrow(() => assertCoordPair([90, 180]));
  });
  it('rejects NaN/Infinity and out-of-range values', () => {
    assert.throws(() => assertCoordPair([NaN, 0]));
    assert.throws(() => assertCoordPair([Infinity, 0]));
    assert.throws(() => assertCoordPair([91, 0]));
    assert.throws(() => assertCoordPair([-91, 0]));
    assert.throws(() => assertCoordPair([0, 181]));
    assert.throws(() => assertCoordPair([0, -181]));
  });
});

describe('requireFields', () => {
  it('throws for the first missing field with a message naming it', () => {
    assert.throws(
      () => requireFields({ email: 'a@b.com', password: '' }, ['email', 'password']),
      (err) => err.status === 400 && /password/.test(err.message)
    );
  });
  it('passes when all fields are truthy', () => {
    assert.doesNotThrow(() => requireFields({ a: 1, b: 'x' }, ['a', 'b']));
  });
});
