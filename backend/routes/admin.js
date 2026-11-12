import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole, publicDriver, publicUser } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest, notFound } from '../lib/AppError.js';
import { emitAdminUserStatusChanged, emitAdminDriverStatusChanged, emitAdminResetStatusChanged, emitAdminDocumentStatusChanged } from '../socket.js';

const router = Router();

const DRIVER_STATUSES = ['pending', 'approved', 'rejected'];
const DOC_STATUSES = ['pending', 'approved', 'rejected'];
const RESET_STATUSES = ['pending', 'approved', 'rejected'];
const USER_STATUSES = ['pending', 'approved', 'rejected'];

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

  // Fetch user info for the socket event
  const userResult = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
  const driver = result.rows[0];
  if (userResult.rows.length > 0) {
    driver.user = userResult.rows[0];
  }

  ok(res, { message: `Driver marked as ${status}.`, driver: publicDriver(driver) });
  emitAdminDriverStatusChanged(driver);
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
  emitAdminDocumentStatusChanged(d);
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

// ── GET /api/admin/users/pending — pending user approvals ──
router.get('/users/pending', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `SELECT id, fullname, email, role, status, created_at
     FROM users
     WHERE status = 'pending'
     ORDER BY created_at DESC`
  );
  ok(res, { users: result.rows.map((u) => ({ ...publicUser(u), status: u.status })) });
}));

// ── POST /api/admin/users/:id/status — approve/reject user account ──
router.post('/users/:id/status', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const status = req.body?.status;
  const adminUserId = req.user?.id;
  const { admin_note } = req.body || {};
  if (!Number.isFinite(userId)) throw badRequest('Invalid user id.');
  if (!USER_STATUSES.includes(status)) throw badRequest(`status must be one of: ${USER_STATUSES.join(', ')}.`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reqRes = await client.query(
      `SELECT * FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = reqRes.rows[0];
    if (!user) throw notFound('User not found.');
    if (user.status !== 'pending') throw badRequest(`User account already ${user.status}.`);

    await client.query(
      `UPDATE users SET status = $1 WHERE id = $2`,
      [status, userId]
    );
    await client.query('COMMIT');
    const updatedUser = { ...user, status };
    ok(res, { message: `User account ${status}.`, user: publicUser(updatedUser) });
    emitAdminUserStatusChanged(updatedUser);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// ── POST /api/admin/drivers/delete-all — delete ALL drivers ──
router.post('/drivers/delete-all', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(`DELETE FROM drivers`);
  ok(res, { message: `Deleted ${result.rowCount} driver(s).`, count: result.rowCount });
}));

// ── POST /api/admin/users/delete-all — delete ALL non-admin users ──
router.post('/users/delete-all', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const adminUserId = req.user?.id;
  const result = await pool.query(`DELETE FROM users WHERE role != 'admin' AND id != $1`, [adminUserId]);
  ok(res, { message: `Deleted ${result.rowCount} user(s).`, count: result.rowCount });
}));

// ── POST /api/admin/reset-requests/delete-all — delete ALL reset requests ──
router.post('/reset-requests/delete-all', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(`DELETE FROM password_reset_requests`);
  ok(res, { message: `Deleted ${result.rowCount} reset request(s).`, count: result.rowCount });
}));

// ── POST /api/admin/documents/delete-all — delete ALL documents ──
router.post('/documents/delete-all', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(`DELETE FROM driver_documents`);
  ok(res, { message: `Deleted ${result.rowCount} document(s).`, count: result.rowCount });
}));

// ── GET /api/admin/reset-requests — password reset approval queue ──
router.get('/reset-requests', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `SELECT rr.id, rr.email, rr.status, rr.admin_note, rr.created_at, rr.reviewed_at,
            u.fullname, u.role
     FROM password_reset_requests rr
     JOIN users u ON u.id = rr.user_id
     ORDER BY rr.created_at DESC`
  );
  ok(res, { requests: result.rows });
}));

// ── POST /api/admin/reset-requests/:id/approve ──
router.post('/reset-requests/:id/approve', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const adminUserId = req.user?.id;
  const { admin_note } = req.body || {};
  if (!Number.isFinite(id)) throw badRequest('Invalid request id.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reqRes = await client.query(
      `SELECT * FROM password_reset_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const resetReq = reqRes.rows[0];
    if (!resetReq) throw notFound('Reset request not found.');
    if (resetReq.status !== 'pending') throw badRequest(`Request already ${resetReq.status}.`);

    // Apply the new password to the user account.
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [resetReq.new_password_hash, resetReq.user_id]
    );
    await client.query(
      `UPDATE password_reset_requests
       SET status = 'approved', admin_note = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3`,
      [admin_note ?? null, adminUserId, id]
    );
    await client.query('COMMIT');
    ok(res, { message: 'Password reset approved and applied.' });
    emitAdminResetStatusChanged({ ...resetReq, status: 'approved' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

// ── POST /api/admin/reset-requests/:id/reject ──
router.post('/reset-requests/:id/reject', requireAuth, requireRole(pool, 'admin'), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const adminUserId = req.user?.id;
  const { admin_note } = req.body || {};
  if (!Number.isFinite(id)) throw badRequest('Invalid request id.');

  const result = await pool.query(
    `UPDATE password_reset_requests
       SET status = 'rejected', admin_note = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
    [admin_note ?? null, adminUserId, id]
  );
  if (result.rows.length === 0) throw notFound('Reset request not found or already processed.');
  ok(res, { message: 'Password reset request rejected.' });
  emitAdminResetStatusChanged(result.rows[0]);
}));

export default router;
