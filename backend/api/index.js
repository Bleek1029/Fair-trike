// Vercel serverless entry point for the Express app.
import app from '../server.js';
import { ensureDatabase } from '../db.js';

// Bootstrap the schema once per cold start (idempotent: CREATE IF NOT EXISTS).
const ready = ensureDatabase().catch((err) => {
  console.error('❌ Database bootstrap failed:', err.message);
});

export default async function handler(req, res) {
  await ready;
  return app(req, res);
}
