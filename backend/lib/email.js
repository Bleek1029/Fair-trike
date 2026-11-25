// ── Email Service (Nodemailer + Gmail SMTP) ─────────────────────────────────
//
// Sends emails using Nodemailer over SMTP (Gmail by default).
// No third-party API key needed — just your Gmail address + App Password.
// See https://myaccount.google.com/apppasswords to generate an App Password.
//
// Required env vars:
//   SMTP_HOST   (default: smtp.gmail.com)
//   SMTP_PORT   (default: 587)
//   SMTP_USER   (your Gmail address)
//   SMTP_PASS   (your Gmail App Password — NOT your regular Gmail password)
//   SMTP_FROM   (default: "Fairtrike" <your SMTP_USER>)

import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initializes the SMTP transporter. Call once at startup.
 */
export async function initEmail() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER/SMTP_PASS not set - emails will not be sent');
    return;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log('[Email] SMTP transporter configured and verified');
  } catch (err) {
    console.error('[Email] SMTP verification failed:', err.message);
    transporter = null;
  }
}

/**
 * Sends an email via SMTP.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body
 * @returns {Promise<boolean>} Success status
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] Would send to ${to}:`, { subject });
      return true;
    }
    console.error('[Email] Cannot send - SMTP not configured');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `Fairtrike <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, ''),
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
 * Sends a welcome email to a newly registered user.
 * @param {string} email - Recipient email
 * @param {string} fullname - Recipient's full name
 * @param {string} role - 'passenger' or 'driver'
 * @param {string} [loginUrl] - Frontend login URL (defaults to env)
 * @returns {Promise<boolean>}
 */
export async function sendWelcomeEmail(email, fullname, role, loginUrl = null) {
  const base = loginUrl || process.env.FRONTEND_URL || 'https://fairtrike.onrender.com';
  const loginLink = `${base}/login`;

  const subject = `Welcome to Fairtrike, ${fullname}!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0d5c3a 0%, #1a73e8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Fairtrike</h1>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 24px;">Hi ${fullname},</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Your Fairtrike account has been created successfully. You can now log in and start using the app as a <strong>${role}</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginLink}" style="background: #0d5c3a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Log In</a>
        </div>
        <p style="font-size: 14px; color: #666; margin-bottom: 16px;">Forgot your password? You can reset it from the login screen.</p>
        <hr style="border: none; border-top: 1px solid #e9ecef; margin: 24px 0;">
        <p style="font-size: 13px; color: #888; margin: 0;">— The Fairtrike Team</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Fairtrike, ${fullname}!

Your Fairtrike account has been created successfully. You can now log in and start using the app as a ${role}.

Log in here: ${loginLink}

Forgot your password? You can reset it from the login screen.

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
    subject: 'Fairtrike — Email Test',
    html: `
      <p>This is a test email from Fairtrike.</p>
      <p>If you received this, your email configuration is working correctly.</p>
      <p>Sent at: ${new Date().toISOString()}</p>
    `,
    text: 'This is a test email from Fairtrike. If you received this, your email configuration is working correctly.',
  });
}
