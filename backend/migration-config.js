// Migration configuration for node-pg-migrate
// Usage: npx node-pg-migrate --config migration-config.js up/down

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  database: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl: env.db.ssl ? { rejectUnauthorized: env.db.sslMode === 'verify-full' } : false,
  },
  migrationsTable: 'pgmigrations',
  dir: resolve(__dirname, 'migrations'),
  direction: 'up',
  verbose: true,
  dryRun: false,
  noLock: false,
  ensureDatabase: true,
  createDatabase: false,
  checkOrder: true,
  migrationsDir: resolve(__dirname, 'migrations'),
  singleTransaction: false,
  createMigration: {
    directory: resolve(__dirname, 'migrations'),
    templateFile: resolve(__dirname, 'migration-template.js'),
  },
};