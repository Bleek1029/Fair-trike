// ── Integration Test Runner ───────────────────────────────────────────
//
// Runs integration tests against an already running server by executing
// the test files directly in the current process (no child process needed).

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// PROJECT_ROOT should be the backend directory (two levels up from tests/integration)
const PROJECT_ROOT = resolve(__dirname, '..', '..');

async function runIntegrationTests() {
  console.log('🧪 Starting integration test runner...');

  // Check if server is already running on port 5000
  const checkServer = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      return response.ok;
    } catch {
      return false;
    }
  };

  console.log('🔍 Checking for running server on port 5000...');
  const isRunning = await checkServer();

  if (!isRunning) {
    console.log('❌ No server running on port 5000.');
    console.log('   Please start the server first with: npm run dev');
    console.log('   Then run: npm run test:integration');
    process.exit(1);
  }

  console.log('✅ Server is running, running integration tests...\n');

  // Run integration tests directly using node's test runner in this process
  // This avoids all Windows child_process spawn issues
  const testFiles = [
    'tests/integration/auth.test.js',
  ];

  let hasError = false;

  for (const testFile of testFiles) {
    // PROJECT_ROOT is already the fairtrike-modern root, testFile is relative to it
    const fullPath = resolve(PROJECT_ROOT, testFile);
    // Convert to file:// URL for ES modules (required on Windows)
    const fileUrl = `file:///${fullPath.replace(/\\/g, '/')}`;
    console.log(`\n📋 Running ${testFile}...`);

    try {
      // Import and run the test file using file:// URL
      await import(fileUrl);
      console.log(`✅ ${testFile} passed`);
    } catch (err) {
      console.error(`❌ ${testFile} failed:`, err.message);
      hasError = true;
    }
  }

  if (hasError) {
    throw new Error('Some integration tests failed');
  }

  console.log('\n✅ All integration tests passed!');
}

runIntegrationTests().catch((err) => {
  console.error('❌ Integration test runner failed:', err.message);
  process.exit(1);
});