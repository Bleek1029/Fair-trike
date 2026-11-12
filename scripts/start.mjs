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
const skipFrontendInstall = process.argv.includes('--skip-frontend-install') || process.env.SKIP_FRONTEND_INSTALL === 'true';

// Windows needs shell:true to spawn .cmd files (Node >= 18.20 rejects bare .cmd spawn).
const npmOpts = { shell: process.platform === 'win32' };

// ── Make sure a frontend build exists (skipped in --dev mode) ──
if (!isDev && !skipFrontendInstall) {
  const missing = !fs.existsSync(distIndex);
  if (missing || forceRebuild) {
    if (missing) {
      console.log('🏗️  No frontend build found — building it now (first run only)…');
    } else {
      console.log('🏗️  --rebuild flag set — rebuilding the frontend…');
    }
    // Ensure the frontend node_modules exists (needed for CI/deploy)
    const frontendNodeModules = path.join(frontendDir, 'node_modules');
    if (!fs.existsSync(frontendNodeModules)) {
      console.log('📦 Installing frontend dependencies…');
      const installEnv = { ...process.env, NODE_ENV: 'development' };
      const installResult = spawnSync(npmCmd, ['install', '--prefix', frontendDir], { stdio: 'inherit', shell: process.platform === 'win32', env: installEnv });
      if (installResult.status !== 0) {
        console.error('❌ Failed to install frontend dependencies.');
        process.exit(1);
      }
    }
    const buildEnv = { ...process.env, NODE_ENV: 'development' };
    const build = spawnSync(npmCmd, ['run', 'build'], { cwd: frontendDir, stdio: 'inherit', ...npmOpts, env: buildEnv });
    if (build.status !== 0) {
      console.error('❌ Frontend build failed. Try: npm run setup');
      process.exit(build.status ?? 1);
    }
  } else {
    console.log('✅ Frontend build found (use --rebuild to rebuild).');
  }
} else if (skipFrontendInstall) {
  console.log('⏭️  Skipping frontend install/build (SKIP_FRONTEND_INSTALL=true)');
}

// ── Ensure backend deps exist (fallback if build phase deps didn't persist) ──
const backendNodeModules = path.join(backendDir, 'node_modules');
if (!fs.existsSync(backendNodeModules)) {
  console.log('📦 Installing backend dependencies (fallback)…');
  const installEnv = { ...process.env, NODE_ENV: 'development' };
  const installResult = spawnSync(npmCmd, ['install', '--prefix', backendDir], { stdio: 'inherit', shell: process.platform === 'win32', env: installEnv });
  if (installResult.status !== 0) {
    console.error('❌ Failed to install backend dependencies.');
    process.exit(1);
  }
}

// ── Start the servers ──
// Both processes (app + admin dashboard) are owned by backend/start.mjs so that
// `npm start` inside backend/ behaves identically. This root script only adds
// the frontend build check above (the child prints its own startup banner).
const launcherArgs = ['start.mjs', ...(isDev ? ['--dev'] : [])];
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
