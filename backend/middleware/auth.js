import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { pool } from '../db.js';
import { unauthorized, AppError } from '../lib/AppError.js';
import { randomBytes, createHash } from 'node:crypto';

// Extracts and verifies the JWT Bearer token from the Authorization header.
// On success attaches the payload (containing user id) to req.user.
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.userId };
    return next();
  } catch {
    return next(unauthorized('Session expired. Please log in again.'));
  }
}

// Requires the authenticated user to have one of the given roles.
// Requires `pool` injection to avoid a hidden import at module load.
export function requireRole(pool, ...roles) {
  return async (req, _res, next) => {
    try {
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      const role = result.rows[0]?.role;
      if (!result.rows.length || !roles.includes(role)) {
        return next(new AppError('Forbidden', { status: 403, code: 'FORBIDDEN' }));
      }
      req.user.role = role;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// Creates a signed access token for a user id (short-lived).
export function signAccessToken(userId, role = 'passenger') {
  return jwt.sign({ userId, role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

// Creates a signed refresh token for a user id (long-lived, stored in DB).
export async function createRefreshToken(userId, { userAgent, ipAddress } = {}) {
  const token = randomBytes(48).toString('hex'); // 384 bits
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Parse expiry (e.g., "30d" -> seconds)
  const parseExpiry = (str) => {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60; // default 30 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 86400);
  };
  const expiresInSeconds = parseExpiry(env.jwt.refreshExpiresIn);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, userAgent || null, ipAddress || null, expiresAt]
  );

  return { token, expiresAt };
}

// Verifies a refresh token and rotates it (revokes old, issues new).
export async function rotateRefreshToken(presentedToken, { userAgent, ipAddress } = {}) {
  const tokenHash = createHash('sha256').update(presentedToken).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find valid, non-revoked, non-expired token
    const result = await client.query(
      `SELECT id, user_id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null; // Invalid or expired
    }

    const { id, user_id } = result.rows[0];

    // Revoke the used token
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [id]
    );

    // Issue new refresh token
    const newToken = randomBytes(48).toString('hex');
    const newTokenHash = createHash('sha256').update(newToken).digest('hex');
    const parseExpiry = (str) => {
      const match = str.match(/^(\d+)([smhd])$/);
      if (!match) return 30 * 24 * 60 * 60;
      const value = parseInt(match[1], 10);
      const unit = match[2];
      const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
      return value * (multipliers[unit] || 86400);
    };
    const expiresInSeconds = parseExpiry(env.jwt.refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, newTokenHash, userAgent || null, ipAddress || null, expiresAt]
    );

    // Issue new access token
    const accessToken = signAccessToken(user_id);

    await client.query('COMMIT');
    return { accessToken, refreshToken: newToken, userId: user_id };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Revokes all refresh tokens for a user (logout everywhere).
export async function revokeAllRefreshTokens(userId) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

// Helper to build the public user object returned to the client.
export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullname: row.fullname,
    email: row.email,
    role: row.role || 'passenger',
    status: row.status || 'pending',
    profilePicture: row.profile_picture,
    createdAt: row.created_at,
  };
}

// Builds the public driver profile object.
export function publicDriver(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    licenseNumber: row.license_number,
    todaAssociation: row.toda_association,
    trikeNumber: row.trike_number,
    vehiclePlate: row.vehicle_plate,
    contactNumber: row.contact_number,
    status: row.status,
    createdAt: row.created_at,
  };
}