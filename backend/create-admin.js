// Create admin user for Fairtrike
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { env } from './config.js';

const BCRYPT_ROUNDS = 12;

const client = new pg.Client({ ...env.db });

async function main() {
  await client.connect();

  // Check if admin already exists
  const existing = await client.query(
    "SELECT id, email FROM users WHERE role = 'admin'"
  );

  if (existing.rows.length > 0) {
    console.log('✅ Admin user already exists:');
    existing.rows.forEach((u) => console.log(`   - ${u.email} (id: ${u.id})`));
    await client.end();
    return;
  }

  const email = 'admin@fairtrike.test';
  const password = 'admin123456';
  const fullname = 'Fairtrike Admin';

  console.log('🔐 Creating admin user...');

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await client.query(
    `INSERT INTO users (fullname, email, password_hash, role, status)
     VALUES ($1, $2, $3, 'admin', 'approved')
     RETURNING id, email, role, status`,
    [fullname, email, hash]
  );

  const admin = result.rows[0];
  console.log('✅ Admin user created successfully:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Status: ${admin.status}`);
  console.log('');
  console.log('🔗 Login at: http://localhost:5001/admin/login');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  client.end().catch(() => {});
  process.exit(1);
});