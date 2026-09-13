// One-shot project setup: installs backend + frontend deps, builds the frontend.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// Windows needs shell:true to spawn .cmd files (Node >= 18.20 rejects bare .cmd spawn).
const npmOpts = { shell: process.platform === 'win32' };

function run(label, cwd) {
  console.log(`\n📦 ${label} …`);
  const res = spawnSync(npmCmd, ['install', '--no-fund', '--no-audit'], { cwd, stdio: 'inherit', ...npmOpts });
  if (res.status !== 0) {
    console.error(`❌ ${label} failed (exit ${res.status}).`);
    process.exit(res.status ?? 1);
  }
}

run('Installing backend dependencies', backendDir);
run('Installing frontend dependencies', frontendDir);

console.log('\n🔨 Building the frontend …');
const build = spawnSync(npmCmd, ['run', 'build'], { cwd: frontendDir, stdio: 'inherit', ...npmOpts });
if (build.status !== 0) {
  console.error('❌ Frontend build failed.');
  process.exit(build.status ?? 1);
}

console.log('\n✅ Setup complete! Now run:  npm start');