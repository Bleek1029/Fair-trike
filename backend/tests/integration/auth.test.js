// ── Integration Tests: Auth API ───────────────────────────────────────
//
// Tests for /api/auth endpoints using a real database connection.
// Requires TEST_DATABASE_URL environment variable or uses default from config.

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../db.js';
import { testConnection } from '../../db.js';
import { setupIntegrationTests, isTestDbConnected, TEST_CONFIG } from './setup.js';
import { cleanupTestData } from '../helpers/auth.js';

const TEST_PASSWORD = 'TestPass123';
const TEST_FULLNAME = 'Integration Test User';
const baseUrl = TEST_CONFIG.baseUrl;

// Generate unique email for each test run
function uniqueEmail(prefix = 'integration-test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}@example.com`;
}

describe('Auth API Integration', () => {
  before(async () => {
    const connected = await setupIntegrationTests();
    if (!connected) {
      console.warn('Skipping integration tests - no database connection');
      return;
    }
  });

  after(async () => {
    if (isTestDbConnected()) {
      // Clean up test data - cleanupTestData handles all test emails
      await cleanupTestData('integration-test');
      await pool.end();
    }
  });

  beforeEach(async () => {
    if (isTestDbConnected()) {
      await cleanupTestData('integration-test');
    }
  });

  it('POST /api/auth/register - creates new user', async () => {
    const testEmail = uniqueEmail('register-test');
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: TEST_FULLNAME,
        email: testEmail,
        password: TEST_PASSWORD,
      }),
    });

    assert.equal(response.status, 201);
    const data = await response.json();
    console.log('[TEST DEBUG] Register response:', JSON.stringify(data, null, 2));
    assert.ok(data.success);
    assert.ok(data.user);
    assert.equal(data.user.email, testEmail.toLowerCase());
    assert.equal(data.user.fullname, TEST_FULLNAME);
    assert.equal(data.user.role, 'passenger');
    // Register doesn't return tokens - user must login separately
    assert.ok(!data.accessToken);
    assert.ok(!data.refreshToken);
  });

  it('POST /api/auth/register - rejects duplicate email', async () => {
    const testEmail = uniqueEmail('duplicate-test');
    // First registration
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: TEST_FULLNAME,
        email: testEmail,
        password: TEST_PASSWORD,
      }),
    });

    // Second registration with same email
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Another User',
        email: testEmail,
        password: 'DifferentPass123',
      }),
    });

    assert.equal(response.status, 409);
    const data = await response.json();
    assert.ok(!data.success);
    assert.equal(data.code, 'CONFLICT');
  });

  it('POST /api/auth/login - authenticates valid credentials', async () => {
    // Register first with unique email
    const testEmail = uniqueEmail('login-test');
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: TEST_FULLNAME,
        email: testEmail,
        password: TEST_PASSWORD,
      }),
    });

    // Now login
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: TEST_PASSWORD,
      }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    console.log('[TEST DEBUG] Login response:', JSON.stringify(data, null, 2));
    assert.ok(data.success);
    assert.ok(data.accessToken);
    assert.ok(data.refreshToken);
    assert.ok(data.user);
    assert.equal(data.user.email, testEmail.toLowerCase());
  });

  it('POST /api/auth/login - rejects invalid password', async () => {
    // Register first with unique email
    const testEmail = uniqueEmail('invalid-pass-test');
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: TEST_FULLNAME,
        email: testEmail,
        password: TEST_PASSWORD,
      }),
    });

    // Login with wrong password
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123',
      }),
    });

    assert.equal(response.status, 401);
    const data = await response.json();
    console.log('[TEST DEBUG] Invalid password response:', JSON.stringify(data, null, 2));
    assert.ok(!data.success);
    assert.equal(data.code, 'UNAUTHORIZED');
  });

  // NOTE: /api/auth/refresh and /api/auth/logout endpoints not yet implemented
// it('POST /api/auth/refresh - rotates refresh token', async () => { ... });
// it('POST /api/auth/logout - revokes refresh token', async () => { ... });
});