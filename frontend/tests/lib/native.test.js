import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNativeApp, DEFAULT_NATIVE_API_ORIGIN } from '../../src/lib/native.js';
import { API_BASE, UPLOADS_BASE, IS_NATIVE_APP } from '../../src/config.js';

describe('isNativeApp', () => {
  it('is false without the Capacitor global (plain browser and Node)', () => {
    assert.equal(isNativeApp(undefined), false);
    assert.equal(isNativeApp({}), false);
  });
  it('uses isNativePlatform() when the runtime exposes it', () => {
    assert.equal(isNativeApp({ Capacitor: { isNativePlatform: () => true } }), true);
    assert.equal(isNativeApp({ Capacitor: { isNativePlatform: () => false } }), false);
  });
  it('falls back to getPlatform() for runtimes without isNativePlatform()', () => {
    assert.equal(isNativeApp({ Capacitor: { getPlatform: () => 'android' } }), true);
    assert.equal(isNativeApp({ Capacitor: { getPlatform: () => 'web' } }), false);
  });
});

describe('API configuration outside the native shell', () => {
  it('keeps /api and /uploads origin-relative so one bundle fits every host', () => {
    assert.equal(IS_NATIVE_APP, false);
    assert.equal(API_BASE, '/api');
    assert.equal(UPLOADS_BASE, '/uploads');
  });
  it('keeps 10.0.2.2 as the native default origin', () => {
    assert.equal(DEFAULT_NATIVE_API_ORIGIN, 'http://10.0.2.2:5000');
  });
});