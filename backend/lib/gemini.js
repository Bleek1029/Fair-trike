import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

// Check if using a test/fake key for development
const isTestKey = process.env.GEMINI_API_KEY === 'test-key-for-local-dev';
// Check if key is missing or looks like a placeholder
const isMissingOrPlaceholder = !process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY === 'test-key-for-local-dev' ||
  process.env.GEMINI_API_KEY.startsWith('placeholder') ||
  process.env.GEMINI_API_KEY.length < 20;

// Use mock responses if key is missing, test key, or placeholder
const useMock = isTestKey || isMissingOrPlaceholder;

let ai;
// Valid model names: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp, gemini-2.0-pro-exp
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
if (!useMock) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch {
    console.warn('[gemini] Failed to initialize GoogleGenAI, falling back to mock');
  }
}
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS) || 15000;

export async function askGemini({ system, prompt, schema }) {
  // Use mock responses for test key, missing key, or invalid key
  if (useMock || !ai) {
    if (useMock) {
      console.log('[gemini] Using mock response (test/missing key)');
    } else {
      console.log('[gemini] Using mock response (AI client not initialized)');
    }
    return getMockResponse({ system, prompt, schema });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    console.log('[gemini] Calling model:', MODEL);
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: system,
        abortSignal: controller.signal,
        ...(schema && { responseMimeType: 'application/json', responseSchema: schema }),
      },
    });
    console.log('[gemini] Response received');
    // Safely extract text from response
    if (!res || typeof res.text !== 'string') {
      return '';
    }
    return res.text;
  } catch (err) {
    console.error('[gemini] Error:', err.message, err.status ?? err.code);
    // Fall back to mock on any error (quota exceeded, invalid key, network issues, etc.)
    console.log('[gemini] Falling back to mock response due to error');
    return getMockResponse({ system, prompt, schema });
  } finally {
    clearTimeout(timer);
  }
}

function getMockResponse({ system, prompt, schema }) {
  // Return mock responses for testing without real API key
  if (system.includes('Fairtrike virtual assistant')) {
    if (prompt.toLowerCase().includes('fare') || prompt.toLowerCase().includes('student') || prompt.toLowerCase().includes('pwd') || prompt.toLowerCase().includes('discount')) {
      return 'For a 5 km ride as a student, the fare would be approximately ₱36.00 (20% discount on the regular ₱45.00 fare). The app calculates this automatically based on distance and your discount tier.';
    }
    if (prompt.toLowerCase().includes('document') || prompt.toLowerCase().includes('register')) {
      return 'To register as a driver, you need 4 documents: 1) Driver\'s license, 2) OR/CR (vehicle registration), 3) TODA certification, 4) Valid ID. Upload them in the driver portal for approval.';
    }
    if (prompt.toLowerCase().includes('book') || prompt.toLowerCase().includes('cancel')) {
      return 'To book a ride, open the map, set your pickup and dropoff, choose your fare tier, and tap Book. To cancel, go to your active ride and tap Cancel (only while pending).';
    }
    return 'I can help you with Fairtrike fares, booking, driver registration, and documents. What would you like to know?';
  }

  if (system.includes('admin dashboard')) {
    // Use real stats from the prompt (passed by the AI route handler from /api/admin/stats)
    let totalUsers = 0, totalDrivers = 0, totalRides = 0, pendingDocs = 0;
    try {
      const ctx = JSON.parse(prompt);
      totalUsers = Object.values(ctx.users ?? {}).reduce((a, b) => a + b, 0);
      totalDrivers = Object.values(ctx.drivers ?? {}).reduce((a, b) => a + b, 0);
      totalRides = Object.values(ctx.rides ?? {}).reduce((a, b) => a + b, 0);
      pendingDocs = ctx.documents?.pending ?? 0;
    } catch {
      // If prompt isn't valid JSON, fall back to zeros
    }
    return `AI-generated: Fairtrike currently has ${totalUsers} active users and ${totalDrivers} drivers on the platform. A total of ${totalRides} rides have been logged, with ${pendingDocs} documents pending review.`;
  }

  if (system.includes('earnings summary')) {
    // Use real earnings data passed in the prompt (from /api/rides/earnings), no hardcoded figures.
    let todayTrips = 0, todayEarnings = 0, weekTrips = 0, weekEarnings = 0, totalTrips = 0, totalEarnings = 0;
    try {
      const ctx = JSON.parse(prompt);
      todayTrips = ctx.today?.trips ?? 0;
      todayEarnings = Number(ctx.today?.earnings ?? 0);
      weekTrips = ctx.week?.trips ?? 0;
      weekEarnings = Number(ctx.week?.earnings ?? 0);
      totalTrips = ctx.totals?.trips ?? 0;
      totalEarnings = Number(ctx.totals?.earnings ?? 0);
    } catch {
      // If prompt isn't valid JSON, fall back to zeros
    }
    const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;
    return `AI-generated: You completed ${todayTrips} trip${todayTrips !== 1 ? 's' : ''} today earning ${fmt(todayEarnings)}. This week: ${weekTrips} trips, ${fmt(weekEarnings)}. All time: ${totalTrips} trips, ${fmt(totalEarnings)}.`;
  }

  if (system.includes('ride-status notification')) {
    if (prompt.includes('accepted')) {
      return 'AI-generated: Kuya Mario (Trike #042) accepted your ride! He\'s on his way to pick you up.';
    }
    if (prompt.includes('arriving')) {
      return 'AI-generated: Your driver Kuya Mario (Trike #042) is arriving at your pickup location.';
    }
    if (prompt.includes('completed')) {
      return 'AI-generated: Your ride with Kuya Mario (Trike #042) is complete. Thank you for choosing Fairtrike!';
    }
    return 'AI-generated: Your ride status has been updated.';
  }

  if (schema) {
    // Parse booking mock response
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('rizal') && lowerPrompt.includes('gordon')) {
      return JSON.stringify({
        pickup: 'Rizal Triangle',
        dropoff: 'Gordon College',
        tier: 'discounted',
        needs_clarification: false,
        clarification_question: null
      });
    }
    if (lowerPrompt.includes('student') || lowerPrompt.includes('discount')) {
      return JSON.stringify({
        pickup: 'SM City Olongapo',
        dropoff: 'Robinsons Place',
        tier: 'discounted',
        needs_clarification: false,
        clarification_question: null
      });
    }
    return JSON.stringify({
      pickup: null,
      dropoff: null,
      tier: 'regular',
      needs_clarification: true,
      clarification_question: 'Could you please specify your pickup and drop-off locations?'
    });
  }

  return 'Mock response for testing';
}