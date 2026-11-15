// ── Integration Test Setup ──────────────────────────────────────────
//
// Sets up test environment, database connection.
// Uses existing running server on port 5000 for tests.

import { testConnection, ensureDatabase } from '../../db.js';

let testDbConnected = false;

export async function setupIntegrationTests() {
  try {
    // Test database connection
    testDbConnected = await testConnection();
    if (!testDbConnected) {
      console.warn('Integration tests: Database connection failed - tests will be skipped');
      return false;
    }

    // Ensure database schema exists
    await ensureDatabase();
    console.log('Integration tests: Database ready');

    return true;
  } catch (err) {
    console.error('Integration tests setup failed:', err.message);
    return false;
  }
}

export async function teardownIntegrationTests() {
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
    testServer = null;
    console.log('Integration tests: Test server stopped');
  }
}

export function isTestDbConnected() {
  return testDbConnected;
}

// Global test configuration
export const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  timeout: 10000,
};