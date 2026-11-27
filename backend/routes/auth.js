import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signAccessToken, createRefreshToken, rotateRefreshToken, revokeAllRefreshTokens, requireAuth, publicUser, publicDriver } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, notFound, conflict, unauthorized, forbidden } from '../lib/AppError.js';
import { ok, created } from '../lib/http.js';
import { rateLimiters } from '../lib/rateLimiter.js';
import { normalizeEmail, trim, assertEmail, assertPassword, requireFields } from '../lib/validation.js';
import { emitAdminUserCreated, emitAdminDriverCreated, emitAdminResetRequested } from '../socket.js';
import { sendPasswordResetCode, sendWelcomeEmail } from '../lib/email.js';

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
  const newUser = inserted.rows[0];
  created(res, { message: 'Account created! Wait for admin approval before signing in.', user: publicUser(newUser) });
  emitAdminUserCreated(newUser);
  Promise.resolve(sendWelcomeEmail(newUser.email, newUser.fullname, 'passenger')).catch(() => {});
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
    const newUser = insertedUser.rows[0];
    const newDriver = insertedDriver.rows[0];
    created(res, {
      message: 'Driver account created! Your application is pending TODA verification.',
      user: publicUser(newUser),
      driver: publicDriver(newDriver),
    });
    emitAdminUserCreated(newUser);
    emitAdminDriverCreated(newDriver);
    Promise.resolve(sendWelcomeEmail(newUser.email, newUser.fullname, 'driver')).catch(() => {});
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// ── POST /api/auth/login ─────────────────────────────────
// Commuter (passenger) sign-in. Driver accounts are rejected here so each
// portal stays role-specific; drivers use /api/auth/login-driver instead.
router.post('/login', asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const email = normalizeEmail(body.email);
  const password = body.password || '';
  if (!email || !password) throw badRequest('Please fill in all fields.');

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw unauthorized('Invalid email or password.');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw unauthorized('Invalid email or password.');

  if (user.role === 'driver') {
    throw forbidden('This is a driver account. Please sign in through the Driver Portal.');
  }

  // Require admin approval for passenger accounts
  if (user.status !== 'approved') {
    throw forbidden('Your account is pending admin approval. Please wait for verification.');
  }

  // NOTE: admins are NOT rejected here. A single-port deployment (Vercel) has
  // only this login page, so blocking admins would lock them out; the SPA hides
  // it on the app port when a separate admin port exists, and /login-admin
  // enforces the admin role server-side.
  const accessToken = signAccessToken(user.id, user.role);
  const { token: refreshToken } = await createRefreshToken(user.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  ok(res, { accessToken, refreshToken, user: publicUser(user) });
}));

// ── POST /api/auth/login-driver ──────────────────────────
// Driver-portal sign-in. Passenger accounts are rejected so the portals
// remain separate. Driver approval status is still handled elsewhere.
router.post('/login-driver', asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  const email = normalizeEmail(body.email);
  const password = body.password || '';
  if (!email || !password) throw badRequest('Please fill in all fields.');

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw unauthorized('Invalid email or password.');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw unauthorized('Invalid email or password.');

  if (user.role !== 'driver') {
    throw forbidden('This is a commuter account. Please sign in as a passenger.');
  }

  // Require admin approval for driver accounts
  if (user.status !== 'approved') {
    throw forbidden('Your driver account is pending admin approval. Please wait for verification.');
  }

  const accessToken = signAccessToken(user.id, user.role);
  const { token: refreshToken } = await createRefreshToken(user.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  ok(res, { accessToken, refreshToken, user: publicUser(user) });
}));

// ── POST /api/auth/login-admin ───────────────────────────
// Admin-dashboard sign-in. Only admin accounts are accepted.
router.post('/login-admin', asyncHandler(async (req, res) => {
  // Handle cases where body parser hasn't run or body is undefined
  const body = req.body ?? {};
  const email = normalizeEmail(body.email);
  const password = body.password || '';
  if (!email || !password) throw badRequest('Please fill in all fields.');

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) throw unauthorized('Invalid email or password.');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw unauthorized('Invalid email or password.');

  if (user.role !== 'admin') {
    throw forbidden('This account does not have admin access.');
  }

  const accessToken = signAccessToken(user.id, user.role);
  const { token: refreshToken } = await createRefreshToken(user.id, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  ok(res, { accessToken, refreshToken, user: publicUser(user) });
}));

