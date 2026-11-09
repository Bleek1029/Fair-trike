// ── Raw WebSocket server (ws) for Fairtrike ─────────────────────────────
// A lightweight WebSocket channel separate from Socket.io. Clients connect
// directly to `ws://localhost:<port>` and use a minimal JSON-over-WS protocol
// for real-time ride data (no handshake/query parameters, just raw frames).
//
// Passenger intercepts the listen call — the port number does not matter,
// as long as it shares the same HTTP server as Express and Socket.io.
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { env } from './config.js';

let wss = null;

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Attach a raw WebSocket server to the existing HTTP server.
 * Must be called after `createServer(app)` and optionally after Socket.io.
 */
export function initWebSocketServer(httpServer) {
  if (wss) return wss;

  wss = new WebSocketServer({ server: httpServer, maxPayload: 1024 * 1024 });

  wss.on('connection', (ws, req) => {
    console.log('Client connected (raw WebSocket)');

    // ── Basic ping/pong heartbeat to keep connections alive ────────────
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // ── Broadcast to all connected clients ─────────────────────────────
    ws.on('message', (data) => {
      const message = data.toString();
      console.log(`[WS] Received from client: ${message}`);

      // Echo is for demo; replace with your broadcast logic.
      // Broadcast to everyone except the sender:
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(message);
        }
      });
    });

    ws.on('close', () => {
      console.log('Client disconnected (raw WebSocket)');
      // Clean up any per-client state here
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  // Graceful shutdown
  httpServer.on('close', () => {
    wss.close(() => console.log('Raw WebSocket server closed'));
  });

  return wss;
}

/** Get the initialized WebSocket server instance. */
export function getWebSocketServer() {
  if (!wss) throw new Error('Raw WebSocket server has not been initialized. Call initWebSocketServer() first.');
  return wss;
}
