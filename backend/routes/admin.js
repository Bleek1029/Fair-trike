import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole, publicDriver, publicUser } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest, notFound } from '../lib/AppError.js';

const router = Router();

const DRIVER_STATUSES = ['pending', 'approved', 'rejected'];
const DOC_STATUSES = ['pending', 'approved', 'rejected'];

// ── GET /api/admin/stats — dashboard overview ────────────
router.get('/stats', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const [users, drivers, rides, docs] = await Promise.all([
    pool.query(`SELECT role, COUNT(*) AS n FROM users GROUP BY role`),
    pool.query(`SELECT status, COUNT(*) AS n FROM drivers GROUP BY status`),
    pool.query(`SELECT status, COUNT(*) AS n FROM rides GROUP BY status`),
    pool.query(`SELECT status, COUNT(*) AS n FROM driver_documents GROUP BY status`),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.rows.map((r) => [r.status || r.role, Number(r.n)]));
  ok(res, {
    users: toMap(users),
    drivers: toMap(drivers),
    rides: toMap(rides),
    documents: toMap(docs),
  });
}));

// ── GET /api/admin/drivers — all driver applications ─────
router.get('/drivers', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `SELECT d.*, u.fullname, u.email, u.profile_picture,
            (SELECT COUNT(*) FROM driver_documents dd WHERE dd.user_id = u.id) AS doc_count
     FROM drivers d JOIN users u ON u.id = d.user_id
     ORDER BY CASE d.status WHEN 'pending' THEN 0 ELSE 1 END, d.created_at DESC`
  );
  ok(res, {
    drivers: result.rows.map((r) => ({
      ...publicDriver(r),
      fullname: r.fullname,
      email: r.email,
      profilePicture: r.profile_picture,
      documentCount: Number(r.doc_count),
    })),
  });
}));

// ── POST /api/admin/drivers/:userId/status — approve/reject ──
router.post('/drivers/:userId/status', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const userId = Number.parseInt(req.params.userId, 10);
  const status = req.body?.status;
  if (!Number.isFinite(userId)) throw badRequest('Invalid driver id.');
  if (!DRIVER_STATUSES.includes(status)) throw badRequest(`status must be one of: ${DRIVER_STATUSES.join(', ')}.`);

  const result = await pool.query(
    `UPDATE drivers SET status = $1 WHERE user_id = $2 RETURNING *`,
    [status, userId]
  );
  if (result.rows.length === 0) throw notFound('No driver profile for that user.');
  ok(res, { message: `Driver marked as ${status}.`, driver: publicDriver(result.rows[0]) });
}));

// ── GET /api/admin/documents — document review queue ─────
router.get('/documents', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const status = req.query.status && DOC_STATUSES.includes(req.query.status) ? req.query.status : null;
  const result = await pool.query(
    `SELECT dd.*, u.fullname, u.email
     FROM driver_documents dd JOIN users u ON u.id = dd.user_id
     ${status ? 'WHERE dd.status = $1' : ''}
     ORDER BY CASE dd.status WHEN 'pending' THEN 0 ELSE 1 END, dd.created_at DESC
     ${status ? 'LIMIT 200' : 'LIMIT 200'}`,
    status ? [status] : []
  );
  ok(res, {
    documents: result.rows.map((d) => ({
      id: d.id, userId: d.user_id, docType: d.doc_type, filePath: d.file_path,
      status: d.status, createdAt: d.created_at, fullname: d.fullname, email: d.email,
    })),
  });
}));

// ── POST /api/admin/documents/:id/status — approve/reject doc ──
router.post('/documents/:id/status', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const status = req.body?.status;
  if (!Number.isFinite(id)) throw badRequest('Invalid document id.');
  if (!DOC_STATUSES.includes(status)) throw badRequest(`status must be one of: ${DOC_STATUSES.join(', ')}.`);

  const result = await pool.query(
    `UPDATE driver_documents SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (result.rows.length === 0) throw notFound('Document not found.');
  const d = result.rows[0];
  ok(res, {
    message: `Document marked as ${status}.`,
    document: { id: d.id, docType: d.doc_type, status: d.status },
  });
}));

// ── GET /api/admin/users — all accounts ──────────────────
router.get('/users', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(`SELECT * FROM users ORDER BY created_at DESC LIMIT 500`);
  ok(res, { users: result.rows.map(publicUser) });
}));

// ── GET /api/admin/rides — all rides ─────────────────────
router.get('/rides', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `SELECT r.*, du.fullname AS driver_fullname, pu.fullname AS passenger_fullname
     FROM rides r
     LEFT JOIN users du ON du.id = r.driver_user_id
     LEFT JOIN users pu ON pu.id = r.passenger_user_id
     ORDER BY r.created_at DESC LIMIT 300`
  );
  ok(res, {
    rides: result.rows.map((r) => ({
      id: r.id, status: r.status, fare: Number(r.fare),
      pickup: r.pickup_label, dropoff: r.dropoff_label,
      passenger: r.passenger_fullname ?? r.passenger_name,
      driver: r.driver_fullname,
      createdAt: r.created_at, completedAt: r.completed_at,
    })),
  });
}));

export default router;
