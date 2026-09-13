import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signToken, publicUser, publicDriver } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, notFound, conflict, unauthorized } from '../lib/AppError.js';
import { ok, created } from '../lib/http.js';
import { normalizeEmail, trim, assertEmail, assertPassword, requireFields } from '../lib/validation.js';

const BCRYPT_ROUNDS = 12;
const router = Router();

// ── POST /api/auth/register ──────────────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const fullname = trim(req.body.fullname);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password || '';

  requireFields({ fullname, email, password }, ['fullname', 'email']);
  assertEmail(email);
  assertPassword(password);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw conflict('Email already exists!');

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const inserted = await pool.query(
    "INSERT INTO users (fullname, email, password_hash, role) VALUES ($1, $2, $3, 'passenger') RETURNING *",
    [fullname, email, hash]
  );
  created(res, { message: 'Account created successfully!', user: publicUser(inserted.rows[0]) });
}));

// ── POST /api/auth/register-driver ───────────────────────
router.post('/register-driver', asyncHandler(async (req, res) => {
  const fullname = trim(req.body.fullname);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password || '';
  const licenseNumber = trim(req.body.license_number);
  const todaAssociation = trim(req.body.toda_association) || null;
  const trikeNumber = trim(req.body.trike_number) || null;
  const vehiclePlate = trim(req.body.vehicle_plate).toUpperCase() || null;
  const contactNumber = trim(req.body.contact_number) || null;

  requireFields({ fullname, email, password, license_number: licenseNumber }, ['fullname', 'email', 'license_number']);
  assertEmail(email);
  assertPassword(password);
const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) throw conflict('Email already exists!');

    const licenseTaken = await client.query('SELECT id FROM drivers WHERE license_number = $1', [licenseNumber]);
    if (licenseTaken.rows.length > 0) throw conflict('That license number is already registered.');

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const insertedUser = await client.query(
      "INSERT INTO users (fullname, email, password_hash, role) VALUES ($1, $2, $3, 'driver') RETURNING *",
      [fullname, email, hash]
    );
    const insertedDriver = await client.query(
      `INSERT INTO drivers (user_id, license_number, toda_association, trike_number, vehicle_plate, contact_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [insertedUser.rows[0].id, licenseNumber, todaAssociation, trikeNumber, vehiclePlate, contactNumber]
    );
    await client.query('COMMIT');
    created(res, {
      message: 'Driver account created! Your application is pending TODA verification.',
      user: publicUser(insertedUser.rows[0]),
      driver: publicDriver(insertedDriver.rows[0]),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// ── POST /api/auth/login ─────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password || '';
  if (!email || !password) throw badRequest('Please fill in all fields.');

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw unauthorized('Invalid email or password.');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw unauthorized('Invalid email or password.');

  const token = signToken(user.id);
  ok(res, { token, user: publicUser(user) });
}));

// ── POST /api/auth/reset-password ─────────────────────────
// Safe flow: verifies the current password before allowing a change, instead of
// a remotely exploitable "set any password for this email" endpoint.
router.post('/reset-password', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const currentPassword = req.body.current_password || '';
  const newPassword = req.body.new_password || '';

  if (!email || !currentPassword || !newPassword) {
    throw badRequest('Email, current password, and new password are required.');
  }
  assertPassword(newPassword);

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw notFound('No account found with this email address.');

  const verified = await bcrypt.compare(currentPassword, user.password_hash);
  if (!verified) throw unauthorized('Current password is incorrect.');

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
  ok(res, { message: 'Password updated successfully.' });
}));

export default router;