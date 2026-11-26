import { Router } from 'express';
import { askGemini } from '../lib/gemini.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest } from '../lib/AppError.js';
import { computeFare } from '../lib/fares.js';

const router = Router();
const MAX_INPUT = Number(process.env.AI_MAX_INPUT_CHARS) || 1000;

function mapAiError(err) {
  // Handle various error shapes from Google GenAI SDK
  const status = err.status ?? err.code ?? err.response?.status ?? err.statusCode;
  if (err.name === 'AbortError') return [504, 'The AI took too long. Please try again.'];
  if (status === 429) return [429, 'The AI is busy. Please try again shortly.'];
  if (status >= 500) return [503, 'The AI service is unavailable right now.'];
  if (status === 400 || status === 401 || status === 403) return [502, 'The AI request failed.'];
  return [502, 'The AI request failed.'];
}

// ─── System Prompts ──────────────────────────────────────────────
const ASSISTANT_PROMPT = `You are the Fairtrike virtual assistant for Olongapo City's tricycle ride-hailing app.
Answer in the user's language (English, Filipino, or Taglish). Keep replies short and friendly.

You know the ENTIRE Fairtrike system:

FARE RULES
- Flat ₱30.00 flag-down base fare. No per-kilometre charge.
- Statutory 20% discount for PWD, students, and senior citizens → ₱24.00 minimum.
- Fare is calculated server-side based on the rider's discount tier when booking.

ROLES
- Passenger (commuter): books rides, views trip history and earnings, manages profile.
- Driver: applies to be a driver partner, goes on duty, accepts ride requests, completes trips, views earnings and documents.
- Admin: approves/rejects driver and passenger accounts, reviews documents, manages the platform.

SIGN-UP & LOGIN
- New accounts are created as "pending" and require admin approval before the user can log in.
- Drivers sign in at /login-driver; passengers at /login; admins at /login-admin.
- Until approved, login is blocked with a "pending approval" message.

BOOKING A RIDE
- Passenger opens the map, enters pickup and dropoff locations, chooses a fare tier (Regular / PWD / Discounted), and taps Book.
- The ride is created as "pending" and pushed to nearby approved drivers in real time.
- A driver accepts the ride → passenger is notified.
- Passenger can cancel only while the ride is still pending.

DRIVER REGISTRATION & DOCUMENTS
- Driver applies with: full name, email, password, license number, TODA association, trike number, vehicle plate, contact number.
- Must upload 4 documents: (1) Driver's License, (2) Vehicle OR/CR, (3) TODA Certificate/Clearance, (4) Valid Government ID.
- Admin reviews and approves/rejects each document. When all documents are approved, the driver account is auto-approved.
- Drivers can view their uploaded documents and their status in the driver portal.

APP FEATURES
- Live GPS tracking of the driver during an accepted ride.
- Ride history and earnings reports (today, this week, all time, plus 7-day daily breakdown).
- Profile picture upload/remove (saved to the database, persists across sessions).
- Real-time notifications via Socket.io (ride accepted/completed/cancelled, account approval status).
- AI fare estimates and help (you are providing this).

PASSWORD RESET
- User requests a reset code via email (forgot password).
- Admin reviews and approves/rejects the reset request.
- Once approved, the user can set a new password.

RULES
- Do NOT answer off-topic questions. Politely decline and steer back to Fairtrike topics.
- Use ONLY information above. Do not invent fares, phone numbers, or prices.
- When users ask for fare estimates, tell them it's a flat ₱30 base fare with a 20% discount for PWD/student/senior (min ₱24), calculated automatically by the app.`;

const ADMIN_SUMMARY_PROMPT = `Write a 3–5 sentence executive summary for the Fairtrike admin dashboard.
Use ONLY the provided statistics. Do not invent numbers. Label the response "AI-generated".`;

const DRIVER_EARNINGS_PROMPT = `Write a short, encouraging earnings summary for a Fairtrike driver.
Use ONLY the provided earnings data. Do not invent numbers. Label the response "AI-generated".`;

const NOTIFICATION_PROMPT = `Write a short, friendly ride-status notification for a passenger.
Context: driver first name, trike number, and status.
Status values: "accepted" (driver accepted), "arriving" (driver on the way), "completed" (trip finished).
One sentence max. Warm, Filipino-friendly tone. Label "AI-generated".`;

