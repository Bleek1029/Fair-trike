// Android launcher (Capacitor): builds the web bundle, syncs it into the native
// project, then compiles + installs the debug APK on a connected device.
//
// It hides two machine-level traps that otherwise produce confusing failures:
//   • Capacitor 8 compiles its Android module with `--release 21`, so Gradle needs
//     JDK 21+ — a JDK 17 JAVA_HOME fails with "invalid source release: 21".
//   • ANDROID_HOME is often stale/wrong; Gradle is pointed at the real SDK via
//     android/local.properties, and adb is resolved from that same folder.
//
// Usage:
//   npm run android                                    # build + install + launch
//   npm run android -- --apk                           # only produce the debug APK
//   npm run android -- --api http://192.168.0.121:5000 # backend on a LAN IP (real phone)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const frontendDir = path.join(root, 'frontend');
const androidDir = path.join(frontendDir, 'android');
const isWin = process.platform === 'win32';
// Run Node CLIs and adb directly to preserve paths containing spaces.
// On Windows, only the Gradle batch wrapper needs an explicit cmd.exe call.

const argv = process.argv.slice(2);
const flagValue = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const apiOrigin = flagValue('--api');
const apkOnly = argv.includes('--apk');

// ── JDK 21+ (Capacitor's Android module compiles with --release 21) ─
function javaMajorOf(dir) {
  try {
    const match = fs.readFileSync(path.join(dir, 'release'), 'utf8').match(/JAVA_VERSION="(\d+)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function androidStudioJdkPaths() {
  if (isWin) return [path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr')];
  if (process.platform === 'darwin') return ['/Applications/Android Studio.app/Contents/jbr/Contents/Home'];
  return [path.join(os.homedir(), 'android-studio', 'jbr')];
}

function findJdk() {
  const candidates = [
    process.env.JAVA_HOME,
    process.env.JAVA_HOME_21_X64,
    process.env.JAVA_HOME_25_X64,
    ...androidStudioJdkPaths(),
  ].filter(Boolean);

  for (const dir of candidates) {
    const major = javaMajorOf(dir);
    if (major && major >= 21) return { dir, major };
  }

  console.error('❌ Capacitor 8 needs a JDK 21+ to build the Android app, but none was found.');
  console.error(`   Checked: ${candidates.map((d) => `${d} (${javaMajorOf(d) ?? 'no release file'})`).join(', ') || 'nothing'}`);
  console.error('   Fix either one, then re-run:');
  console.error('     winget install EclipseAdoptium.Temurin.21.JDK     # or another JDK 21+');
  console.error('     setx JAVA_HOME "C:\\Program Files\\Android\\Android Studio\\jbr"');
  process.exit(1);
}

// ── Android SDK (adb falls back to PATH if the folder cannot be found) ──
function sdkRoot() {
  let fromLocalProperties = null;
  try {
    const match = fs.readFileSync(path.join(androidDir, 'local.properties'), 'utf8').match(/^sdk\.dir=(.+)$/m);
    // local.properties escapes ':' and '\' the Java-properties way.
    if (match) fromLocalProperties = match[1].trim().replace(/\\:/g, ':').replace(/\\\\/g, '\\');
  } catch { /* not generated yet — fall through to the env vars */ }

  const candidates = [
    fromLocalProperties,
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    isWin && path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Android', 'Sdk'),
    !isWin && path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    !isWin && path.join(os.homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);

  return candidates.find((dir) => fs.existsSync(dir)) || null;
}

function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ ${label} …`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (res.error) {
    console.error(`❌ ${label} failed: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`❌ ${label} failed (exit ${res.status ?? 'spawn error'}).`);
    process.exit(res.status ?? 1);
  }
}

// `cap` comes from the frontend's own node_modules, so no global install is needed.
function capCommand() {
  const local = path.join(frontendDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');
  return fs.existsSync(local) ? local : null;
}

const appId = JSON.parse(fs.readFileSync(path.join(frontendDir, 'capacitor.config.json'), 'utf8')).appId;
const jdk = findJdk();
const sdk = sdkRoot();
// Gradle resolves the SDK from android/local.properties, but ANDROID_HOME/
// ANDROID_SDK_ROOT outrank it — and this machine's value is stale — so pin the
// detected one for every child process.
const buildEnv = {
  ...process.env,
  JAVA_HOME: jdk.dir,
  ...(sdk ? { ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk } : {}),
};

console.log(`🤖 Android build — JDK ${jdk.major} (${jdk.dir})`);
console.log(`📦 SDK: ${sdk || 'not found — Gradle will rely on android/local.properties'}`);

// vite and cap are spawned directly through node — no .cmd shims involved.
const viteJs = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteJs)) {
  console.error('❌ vite not found. Run `npm install` inside frontend/ first.');
  process.exit(1);
}