// ── POST /api/auth/change-password ─────────────────────────
// Safe flow: verifies the current password before allowing a change.
router.post('/change-password', asyncHandler(async (req, res) => {
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
  // Invalidate all existing refresh tokens so stolen sessions can't persist.
  await revokeAllRefreshTokens(user.id);
  ok(res, { message: 'Password updated successfully.' });
}));

// ── POST /api/auth/forgot-password ─────────────────────────
// Initiates a password reset by email. Generates a 6-digit code, stores its
// hash in password_reset_requests, and sends the code via email.
router.post('/forgot-password', rateLimiters.passwordReset, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) throw badRequest('Email is required.');

  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    // Don't reveal whether email exists — always return success for security.
    return ok(res, { message: 'If an account exists, a reset code has been sent.' });
  }
  const userId = result.rows[0].id;
  console.log(`[Auth] User found for ${email} (id: ${userId}), generating reset code...`);

  const crypto = await import('node:crypto');

  // Generate a 6-digit numeric code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  // Store hashed code with 1-hour expiry (pending admin approval)
  const inserted = await pool.query(
    `INSERT INTO password_reset_requests (user_id, email, new_password_hash, status, admin_note, reviewed_by, reviewed_at, created_at)
     VALUES ($1, $2, $3, 'pending', 'Auto-generated via forgot-password flow', NULL, NULL, NOW())
     RETURNING id`,
    [userId, email, codeHash]
  );

  // Send password reset code via email. Await it so a failure surfaces as an error
  // instead of falsely telling the user a code was sent.
  await sendPasswordResetCode(email, code);

  ok(res, { message: 'If an account exists, a reset code has been sent.' });
}));

// ── POST /api/auth/reset-password ──────────────────────────
// Completes password reset using the 6-digit code emailed to the user.
// Verifies the code hash and updates the user's password.
router.post('/reset-password', asyncHandler(async (req, res) => {
  const code = req.body.code || '';
  const newPassword = req.body.new_password || '';

  if (!code || !newPassword) {
    throw badRequest('Reset code and new password are required.');
  }
  assertPassword(newPassword);

  const crypto = await import('node:crypto');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const result = await pool.query(
    `SELECT * FROM password_reset_requests
     WHERE new_password_hash = $1 AND status = 'approved' AND created_at > NOW() - INTERVAL '1 hour'`,
    [codeHash]
  );
  if (result.rows.length === 0) {
    throw badRequest('Invalid or expired reset code.');
  }
  const resetRequest = result.rows[0];

  // Verify the user still exists
  const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [resetRequest.user_id]);
  if (userResult.rows.length === 0) {
    throw notFound('User account no longer exists.');
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetRequest.user_id]);
    await client.query('UPDATE password_reset_requests SET status = \'used\', reviewed_at = NOW() WHERE id = $1', [resetRequest.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  ok(res, { message: 'Password has been reset successfully. You can now sign in.' });
}));

// ── POST /api/auth/refresh ──────────────────────────────────
// Rotate refresh token: revoke old, issue new access + refresh token pair.
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.cookies?.refresh_token;
  if (!refreshToken) throw badRequest('Refresh token required.');

  const userAgent = req.get('user-agent');
  const ipAddress = req.ip;

  const result = await rotateRefreshToken(refreshToken, { userAgent, ipAddress });
  if (!result) throw unauthorized('Invalid or expired refresh token.');

  // Set refresh token as HttpOnly cookie (secure in production)
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });

  ok(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken, // Also return in body for non-browser clients
  });
}));

// ── POST /api/auth/logout ───────────────────────────────────
// Revoke current refresh token (single device logout).
router.post('/logout', asyncHandler(async (req, res) => {
  const refreshToken = req.body.refresh_token || req.cookies?.refresh_token;
  if (refreshToken) {
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [tokenHash]
    );
  }
  // Clear cookie
  res.clearCookie('refresh_token', { path: '/' });
  ok(res, { message: 'Logged out successfully.' });
}));

// ── POST /api/auth/logout-all ───────────────────────────────
// Revoke all refresh tokens for the authenticated user (logout everywhere).
router.post('/logout-all', requireAuth, asyncHandler(async (req, res) => {
  await revokeAllRefreshTokens(req.user.id);
  res.clearCookie('refresh_token', { path: '/' });
  ok(res, { message: 'Logged out from all devices.' });
}));

export default router;