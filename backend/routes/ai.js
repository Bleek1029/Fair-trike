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
const ASSISTANT_PROMPT = `You are the Fairtrike virtual assistant for Olongapo City's trike-hailing app.
Answer in the user's language (English, Filipino, or Taglish). Keep replies short and friendly.

Scope:
- Fare rules: ₱30 flag-down + ₱3/km. 20% discount for PWD, students, seniors (min ₱24).
- How to book/cancel a ride.
- Driver registration: 4 required documents (license, OR/CR, TODA cert, ID), approval process.
- App features: live tracking, ride history, earnings, documents.

Do NOT answer off-topic questions. Politely decline and steer back to Fairtrike topics.
When users ask for fare estimates, tell them the fare will be calculated by the app based on distance and their discount tier.`;

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
- Regular: ₱30 flag-down + ₱3/km, minimum ₱30
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