run(
  'Building the web bundle for the native shell',
  process.execPath,
  [viteJs, 'build'],
  { cwd: frontendDir, env: { ...buildEnv, ...(apiOrigin ? { VITE_NATIVE_API_ORIGIN: apiOrigin } : {}) } },
);

const cap = capCommand();
if (!cap) {
  console.error('❌ Capacitor CLI not found. Run `npm install` inside frontend/ first.');
  process.exit(1);
}
run('Syncing web assets into frontend/android', process.execPath, [cap, 'sync', 'android'], { cwd: frontendDir, env: buildEnv });
// Use a fixed command relative to cwd: no paths or user input are interpolated
// into shell syntax. Node's shell option stays false, avoiding DEP0190.
run(
  'Compiling the debug APK',
  isWin ? (process.env.ComSpec || 'cmd.exe') : path.join(androidDir, 'gradlew'),
  isWin ? ['/d', '/s', '/c', '.\\gradlew.bat assembleDebug'] : ['assembleDebug'],
  { cwd: androidDir, env: buildEnv, ...(isWin ? { windowsVerbatimArguments: true } : {}) },
);

const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (apkOnly || !fs.existsSync(apk)) {
  console.log(`\n✅ APK ready: ${apk}`);
  process.exit(0);
}

// ── Install + launch on the first authorised device ──
const adbBin = isWin ? 'adb.exe' : 'adb';
const adb = sdk && fs.existsSync(path.join(sdk, 'platform-tools', adbBin))
  ? path.join(sdk, 'platform-tools', adbBin)
  : 'adb';

// adb is an executable, not a .cmd file. Avoid shell parsing of SDK paths
// containing spaces (for example, C:\Users\Erolin Dwayne\...).
const listed = spawnSync(adb, ['devices'], { encoding: 'utf8', shell: false });
if (listed.error || listed.status !== 0) {
  console.error(`❌ Could not list Android devices using ${adb}.`);
  console.error(listed.error?.message || listed.stderr?.trim() || `adb exited with status ${listed.status}.`);
  process.exit(1);
}
const devices = (listed.stdout || '')
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.trim().split(/\s+/))
  .filter(([id, state]) => id && state === 'device')
  .map(([id]) => id);

const serial = devices[0];
if (!serial) {
  console.log(`\n✅ APK ready: ${apk}`);
  console.log('⚠️  No authorised device found, so nothing was installed.');
  console.log('   • Plug in a phone with USB debugging on, then `adb devices` should list it as `device` (not `unauthorized`).');
  console.log('   • If it says `unauthorized`, accept the "Allow USB debugging?" dialog on the phone.');
  process.exit(0);
}

run(`Installing on ${serial}`, adb, ['-s', serial, 'install', '-r', apk], { env: buildEnv, shell: false });
run('Launching Fairtrike', adb, ['-s', serial, 'shell', 'am', 'start', '-n', `${appId}/.MainActivity`], { env: buildEnv, shell: false });

console.log('\n✅ Fairtrike is running in the Android app.');
console.log(`   Backend: ${apiOrigin || process.env.VITE_NATIVE_API_ORIGIN || 'http://<your-lan-ip>:5000 (use --api on a physical phone)'}`);