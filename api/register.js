import { Resend } from 'resend';
import { SESSION, buildConfirmationEmail, buildAdminHtml } from './_lib/email.js';

/**
 * POST /api/register
 *
 * Handles webinar registration:
 *   1. Validates input + honeypot
 *   2. (Optional) Creates a Zoom webinar registrant if ZOOM_* env vars are set
 *   3. Sends a confirmation email via Resend
 *   4. Adds the contact to a Resend audience (for the Day-Before reminder)
 *   5. Sends an admin notification to ADMIN_EMAIL
 *
 * Required env vars: RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL
 * Optional env vars: RESEND_AUDIENCE_ID (enables reminder list sync),
 *                    ZOOM_ACCOUNT_ID + ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET + ZOOM_WEBINAR_ID,
 *                    ZOOM_FALLBACK_URL
 */

// Simple in-memory rate limit (resets on cold start; Vercel functions are short-lived)
const recent = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = recent.get(ip) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + RATE_WINDOW_MS;
  }
  entry.count += 1;
  recent.set(ip, entry);
  return entry.count > RATE_MAX;
}

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getZoomAccessToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const creds = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}` }
  });
  if (!res.ok) throw new Error(`Zoom OAuth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function registerZoomAttendee({ firstName, lastName, email }) {
  const token = await getZoomAccessToken();
  const res = await fetch(`https://api.zoom.us/v2/webinars/${process.env.ZOOM_WEBINAR_ID}/registrants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, first_name: firstName, last_name: lastName })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom registrant failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.join_url;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
  }

  // Honeypot: if filled, accept silently without doing anything
  if (body.website && body.website.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const { firstName, lastName, email, company, role, questions, consent, utm } = body;

  if (!firstName || !lastName || !email || !company || !role) {
    return res.status(400).json({ error: 'Please fill in every field.' });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ error: 'That email doesn\u2019t look right. Please check and try again.' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'Please tick the consent box so we can email you the Zoom link.' });
  }

  const { RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL, RESEND_AUDIENCE_ID, ZOOM_FALLBACK_URL } = process.env;
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.error('Missing RESEND_API_KEY or FROM_EMAIL env vars');
    return res.status(500).json({ error: 'Registration isn\u2019t wired up yet. Please email hello@foundperform.com.' });
  }

  // Try Zoom webinar registration if creds are present; otherwise fall back to a shared URL
  let zoomJoinUrl = ZOOM_FALLBACK_URL || '';
  const zoomConfigured = process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET && process.env.ZOOM_WEBINAR_ID;
  if (zoomConfigured) {
    try {
      zoomJoinUrl = await registerZoomAttendee({ firstName, lastName, email });
    } catch (err) {
      console.error('Zoom registration failed, falling back:', err);
    }
  }

  const resend = new Resend(RESEND_API_KEY);
  const origin = `https://${req.headers.host || 'events.foundperform.com'}`;

  // 1. Confirmation to registrant
  const confirmation = buildConfirmationEmail({ firstName, zoomJoinUrl, origin });
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: confirmation.subject,
      html: confirmation.html
    });
  } catch (err) {
    console.error('Confirmation email failed:', err);
    return res.status(500).json({ error: 'We couldn\u2019t send your confirmation. Please try again or email hello@foundperform.com.' });
  }

  // 2. Add to Resend audience so the day-before reminder can find them
  //    Non-blocking - if this fails we still accept the registration.
  if (RESEND_AUDIENCE_ID) {
    try {
      await resend.contacts.create({
        email,
        firstName,
        lastName,
        unsubscribed: false,
        audienceId: RESEND_AUDIENCE_ID
      });
    } catch (err) {
      // Resend treats duplicate-email as an error; safe to ignore
      console.error('Add to audience failed (likely duplicate):', err?.message || err);
    }
  }

  // 3. Admin notification (non-blocking)
  if (ADMIN_EMAIL) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL.split(',').map(s => s.trim()),
        subject: `New registration: ${firstName} ${lastName} (${company})`,
        html: buildAdminHtml({ firstName, lastName, email, company, role, questions, utm })
      });
    } catch (err) {
      console.error('Admin notification failed:', err);
    }
  }

  return res.status(200).json({ ok: true });
}
