import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, publicDriver } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { notFound } from '../lib/AppError.js';
import { trim } from '../lib/validation.js';

const router = Router();

// ── GET /api/drivers ───────────────────────────────────────
// Public directory of (optionally approved-only) drivers.
router.get('/', asyncHandler(async (req, res) => {
  const onlyApproved = String(req.query.approved ?? 'true').toLowerCase() !== 'false';
  const result = await pool.query(
    `SELECT d.*, u.fullname, u.email, u.profile_picture
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     ${onlyApproved ? "WHERE d.status = 'approved'" : ''}
     ORDER BY d.created_at DESC
     LIMIT 200`
  );
  const drivers = result.rows.map((r) => ({
    ...publicDriver(r),
    fullname: r.fullname,
    email: r.email,
    profilePicture: r.profile_picture,
  }));
  ok(res, { drivers });
}));

// ── GET /api/drivers/me ────────────────────────────────────
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);
  if (result.rows.length === 0) throw notFound('No driver profile found.');
  ok(res, { driver: publicDriver(result.rows[0]) });
}));

// ── PUT /api/drivers/me ────────────────────────────────────
router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const toda = trim(req.body.toda_association) || null;
  const trike = trim(req.body.trike_number) || null;
  const plate = trim(req.body.vehicle_plate).toUpperCase() || null;
  const contact = trim(req.body.contact_number) || null;

  const result = await pool.query(
    `UPDATE drivers SET toda_association = $1, trike_number = $2,
      vehicle_plate = $3, contact_number = $4
     WHERE user_id = $5 RETURNING *`,
    [toda, trike, plate, contact, req.user.id]
  );
  if (result.rows.length === 0) throw notFound('No driver profile found.');
  ok(res, { message: 'Driver profile updated.', driver: publicDriver(result.rows[0]) });
}));

export default router;
