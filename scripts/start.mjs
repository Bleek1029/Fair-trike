// Unified launcher: builds the frontend if needed, then runs the backend,
// which serves BOTH the API and the built React app on one port.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');
const distIndex = path.join(frontendDir, 'dist', 'index.html');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const isDev = process.argv.includes('--dev');
const forceRebuild = process.argv.includes('--rebuild');

// Windows needs shell:true to spawn .cmd files (Node >= 18.20 rejects bare .cmd spawn).
const npmOpts = { shell: process.platform === 'win32' };

// ── Make sure a frontend build exists (skipped in --dev mode) ──
if (!isDev) {
  const missing = !fs.existsSync(distIndex);
  if (missing || forceRebuild) {
    if (missing) {
      console.log('🏗️  No frontend build found — building it now (first run only)…');
    } else {
      console.log('🏗️  --rebuild flag set — rebuilding the frontend…');
    }
    const build = spawnSync(npmCmd, ['run', 'build'], { cwd: frontendDir, stdio: 'inherit', ...npmOpts });
    if (build.status !== 0) {
      console.error('❌ Frontend build failed. Try: npm run setup');
      process.exit(build.status ?? 1);
    }
  } else {
    console.log('✅ Frontend build found (use --rebuild to rebuild).');
  }
}

// ── Start the servers ──
// Both processes (app + admin dashboard) are owned by backend/start.mjs so that
// `npm start` inside backend/ behaves identically. This root script only adds
// the frontend build check above (the child prints its own startup banner).
const launcherArgs = [...(isDev ? ['--dev'] : []), 'start.mjs'];
const launcher = spawn(process.execPath, launcherArgs, {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' },
});

function shutdown() {
  console.log('\n🛑 Stopping Fairtrike…');
  launcher.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
launcher.on('exit', (code) => process.exit(code ?? 0));