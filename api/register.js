import { Resend } from 'resend';

/**
 * POST /api/register
 *
 * Handles webinar registration:
 *   1. Validates input + honeypot
 *   2. (Optional) Creates a Zoom webinar registrant if ZOOM_* env vars are set
 *   3. Sends a confirmation email to the registrant via Resend
 *   4. Sends an admin notification to ADMIN_EMAIL
 *
 * Required env vars:
 *   RESEND_API_KEY      Resend API key (https://resend.com/api-keys)
 *   FROM_EMAIL          Verified sender, e.g. "FOUND <hello@foundperform.com>"
 *   ADMIN_EMAIL         Comma-separated list that gets new-registration notifications
 *
 * Optional env vars (if omitted, we send a shared Zoom link from ZOOM_FALLBACK_URL):
 *   ZOOM_ACCOUNT_ID     Zoom Server-to-Server OAuth account ID
 *   ZOOM_CLIENT_ID      Zoom Server-to-Server OAuth client ID
 *   ZOOM_CLIENT_SECRET  Zoom Server-to-Server OAuth client secret
 *   ZOOM_WEBINAR_ID     Numeric webinar ID for the 29 Apr session
 *   ZOOM_FALLBACK_URL   Plain Zoom Meeting URL used when Webinar API isn't configured
 */

const SESSION = {
  dateLabel: 'Wednesday, 29 April 2026',
  timeLabel: '3:00pm – 4:00pm BST',
  startIso: '2026-04-29T15:00:00+01:00'
};

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

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom registrant failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.join_url; // personalised join URL
}

function buildConfirmationHtml({ firstName, zoomJoinUrl, origin }) {
  const joinBtn = zoomJoinUrl
    ? `<a href="${escapeHtml(zoomJoinUrl)}" style="display:inline-block;background:#ff2846;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;">Join the Zoom</a>`
    : `<p style="color:#555;font-size:14px;margin:0;">We'll send your Zoom link in a separate email the morning of the session.</p>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>You're in</title></head>
<body style="margin:0;padding:0;background:#f1ece4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2d2d2d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ece4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:40px;">
        <tr><td>
          <h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.1;margin:0 0 16px;color:#2d2d2d;">You're in, ${escapeHtml(firstName)}.</h1>
          <p style="font-size:16px;line-height:1.6;color:#444;margin:0 0 24px;">
            You're registered for <strong>Private Markets: Build Future-Ready Skills in an AI World</strong>
            on <strong>${SESSION.dateLabel}</strong>, ${SESSION.timeLabel}.
          </p>
          <div style="margin:32px 0;">${joinBtn}</div>
          <p style="font-size:14px;line-height:1.6;color:#666;margin:0 0 12px;">
            <a href="${origin}/webinar.ics" style="color:#ff2846;font-weight:600;text-decoration:none;">Add to calendar</a>
          </p>
          <hr style="border:none;border-top:1px solid #e8e3da;margin:28px 0;">
          <p style="font-size:14px;line-height:1.6;color:#666;margin:0 0 12px;font-weight:600;color:#2d2d2d;">Three things to do before the session:</p>
          <ol style="font-size:14px;line-height:1.65;color:#555;padding-left:20px;margin:0 0 24px;">
            <li>Add the session to your calendar using the link above.</li>
            <li><a href="https://scorecard.foundperform.com" style="color:#ff2846;">Take the Key Performer Scorecard</a> - useful context to bring.</li>
            <li><a href="https://www.youtube.com/watch?v=d0hXs_6SD-E" style="color:#ff2846;">Watch Emily's interview with Dr Sarah McKay</a> - the perfect primer.</li>
          </ol>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:24px 0 0;">
            Hosted by Emily Cook (Founder, FOUND) and Alexandra Paizee (Principal Scientist, Neuropsychology).
          </p>
          <p style="font-size:12px;line-height:1.6;color:#999;margin:24px 0 0;">
            Questions? Reply to this email or contact <a href="mailto:hello@foundperform.com" style="color:#999;">hello@foundperform.com</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildAdminHtml(data) {
  const rows = Object.entries({
    Name: `${data.firstName} ${data.lastName}`,
    Email: data.email,
    Company: data.company,
    Role: data.role,
    Questions: data.questions || '—',
    Source: data.utm?.utm_source || 'direct',
    Campaign: data.utm?.utm_campaign || '—'
  }).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;">${k}</td><td style="padding:6px 0;font-size:14px;color:#2d2d2d;">${escapeHtml(v)}</td></tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;padding:16px;">
  <h2 style="font-size:18px;margin:0 0 16px;">New webinar registration</h2>
  <table cellpadding="0" cellspacing="0">${rows}</table>
  </body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse JSON (Vercel parses automatically, but guard anyway)
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

  const { RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL, ZOOM_FALLBACK_URL } = process.env;
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
      // Don't block the registration — we'll email them the shared link (or none) and follow up manually
    }
  }

  const resend = new Resend(RESEND_API_KEY);
  const origin = `https://${req.headers.host || 'events.foundperform.com'}`;

  // 1. Confirmation to registrant
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You\u2019re in, ${firstName} - ${SESSION.dateLabel} webinar`,
      html: buildConfirmationHtml({ firstName, zoomJoinUrl, origin })
    });
  } catch (err) {
    console.error('Confirmation email failed:', err);
    return res.status(500).json({ error: 'We couldn\u2019t send your confirmation. Please try again or email hello@foundperform.com.' });
  }

  // 2. Admin notification (non-blocking — don't fail the user if this breaks)
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
