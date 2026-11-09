// ── Stop Fairtrike: free the app server and admin dashboard ports ──
// Useful when a previous run (or a crashed terminal) is still holding a port.
//
// Works from the project root or from backend/ (backend's `npm run stop`
// delegates here). Ports come from backend/.env via config.js, so PORT /
// ADMIN_PORT overrides in the environment are honoured too.
import { execSync } from 'node:child_process';
import { env } from '../backend/config.js';

const ports = [env.port, env.adminPort];

// PIDs currently listening on a port (Windows + macOS/Linux).
function listeners(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen ` +
          `-ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"`,
        { encoding: 'utf8' },
      ).trim();
      return out ? out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
    }
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
    return out ? out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
  } catch {
    return []; // no listener / command unavailable
  }
}

console.log('🛑 Freeing Fairtrike ports…\n');
let stopped = 0;

for (const port of ports) {
  const pids = listeners(port);
  if (pids.length === 0) {
    console.log(`• port ${port}: free`);
    continue;
  }
  for (const pid of pids) {
    try {
      // /T also kills the child processes (npm → node server.js → admin-server.js).
      if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      else process.kill(Number(pid), 'SIGTERM');
      console.log(`• port ${port}: stopped PID ${pid}`);
      stopped += 1;
    } catch {
      console.log(`• port ${port}: could not stop PID ${pid} — try again from an elevated shell`);
    }
  }
}

console.log(
  stopped > 0
    ? `\n✅ Stopped ${stopped} process(es). Run \`npm start\` to launch again.`
    : '\n✅ Nothing was holding the ports — a fresh `npm start` will work.',
);