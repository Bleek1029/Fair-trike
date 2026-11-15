// ── Test Helpers: Auth ────────────────────────────────────────────────

import { pool } from '../../db.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function createTestUser(overrides = {}) {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const password = overrides.password || 'TestPass123';
  const fullname = overrides.fullname || 'Test User';
  const role = overrides.role || 'passenger';

  const hash = await hashPassword(password);
  const result = await pool.query(
    `INSERT INTO users (fullname, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'approved')
     RETURNING *`,
    [fullname, email, hash, role]
  );
  return result.rows[0];
}

export async function createTestDriver(overrides = {}) {
  const user = await createTestUser({ ...overrides, role: 'driver' });
  const result = await pool.query(
    `INSERT INTO drivers (user_id, license_number, status)
     VALUES ($1, $2, 'approved')
     RETURNING *`,
    [user.id, `LIC-${Date.now()}`]
  );
  return { user, driver: result.rows[0] };
}

export async function cleanupTestData(email) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
  await pool.query('DELETE FROM driver_documents WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
  await pool.query('DELETE FROM drivers WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
}