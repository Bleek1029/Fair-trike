import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok, created } from '../lib/http.js';
import { badRequest, notFound, conflict } from '../lib/AppError.js';
import { assertCoordPair, requireFields, trim } from '../lib/validation.js';
import { computeFare, normalizeRideType } from '../lib/fares.js';
import { emitRideRequested, emitRideEvent } from '../socket.js';

const router = Router();

const RIDES_SELECT = `
  SELECT r.*,
    pu.fullname AS passenger_fullname, pu.profile_picture AS passenger_picture,
    du.fullname AS driver_fullname, du.profile_picture AS driver_picture
  FROM rides r
  LEFT JOIN users pu ON pu.id = r.passenger_user_id
  LEFT JOIN users du ON du.id = r.driver_user_id
`;

const publicRide = (r) => ({
  id: r.id,
  passengerName: r.passenger_fullname ?? r.passenger_name,
  passengerAvatar: r.passenger_picture ?? null,
  driverName: r.driver_fullname ?? null,
  driverAvatar: r.driver_picture ?? null,
  driverUserId: r.driver_user_id,
  pickup: r.pickup_label,
  dropoff: r.dropoff_label,
  pickupCoord: { lat: r.pickup_lat, lng: r.pickup_lng },
  dropoffCoord: { lat: r.dropoff_lat, lng: r.dropoff_lng },
  distanceM: r.distance_m,
  fare: Number(r.fare),
  status: r.status,
  acceptedAt: r.accepted_at,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});

// ── POST /api/rides — create a pending ride request ──────
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const passengerName = trim(req.body.passenger_name) || null;
  const pickupLabel = trim(req.body.pickup_label);
  const dropoffLabel = trim(req.body.dropoff_label);
  requireFields({ pickup_label: pickupLabel, dropoff_label: dropoffLabel }, ['pickup_label', 'dropoff_label']);
  assertCoordPair([req.body.pickup_coord.lat, req.body.pickup_coord.lng]);
  assertCoordPair([req.body.dropoff_coord.lat, req.body.dropoff_coord.lng]);
  const distanceM = Math.max(0, Number.parseInt(req.body.distance_m, 10) || 0);
  // Fare tier: regular | pwd | discounted — PWD and student/senior tiers get
  // the statutory 20% discount (₱30.00 → ₱24.00 at the standard fare).
  const rideType = normalizeRideType(req.body.ride_type);

  const inserted = await pool.query(
    `INSERT INTO rides (passenger_user_id, passenger_name, pickup_label, dropoff_label,
       pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_m, fare)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [(req.user.id || null), (passengerName || trim(req.user?.fullname || '') || null), pickupLabel, dropoffLabel,
      req.body.pickup_coord.lat, req.body.pickup_coord.lng,
      req.body.dropoff_coord.lat, req.body.dropoff_coord.lng,
      distanceM, computeFare(distanceM, rideType)]
  );
  const ride = publicRide(inserted.rows[0]);
  emitRideRequested(ride);
  created(res, { ride });
}));

// ── GET /api/rides/available — pending ride offers (drivers) ──
router.get('/available', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (_req, res) => {
  const result = await pool.query(
    `${RIDES_SELECT} WHERE r.status = 'pending' ORDER BY r.created_at ASC LIMIT 20`
  );
  ok(res, { rides: result.rows.map(publicRide) });
}));

// ── POST /api/rides/:id/accept — claim a pending ride ────
router.post('/:id/accept', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) throw badRequest('Invalid ride id.');

  // Atomic claim: only one driver can flip a pending ride to accepted.
  const result = await pool.query(
    `UPDATE rides SET driver_user_id = $1, accepted_at = NOW(), status = 'accepted'
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [req.user.id, id]
  );
  if (result.rows.length === 0) {
    const exists = await pool.query('SELECT status FROM rides WHERE id = $1', [id]);
    if (exists.rows.length === 0) throw notFound('Ride not found.');
    throw conflict('That ride was already taken by another driver.');
  }
  // Re-fetch with the passenger join so the driver sees who they're picking up.
  const full = await pool.query(`${RIDES_SELECT} WHERE r.id = $1`, [id]);
  const acceptedRide = publicRide(full.rows[0]);
  emitRideEvent(id, 'ride-accepted', acceptedRide);
  ok(res, { message: 'Ride accepted.', ride: acceptedRide });
}));

