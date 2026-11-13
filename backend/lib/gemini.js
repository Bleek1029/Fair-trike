import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

// Check if using a test/fake key for development
const isTestKey = process.env.GEMINI_API_KEY === 'test-key-for-local-dev';

let ai;
let MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
if (!isTestKey) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
  // Use a valid model name for test mode (won't actually be used)
  MODEL = 'gemini-1.5-flash';
}
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS) || 15000;

export async function askGemini({ system, prompt, schema }) {
  // Development fallback for test key
  if (isTestKey) {
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
    // Attach status info for error mapping
    if (err.response?.status) {
      err.status = err.response.status;
    } else if (err.statusCode) {
      err.status = err.statusCode;
    } else if (err.code) {
      err.status = err.code;
    }
    throw err;
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
    return 'AI-generated: Fairtrike has 150 active users, 42 drivers (8 pending approval), 1,200 completed rides this month, and 3 documents awaiting review. The platform is running smoothly with steady growth.';
  }

  if (system.includes('earnings summary')) {
    return 'AI-generated: Great week! You completed 18 trips earning ₱2,340.00. Your daily average is ₱334.00. Keep up the excellent work serving Olongapo commuters!';
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