// ─── JSON Schema for parse-booking ──────────────────────────────
const PARSE_BOOKING_SCHEMA = {
  type: 'object',
  properties: {
    pickup: { type: 'string', description: 'Pickup location name' },
    dropoff: { type: 'string', description: 'Drop-off location name' },
    tier: { type: 'string', enum: ['regular', 'pwd', 'discounted'], description: 'Fare tier' },
    needs_clarification: { type: 'boolean', description: 'True if input is ambiguous' },
    clarification_question: { type: 'string', nullable: true, description: 'Follow-up question if needed' },
  },
  required: ['pickup', 'dropoff', 'tier', 'needs_clarification', 'clarification_question'],
  propertyOrdering: ['pickup', 'dropoff', 'tier', 'needs_clarification', 'clarification_question'],
};

// ─── POST /api/ai/assistant ──────────────────────────────────────
router.post('/assistant', asyncHandler(async (req, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message || message.length > MAX_INPUT) {
    throw badRequest('Invalid message.');
  }

  // Inject fare context so the model can phrase estimates correctly
  const fareContext = `
Current fare policy (server-side, not from model):
- Regular: flat ₱30 flag-down base fare, minimum ₱30
- PWD / Student / Senior (discounted): 20% off, minimum ₱24
`;

  try {
    const reply = await askGemini({
      system: ASSISTANT_PROMPT + fareContext,
      prompt: message,
    });
    if (!reply) return ok(res, { reply: 'Sorry, I cannot answer that.' });
    ok(res, { reply });
  } catch (err) {
    console.error('[ai]', err.status ?? err.name);
    const [status, error] = mapAiError(err);
    res.status(status).json({ error });
  }
}));

// ─── POST /api/ai/summary ───────────────────────────────────────
router.post('/summary', asyncHandler(async (req, res) => {
  const { type, context } = req.body ?? {};
  if (!['admin', 'driver'].includes(type) || !context) {
    throw badRequest('type must be "admin" or "driver" with context object.');
  }

  const system = type === 'admin' ? ADMIN_SUMMARY_PROMPT : DRIVER_EARNINGS_PROMPT;
  const prompt = JSON.stringify(context);

  try {
    const summary = await askGemini({ system, prompt });
    if (!summary) return ok(res, { summary: 'Unable to generate summary.' });
    ok(res, { summary });
  } catch (err) {
    console.error('[ai]', err.status ?? err.name);
    const [status, error] = mapAiError(err);
    res.status(status).json({ error });
  }
}));

// ─── POST /api/ai/notification ──────────────────────────────────
router.post('/notification', asyncHandler(async (req, res) => {
  const { status, driverName, trikeNumber } = req.body ?? {};
  if (!status || !driverName) {
    throw badRequest('status and driverName are required.');
  }

  const prompt = `Driver: ${driverName}, Trike: ${trikeNumber || 'N/A'}, Status: ${status}`;

  try {
    const message = await askGemini({ system: NOTIFICATION_PROMPT, prompt });
    if (!message) return ok(res, { message: 'Your ride status has been updated.' });
    ok(res, { message });
  } catch (err) {
    console.error('[ai]', err.status ?? err.name);
    const [statusCode, error] = mapAiError(err);
    res.status(statusCode).json({ error });
  }
}));

// ─── POST /api/ai/parse-booking ─────────────────────────────────
router.post('/parse-booking', asyncHandler(async (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  if (!text || text.length > MAX_INPUT) {
    throw badRequest('Invalid booking text.');
  }

  const prompt = `Parse this free-text ride request into structured fields.
User said: "${text}"

Rules:
- Pickup and dropoff should be place names in Olongapo City.
- Tier: "regular" (default), "pwd" (PWD), or "discounted" (student/senior).
- If unclear, set needs_clarification=true and ask a follow-up question.
- Output ONLY valid JSON matching the schema.`;

  try {
    const raw = await askGemini({ system: '', prompt, schema: PARSE_BOOKING_SCHEMA });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return ok(res, {
        pickup: null,
        dropoff: null,
        tier: 'regular',
        needs_clarification: true,
        clarification_question: 'Sorry, I could not understand. Please specify pickup and dropoff.',
      });
    }

    // Validate tier
    if (!['regular', 'pwd', 'discounted'].includes(parsed.tier)) {
      parsed.tier = 'regular';
    }

    ok(res, parsed);
  } catch (err) {
    console.error('[ai]', err.status ?? err.name);
    const [status, error] = mapAiError(err);
    res.status(status).json({ error });
  }
}));

export default router;