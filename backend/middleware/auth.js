import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { unauthorized, AppError } from '../lib/AppError.js';

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

// Creates a signed token for a user id.
export function signToken(userId) {
  return jwt.sign({ userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

// Helper to build the public user object returned to the client.
export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullname: row.fullname,
    email: row.email,
    role: row.role || 'passenger',
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