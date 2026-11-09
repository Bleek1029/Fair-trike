// Start the Fairtrike backend server
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'backend');

console.log('🚀 Starting Fairtrike backend...');
console.log(`   Working directory: ${serverDir}`);

const server = spawn('node', ['server.js'], {
  cwd: serverDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGTERM');
});

console.log('✅ Server started successfully\n');
