// ── Tests: frontend/src/lib/format.js ──
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDist, fmtTime, formatPeso } from '../../src/lib/format.js';

describe('fmtDist', () => {
  it('renders km above 1000 m with one decimal', () => {
    assert.equal(fmtDist(4823), '4.8 km');
    assert.equal(fmtDist(1000), '1.0 km');
  });
  it('renders whole metres below 1 km', () => {
    assert.equal(fmtDist(845.4), '845 m');
    assert.equal(fmtDist(0), '0 m');
  });
  it('degrades gracefully on non-finite input', () => {
    assert.equal(fmtDist(NaN), '—');
    assert.equal(fmtDist(Infinity), '—');
    assert.equal(fmtDist(undefined), '—');
  });
});

describe('fmtTime', () => {
  it('formats minutes and hours', () => {
    assert.equal(fmtTime(45), '45 sec');
    assert.equal(fmtTime(90), '1 min');
    assert.equal(fmtTime(720), '12 min');
    assert.equal(fmtTime(3725), '1h 2m');
  });
  it('degrades gracefully on non-finite input', () => {
    assert.equal(fmtTime(NaN), '—');
    assert.equal(fmtTime(undefined), '—');
  });
});

describe('formatPeso', () => {
  it('formats with ₱ and fixed decimals', () => {
    assert.equal(formatPeso(45), '₱45.00');
    assert.equal(formatPeso(12.5), '₱12.50');
    assert.equal(formatPeso(45, 0), '₱45');
  });
  it('falls back to ₱0.00 on non-finite input', () => {
    assert.equal(formatPeso(NaN), '₱0.00');
    assert.equal(formatPeso(undefined), '₱0.00');
  });
});
