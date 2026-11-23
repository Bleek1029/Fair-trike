// ── Email Service ──────────────────────────────────────────────────────
//
// Sends emails using nodemailer with SMTP configuration from environment.
// Supports Neon Auth email provider configuration (shared or standard SMTP).
// Falls back to console logging in development if not configured.

import nodemailer from 'nodemailer';
import { env } from '../config.js';

let transporter = null;
let isConfigured = false;

/**
 * Creates the email transporter from environment configuration.
 * Uses standard SMTP settings (same as Neon Auth email provider).
 */
function createTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const senderEmail = process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER;
  const senderName = process.env.SMTP_SENDER_NAME || 'Fairtrike';

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Optional: custom TLS settings for self-signed certs
    // tls: { rejectUnauthorized: false },
  });

  return { transporter, senderEmail, senderName };
}

/**
 * Initializes the email transporter. Call once at startup.
 */
export async function initEmail() {
  const config = createTransporter();
  if (config) {
    transporter = config.transporter;
    isConfigured = true;
    // Verify connection
    try {
      await transporter.verify();
      console.log('[Email] SMTP connection verified');
    } catch (err) {
      console.error('[Email] SMTP verification failed:', err.message);
      isConfigured = false;
    }
  } else {
    console.warn('[Email] SMTP not configured - emails will be logged to console (dev only)');
  }
}

/**
 * Sends an email.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body
 * @returns {Promise<boolean>} Success status
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured || !transporter) {
    // Development fallback: log to console
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] Would send to ${to}:`, { subject, html: html?.substring(0, 200) });
      return true;
    }
    console.error('[Email] Cannot send - SMTP not configured');
    return false;
  }

  try {
    const config = createTransporter();
    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log('[Email] Sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    return false;
  }
}

/**
 * Sends a password reset email with the reset token.
 * @param {string} email - Recipient email
 * @param {string} token - Plaintext reset token
 * @param {string} [frontendUrl] - Frontend URL for reset link (defaults to env)
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail(email, token, frontendUrl = null) {
  const baseUrl = frontendUrl || process.env.FRONTEND_URL;
  if (!baseUrl) {
    throw new Error('FRONTEND_URL is not set — password reset links cannot be generated.');
  }
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const subject = 'Fairtrike — Password Reset Request';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0d5c3a 0%, #1a73e8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <img src="https://fairtrike.app/fairtrike-logo.png" alt="Fairtrike" style="width: 80px; height: 80px; margin-bottom: 16px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 24px;">Hi there,</p>
        <p style="font-size: 16px; margin-bottom: 24px;">You requested a password reset for your Fairtrike account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #0d5c3a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666; margin-bottom: 16px;">Or copy this link into your browser:</p>
        <p style="font-size: 13px; color: #0d5c3a; word-break: break-all; background: #f1f3f4; padding: 12px; border-radius: 6px;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e9ecef; margin: 24px 0;">
        <p style="font-size: 13px; color: #888; margin: 0;">This link expires in <strong>1 hour</strong> for security. If you didn't request this, please ignore this email.</p>
        <p style="font-size: 13px; color: #888; margin-top: 16px;">— The Fairtrike Team</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request - Fairtrike

Hi there,

You requested a password reset for your Fairtrike account. Visit this link to set a new password:

${resetUrl}

This link expires in 1 hour for security. If you didn't request this, please ignore this email.

— The Fairtrike Team
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Sends a test email to verify SMTP configuration.
 * @param {string} to - Test recipient
 * @returns {Promise<boolean>}
 */
export async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: 'Fairtrike — SMTP Test',
    html: `
      <p>This is a test email from Fairtrike.</p>
      <p>If you received this, your SMTP configuration is working correctly.</p>
      <p>Sent at: ${new Date().toISOString()}</p>
    `,
    text: 'This is a test email from Fairtrike. If you received this, your SMTP configuration is working correctly.',
  });
}

export { isConfigured };