import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { pool } from '../db.js';
import { requireAuth, requireRole, publicDriver } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { notFound, badRequest } from '../lib/AppError.js';
import { trim } from '../lib/validation.js';
import { uploadDir } from './users.js';
import { getIo, emitRideEvent } from '../socket.js';

const DOC_TYPES = ['license', 'or_cr', 'nbi_clearance', 'toda_clearance'];
const DOC_ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

const router = Router();

// Multer storage for driver documents: doc_<userid>_<type>_<timestamp>.<ext>
const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || 'jpg').replace('.', '') || 'jpg';
    cb(null, `doc_${req.user.id}_${req.body?.doc_type || 'doc'}_${Date.now()}.${ext}`);
  },
});
const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, DOC_ALLOWED.includes(file.mimetype)),
});

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

// ── POST /api/drivers/me/documents (multipart: document, doc_type) ──
router.post('/me/documents', requireAuth, requireRole(pool, 'driver'), docUpload.single('document'), asyncHandler(async (req, res) => {
  const docType = trim(req.body.doc_type);
  if (!DOC_TYPES.includes(docType)) {
    throw badRequest(`doc_type must be one of: ${DOC_TYPES.join(', ')}.`);
  }
  if (!req.file) throw badRequest('A document file is required (image or PDF, max 5MB).');

  const filePath = path.join('uploads', req.file.filename).replace(/\\/g, '/');
  const inserted = await pool.query(
    `INSERT INTO driver_documents (user_id, doc_type, file_path) VALUES ($1, $2, $3) RETURNING *`,
    [req.user.id, docType, filePath]
  );
  const d = inserted.rows[0];
  ok(res, {
    message: 'Document uploaded. It is now pending TODA verification.',
    document: { id: d.id, docType: d.doc_type, filePath: d.file_path, status: d.status, createdAt: d.created_at },
  });
}));

// ── GET /api/drivers/me/documents — list uploaded documents ──
router.get('/me/documents', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM driver_documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  ok(res, {
    documents: result.rows.map((d) => ({
      id: d.id, docType: d.doc_type, filePath: d.file_path, status: d.status, createdAt: d.created_at,
    })),
  });
}));

// ── POST /api/drivers/me/location — publish live driver location (REST fallback)
// Used when a WebSocket connection isn't available. Persists the fix and
// broadcasts it to the driver's active ride room so the passenger can track.
router.post('/me/location', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (req, res) => {
  const { lat, lng, rideId } = req.body;
  if (lat == null || lng == null) throw badRequest('lat and lng are required.');

  await pool.query(
    `UPDATE drivers SET last_lat = $1, last_lng = $2, last_location_at = NOW()
     WHERE user_id = $3`,
    [lat, lng, req.user.id]
  );

  const targetRide = rideId
    ? Number(rideId)
    : (await pool.query(
        `SELECT id FROM rides WHERE driver_user_id = $1 AND status = 'accepted' ORDER BY accepted_at DESC LIMIT 1`,
        [req.user.id]
      )).rows[0]?.id;

  if (targetRide) {
    getIo().to(`ride:${targetRide}`).emit('location-update', {
      rideId: targetRide,
      driverUserId: req.user.id,
      lat: Number(lat),
      lng: Number(lng),
      at: new Date().toISOString(),
    });
  }

  ok(res, { message: 'Location updated.' });
}));

export default router;
