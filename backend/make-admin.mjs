// ── Promote an existing account to admin (run from backend/) ──
// Usage: node --env-file=.env make-admin.mjs admin@example.com
import pg from 'pg';
import { env } from './config.js';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node make-admin.mjs <email>');
  process.exit(1);
}

const client = new pg.Client({ ...env.db });
await client.connect();
const result = await client.query(
  `UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, fullname, email, role`,
  [email]
);
if (result.rows.length === 0) {
  console.error(`No account found with email ${email}. Register first, then run this.`);
} else {
  const u = result.rows[0];
  console.log(`✅ ${u.fullname} <${u.email}> is now an admin.`);
}
await client.end();