// ── POST /api/rides/:id/complete — finish an accepted ride ──
router.post('/:id/complete', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) throw badRequest('Invalid ride id.');

  const result = await pool.query(
    `UPDATE rides SET status = 'completed', completed_at = NOW()
     WHERE id = $1 AND driver_user_id = $2 AND status = 'accepted'
     RETURNING *`,
    [id, req.user.id]
  );
  if (result.rows.length === 0) throw notFound('No active accepted ride with that id.');
  const completedRide = publicRide(result.rows[0]);
  emitRideEvent(id, 'ride-completed', completedRide);
  ok(res, { message: 'Trip completed.', ride: completedRide });
}));

// ── POST /api/rides/:id/cancel — cancel while pending ────
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const result = await pool.query(
    `UPDATE rides SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING id`,
    [id]
  );
  if (result.rows.length === 0) throw notFound('No pending ride with that id.');
  emitRideEvent(id, 'ride-cancelled');
  ok(res, { message: 'Ride cancelled.' });
}));

// ── GET /api/rides/mine — driver's assigned rides ────────
router.get('/mine', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `${RIDES_SELECT} WHERE r.driver_user_id = $1 ORDER BY r.created_at DESC LIMIT 100`,
    [req.user.id]
  );
  ok(res, { rides: result.rows.map(publicRide) });
}));

// ── GET /api/rides/history — passenger's own ride requests ──
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `${RIDES_SELECT} WHERE r.passenger_user_id = $1 ORDER BY r.created_at DESC LIMIT 100`,
    [req.user.id]
  );
  ok(res, { rides: result.rows.map(publicRide) });
}));

// ── GET /api/rides/earnings — driver earnings report ─────
router.get('/earnings', requireAuth, requireRole(pool, 'driver'), asyncHandler(async (req, res) => {
  const summary = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE completed_at >= date_trunc('day', NOW()))               AS today_trips,
       COALESCE(SUM(fare) FILTER (WHERE completed_at >= date_trunc('day', NOW())), 0) AS today_earnings,
       COUNT(*) FILTER (WHERE completed_at >= date_trunc('week', NOW()))              AS week_trips,
       COALESCE(SUM(fare) FILTER (WHERE completed_at >= date_trunc('week', NOW())),0) AS week_earnings,
       COUNT(*)                                                                       AS total_trips,
       COALESCE(SUM(fare), 0)                                                         AS total_earnings
     FROM rides
     WHERE driver_user_id = $1 AND status = 'completed'`,
    [req.user.id]
  );
  const daily = await pool.query(
    `SELECT to_char(date_trunc('day', completed_at), 'YYYY-MM-DD') AS day,
            COUNT(*) AS trips, COALESCE(SUM(fare), 0) AS earnings
     FROM rides
     WHERE driver_user_id = $1 AND status = 'completed'
       AND completed_at >= NOW() - INTERVAL '7 days'
     GROUP BY 1 ORDER BY 1 DESC`,
    [req.user.id]
  );
  const s = summary.rows[0];
  ok(res, {
    today: { trips: Number(s.today_trips), earnings: Number(s.today_earnings) },
    week: { trips: Number(s.week_trips), earnings: Number(s.week_earnings) },
    totals: { trips: Number(s.total_trips), earnings: Number(s.total_earnings) },
    daily: daily.rows.map((r) => ({ day: r.day, trips: Number(r.trips), earnings: Number(r.earnings) })),
  });
}));

export default router;

