// ── Launch the whole backend: the app server (API + built frontend) and the
// dedicated admin dashboard, each on its own port (env.port / env.adminPort) ──
//
// Self-contained on purpose: it only references files inside backend/, so
// `npm start` works even if this folder is copied or deployed on its own.
//
//   node start.mjs           → both servers
//   node start.mjs --dev     → both servers with --watch (auto-restart)
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--dev');
const watch = isDev ? ['--watch'] : [];

// Shared spawn options: run in backend/, pipe output to this console.
const spawnOpts = {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
};

console.log('\n🚀 Starting Fairtrike…');

// The app: API + the built React frontend, both on env.port.
const server = spawn(process.execPath, [...watch, 'server.js'], spawnOpts);

// The admin dashboard on its own port; it proxies /api and /uploads to the app
// server above, so it must run alongside it (not instead of it).
const admin = spawn(process.execPath, [...watch, 'admin-server.js'], spawnOpts);

// Let both servers print their own banners first, then give the URLs.
setTimeout(() => {
  if (isDev) {
    console.log(`👉 Frontend (dev): http://localhost:5173  |  Backend API: http://localhost:${env.port}/api`);
    console.log('   (admin serves frontend/dist; set ADMIN_SPA_ORIGIN=http://localhost:5173 for HMR)');
  } else {
    console.log(`👉 Open http://localhost:${env.port} in your browser.`);
  }
  console.log(`🛡️  Admin dashboard: http://localhost:${env.adminPort}/admin`);
}, 1500);

// If either server dies, stop the other one too rather than leaving a
// half-running stack behind.
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