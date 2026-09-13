import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { requireAuth, publicUser, publicDriver } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { notFound, badRequest } from '../lib/AppError.js';
import { env } from '../config.js';
import { trim } from '../lib/validation.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '..', env.uploads.dir);
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const MAX_SIZE = env.uploads.maxFileSizeMb * 1024 * 1024;

// Multer storage: user_<id>_<timestamp>.<ext>
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || 'jpg').replace('.', '') || 'jpg';
    cb(null, `user_${req.user.id}_${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.includes(file.mimetype)),
});

// ── GET /api/users/me ────────────────────────────────────
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) throw notFound('User not found.');

  const user = publicUser(result.rows[0]);
  let driver = null;
  if (user.role === 'driver') {
    const d = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);
    driver = publicDriver(d.rows[0] || null);
  }
  ok(res, { user, driver });
}));

// ── PUT /api/users/profile (multipart: fullname, optional profile_picture) ──
router.put('/profile', requireAuth, upload.single('profile_picture'), asyncHandler(async (req, res) => {
  const fullname = trim(req.body.fullname);
  if (fullname.length < 2) throw badRequest('Full name is required.');

  if (req.file) {
    const filePath = path.join('uploads', req.file.filename).replace(/\\/g, '/');
    await pool.query('UPDATE users SET fullname = $1, profile_picture = $2 WHERE id = $3', [fullname, filePath, req.user.id]);
    return ok(res, { message: 'Profile updated successfully.', user: { id: req.user.id, fullname, profilePicture: filePath } });
  }

  await pool.query('UPDATE users SET fullname = $1 WHERE id = $2', [fullname, req.user.id]);
  ok(res, { message: 'Profile updated successfully.', user: { id: req.user.id, fullname } });
}));

// ── DELETE /api/users/profile/picture ────────────────────
router.delete('/profile/picture', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) throw notFound('User not found.');

  const picture = result.rows[0].profile_picture;
  if (picture) {
    const abs = path.resolve(uploadDir, path.basename(picture));
    try { fs.unlinkSync(abs); } catch { /* ignore missing file */ }
  }

  await pool.query('UPDATE users SET profile_picture = NULL WHERE id = $1', [req.user.id]);
  ok(res, { message: 'Profile picture removed successfully.' });
}));

export default router;
export { uploadDir };