// ── Google Sign-In route ───────────────────────────────────────────────────
// Verifies a Google ID token (credential) from the frontend, finds or creates
// the user in the local database, and issues Fairtrike access + refresh tokens.
// POST /api/auth/google   { "credential": "<Google ID token>" }
import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest, unauthorized } from '../lib/AppError.js';
import { pool } from '../db.js';
import { signAccessToken, createRefreshToken, publicUser } from '../middleware/auth.js';
import { normalizeEmail } from '../lib/validation.js';
import { env } from '../config.js';

const router = Router();

/**
 * Verifies a Google ID token by calling Google's tokeninfo endpoint.
 * Returns the decoded payload or null if invalid.
 */
async function verifyGoogleIdToken(credential) {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const payload = await res.json();
    // Verify audience matches our client ID
    if (payload.aud !== env.googleClientId) return null;
    return payload;
  } catch {
    return null;
  }
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { credential } = req.body ?? {};
    if (!credential || typeof credential !== 'string') {
      throw badRequest('Google credential is required.');
    }

    if (!env.googleClientId) {
      throw unauthorized('Google Sign-In is not configured on the server.');
    }

    const payload = await verifyGoogleIdToken(credential);
    if (!payload) {
      throw unauthorized('Invalid Google credential.');
    }

    const email = normalizeEmail(payload.email);
    const fullname = payload.name || payload.email || 'User';
    const googleId = payload.sub;

    if (!email) {
      throw unauthorized('Google account has no email address.');
    }

    // Check if user exists by Google ID or email
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user = result.rows[0];

    if (!user) {
      result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows[0];
    }

    if (!user) {
      // Create a new user (defaults to passenger; drivers still use the driver form)
      const insert = await pool.query(
        "INSERT INTO users (fullname, email, password_hash, google_id, role) VALUES ($1, $2, $3, $4, 'passenger') RETURNING *",
        [fullname, email, null, googleId],
      );
      user = insert.rows[0];
    } else if (!user.google_id) {
      // Link existing email account to Google ID
      await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      user = { ...user, google_id: googleId };
    }

    const accessToken = signAccessToken(user.id, user.role);
    const { token: refreshToken } = await createRefreshToken(user.id, {
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    });

    ok(res, {
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  })
);

export default router;
