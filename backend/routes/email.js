// ── Email test route ───────────────────────────────────────────────────────
// Sends a test email via SMTP so you can verify your configuration works.
// POST /api/email/test   { "to": "recipient@example.com" }
import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/http.js';
import { badRequest } from '../lib/AppError.js';
import { sendTestEmail } from '../lib/email.js';

const router = Router();

router.post(
  '/test',
  asyncHandler(async (req, res) => {
    const { to } = req.body ?? {};
    if (!to || typeof to !== 'string') {
      throw badRequest('Recipient email is required.');
    }

    const sent = await sendTestEmail(to);
    if (!sent) {
      return res.status(502).json({ success: false, error: 'Failed to send test email.' });
    }

    ok(res, { message: 'Test email sent.' });
  })
);

export default router;
