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
// Use `npm start` in backend/ so `prestart` hook runs (installs deps on Render free tier).
const launcherArgs = ['start', ...(isDev ? ['--dev'] : [])];
// On Windows we can't use process groups, so we track PIDs and kill them all on exit.
// On Unix, we use a negative PID (process group) to kill the entire tree.
const isWindows = process.platform === 'win32';
const launcher = spawn(npmCmd, launcherArgs, {
  cwd: backendDir,
  stdio: 'inherit',
  shell: isWindows,
  env: { ...process.env, FORCE_COLOR: '1' },
  // On Unix, create a new process group so we can kill the whole tree
  detached: !isWindows,
});

let shutdownInProgress = false;
async function shutdown(signal) {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  console.log(`\n🛑 Stopping Fairtrike (${signal})…`);

  if (!isWindows && launcher.pid) {
    // Kill the entire process group (negative PID = process group)
    try {
      process.kill(-launcher.pid, 'SIGTERM');
      // Give it a moment, then force kill
      setTimeout(() => {
        try { process.kill(-launcher.pid, 'SIGKILL'); } catch {}
      }, 2000);
    } catch {}
  } else if (launcher.pid) {
    // Windows: use taskkill /T to kill the entire process tree
    try {
      const { execSync } = await import('node:child_process');
      execSync(`taskkill /PID ${launcher.pid} /T /F`, { stdio: 'ignore' });
    } catch {}
  }

  // Also free ports directly (same logic as stop.mjs) to ensure cleanup
  try {
    const { execSync } = await import('node:child_process');
    const { env: backendEnv } = await import('../backend/config.js');
    const ports = [backendEnv.port, backendEnv.adminPort];
    for (const port of ports) {
      if (isWindows) {
        try {
          const out = execSync(
            `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
            { encoding: 'utf8' },
          ).trim();
          if (out) {
            for (const pid of out.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
              execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
            }
          }
        } catch {}
      } else {
        try {
          const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
          if (out) {
            for (const pid of out.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
              process.kill(Number(pid), 'SIGKILL');
            }
          }
        } catch {}
      }
    }
  } catch {}

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// If launcher exits on its own, exit with its code
launcher.on('exit', (code) => {
  if (!shutdownInProgress) {
    process.exit(code ?? 0);
  }
});
