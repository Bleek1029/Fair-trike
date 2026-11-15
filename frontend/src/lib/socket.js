// ── Socket.io client: real-time push + live driver tracking ────────────────
//
// Connects to the same origin as the app (Vite dev proxies /socket.io to the
// backend on :5000; production is served by the backend directly).
// Authentication is the same JWT as the REST API.
import { io } from 'socket.io-client';
import { getAccessToken } from '../api.js';

// Socket.io endpoint path (must match backend/socket.js).
const SOCKET_PATH = '/socket.io';

// Connect to same origin (relative URL works for browser builds)
const SOCKET_URL = '/';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[Socket] Max reconnection attempts reached. Giving up.');
    return;
  }
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  console.log(`[Socket] Reconnecting in ${Math.round((delay + jitter) / 1000)}s (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  setTimeout(() => {
    reconnectAttempts++;
    // Get fresh token on each reconnect attempt
    const freshToken = getAccessToken();
    if (freshToken) {
      connectSocket(freshToken);
    } else {
      console.warn('[Socket] No auth token available for reconnection');
    }
  }, delay + jitter);
}

/** Open an authenticated Socket.io connection (reuses a single instance). */
export function connectSocket(token) {
  const authToken = token || getAccessToken();
  if (!authToken) {
    console.warn('[Socket] No auth token available, cannot connect');
    return null;
  }

  // If socket exists and is connected, reuse it (update auth if token changed)
  if (socket && socket.connected) {
    if (socket.io.opts.auth?.token !== authToken) {
      socket.auth = { token: authToken };
    }
    return socket;
  }

  // Clean up old socket if disconnected
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['polling', 'websocket'],
    auth: { token: authToken },
    reconnection: false, // We handle reconnection manually
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
    reconnectAttempts = 0; // Reset on successful connection
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server explicitly disconnected us, don't reconnect automatically
      socket = null;
    } else if (reason === 'io client disconnect') {
      // We called disconnect(), don't reconnect
      socket = null;
    } else {
      // Unexpected disconnect (network issue, etc.) - schedule reconnect
      scheduleReconnect();
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
    scheduleReconnect();
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
  reconnectAttempts = 0; // Reset reconnection state on manual disconnect
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

/** Join the admin room to receive admin notifications. */
export function joinAdmin(socket) {
  if (!socket) return;
  socket.emit('join:admin');
}

/** Listen for admin:user-created events. */
export function onAdminUserCreated(socket, callback) {
  if (!socket) return;
  socket.on('admin:user-created', callback);
  return () => socket.off('admin:user-created', callback);
}

/** Listen for admin:driver-created events. */
export function onAdminDriverCreated(socket, callback) {
  if (!socket) return;
  socket.on('admin:driver-created', callback);
  return () => socket.off('admin:driver-created', callback);
}

/** Listen for admin:user-status-changed events. */
export function onAdminUserStatusChanged(socket, callback) {
  if (!socket) return;
  socket.on('admin:user-status-changed', callback);
  return () => socket.off('admin:user-status-changed', callback);
}

/** Listen for admin:driver-status-changed events. */
export function onAdminDriverStatusChanged(socket, callback) {
  if (!socket) return;
  socket.on('admin:driver-status-changed', callback);
  return () => socket.off('admin:driver-status-changed', callback);
}

/** Listen for admin:reset-requested events. */
export function onAdminResetRequested(socket, callback) {
  if (!socket) return;
  socket.on('admin:reset-requested', callback);
  return () => socket.off('admin:reset-requested', callback);
}

/** Listen for admin:reset-status-changed events. */
export function onAdminResetStatusChanged(socket, callback) {
  if (!socket) return;
  socket.on('admin:reset-status-changed', callback);
  return () => socket.off('admin:reset-status-changed', callback);
}

/** Listen for admin:document-created events. */
export function onAdminDocumentCreated(socket, callback) {
  if (!socket) return;
  socket.on('admin:document-created', callback);
  return () => socket.off('admin:document-created', callback);
}

/** Listen for admin:document-status-changed events. */
export function onAdminDocumentStatusChanged(socket, callback) {
  if (!socket) return;
  socket.on('admin:document-status-changed', callback);
  return () => socket.off('admin:document-status-changed', callback);
}

