// ── Real-time push & live driver tracking (Socket.io) ──────────────────────
//
// One Socket.io server attached to the same HTTP server as Express. Clients
// authenticate with their JWT (same secret as the REST API) and join a room
// per ride (`ride:<rideId>`). The driver publishes live location updates and
// everyone in the room (passenger + driver) receives them instantly. Ride
// lifecycle events (accepted / completed / cancelled) are also pushed so the
// passenger and driver UIs update without polling.

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config.js';
import { pool } from './db.js';

let io = null;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Attach Socket.io to the HTTP server. Must be called before `server.listen()`
 * and before Express becomes the sole request listener (socket.io must
 * intercept `/socket.io` first).
 */
export function initSocket(server) {
  if (io) return io;

  const isDev = env.nodeEnv !== 'production';

  io = new Server(server, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    cors: {
      origin: isDev ? '*' : (env.corsOrigins.length ? env.corsOrigins : []),
      credentials: true,
    },
  });

  // ── Authentication (same JWT as the REST API) ──────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      '';
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, env.jwt.secret);
      socket.userId = payload.userId;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error('Session expired. Please log in again.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    socket.on('join:ride', (rideId, ack) => {
      if (!rideId) return;
      socket.join(`ride:${rideId}`);
      socket.rideRoom = `ride:${rideId}`;
      if (typeof ack === 'function') ack({ ok: true, room: socket.rideRoom });
    });

    socket.on('join:drivers', (ack) => {
      socket.join('drivers');
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('leave:ride', (rideId) => {
      if (!rideId) return;
      socket.leave(`ride:${rideId}`);
      if (socket.rideRoom === `ride:${rideId}`) socket.rideRoom = null;
    });

    // Driver publishes live location; server persists + broadcasts to room.
    socket.on('driver:location', async ({ rideId, lat, lng }) => {
      if (!rideId || lat == null || lng == null) return;

      try {
        await pool.query(
          `UPDATE drivers SET last_lat = $1, last_lng = $2,
              last_location_at = NOW() WHERE user_id = $3`,
          [lat, lng, userId]
        );
      } catch {
        // Persistence failure must not break real-time broadcast.
      }

      io.to(`ride:${rideId}`).emit('location-update', {
        rideId,
        driverUserId: userId,
        lat: Number(lat),
        lng: Number(lng),
        at: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      if (socket.rideRoom) socket.leave(socket.rideRoom);
    });
  });

  return io;
}

/** Get the initialized Socket.io server instance (throws if not started). */
export function getIo() {
  if (!io) throw new Error('Socket.io has not been initialized.');
  return io;
}

/** Push a ride lifecycle event to everyone in the ride's room. */
export function emitRideEvent(rideId, event, data = {}) {
  if (!io) return;
  io.to(`ride:${rideId}`).emit(event, { rideId, ...data });
}

/** Notify all drivers in the `drivers` room of a new pending ride request. */
export function emitRideRequested(data = {}) {
  if (!io) return;
  io.to('drivers').emit('ride-requested', data);
}

export { io };
