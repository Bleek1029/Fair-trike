// ── Launch the backend ──
//
// Self-contained on purpose: it only references files inside backend/, so
// `npm start` works even if this folder is copied or deployed on its own.
//
//   node start.mjs           → single server (dual-port locally, single-port on Render)
//   node start.mjs --dev     → with --watch (auto-restart)
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { env } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');
const watch = isDev ? ['--watch'] : [];

// ── Ensure deps exist (Render free tier: build-phase node_modules don't persist) ──
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('📦 Installing backend dependencies (deploy-time fallback)…');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCmd, ['ci', '--no-fund', '--no-audit'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error('❌ Failed to install backend dependencies.');
    process.exit(1);
  }
}

// Shared spawn options: run in backend/, pipe output to this console.
const spawnOpts = {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
};

console.log('\n🚀 Starting Fairtrike…');

if (env.singlePort) {
  // ─── Single-port mode (Render, etc.): one server serves everything ───
  const server = spawn(process.execPath, [...watch, 'server.js'], spawnOpts);

  setTimeout(() => {
    console.log(`👉 Open http://localhost:${env.port} in your browser.`);
    console.log(`🛡️  Admin dashboard: http://localhost:${env.port}/admin`);
  }, 1500);

  process.on('SIGINT', () => { server.kill(); process.exit(0); });
  process.on('SIGTERM', () => { server.kill(); process.exit(0); });
  server.on('exit', (code) => process.exit(code ?? 0));
} else {
  // ─── Dual-port mode (local dev): app + admin on separate ports ───
  const server = spawn(process.execPath, [...watch, 'server.js'], spawnOpts);
  const admin = spawn(process.execPath, [...watch, 'admin-server.js'], spawnOpts);

  setTimeout(() => {
    if (isDev) {
      console.log(`👉 Frontend (dev): http://localhost:5173  |  Backend API: http://localhost:${env.port}/api`);
      console.log('   (admin serves frontend/dist; set ADMIN_SPA_ORIGIN=http://localhost:5173 for HMR)');
    } else {
      console.log(`👉 Open http://localhost:${env.port} in your browser.`);
    }
    console.log(`🛡️  Admin dashboard: http://localhost:${env.adminPort}/admin`);
  }, 1500);

  let stopping = false;
  function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    server.kill();
    admin.kill();
    process.exit(code);
  }

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  server.on('exit', (code) => shutdown(code ?? 0));
  admin.on('exit', (code) => shutdown(code ?? 0));
}