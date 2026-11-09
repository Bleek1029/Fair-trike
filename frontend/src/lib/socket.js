// ── Socket.io client: real-time push + live driver tracking ────────────────
//
// Connects to the same origin as the app (Vite dev proxies /socket.io to the
// backend on :5000; production is served by the backend directly; native
// builds target API_ORIGIN). Authentication is the same JWT as the REST API.
import { io } from 'socket.io-client';
import { getToken } from '../api.js';
import { API_ORIGIN, IS_NATIVE_APP } from '../config.js';

// Socket.io endpoint path (must match backend/socket.js).
const SOCKET_PATH = '/socket.io';

// Resolve the connection origin: native builds target the backend origin;
// browser builds stay same-origin (Vite proxy handles dev mode).
const SOCKET_URL = IS_NATIVE_APP && API_ORIGIN ? API_ORIGIN : '/';

let socket = null;

/** Open an authenticated Socket.io connection (reuses a single instance). */
export function connectSocket(token) {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['polling', 'websocket'],
    auth: { token: token || getToken() },
  });
  return socket;
}

/** Get the active socket instance. */
export function getSocket() {
  return socket;
}

/** Close the Socket.io connection. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Join a ride's room so you receive its live location + lifecycle events. */
export function joinRide(socket, rideId) {
  if (!socket || !rideId) return;
  socket.emit('join:ride', rideId);
}

/** Leave a ride's room. */
export function leaveRide(socket, rideId) {
  if (!socket || !rideId) return;
  socket.emit('leave:ride', rideId);
}

/** Join the drivers room to receive new ride-request push notifications. */
export function joinDrivers(socket) {
  if (!socket) return;
  socket.emit('join:drivers');
}

/** Driver: publish live location to the server (persisted + broadcast). */
export function sendDriverLocation(socket, rideId, lat, lng) {
  if (!socket) return;
  socket.emit('driver:location', { rideId, lat, lng });
}

/** Leave the drivers room (e.g. when going off duty). */
export function leaveDrivers(socket) {
  if (!socket) return;
  // Guard: only call leave if socket is fully connected with the expected API
  // Also guard against socket.io client errors during connection state transitions
  // Double-check socket exists and has expected properties before calling leave
  if (socket && socket.connected && typeof socket.leave === 'function') socket.leave('drivers');
}

/** Listen for live driver location updates within a ride. */
export function onDriverLocation(socket, callback) {
  if (!socket) return;
  socket.on('location-update', callback);
  return () => socket.off('location-update', callback);
}

/** Listen for a ride lifecycle event (ride-accepted / ride-completed / ride-cancelled). */
export function onRideEvent(socket, event, callback) {
  if (!socket) return;
  socket.on(event, callback);
  return () => socket.off(event, callback);
}

/** Listen for new ride-request push notifications (drivers). */
export function onRideRequested(socket, callback) {
  if (!socket) return;
  socket.on('ride-requested', callback);
  return () => socket.off('ride-requested', callback);
}
