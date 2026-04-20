import { Resend } from 'resend';
import { buildReminderEmail } from './_lib/email.js';

/**
 * GET /api/preview-reminder?to=someone@foundperform.com&firstName=Adam
 *
 * Fires the real rendered reminder email to one address for preview purposes.
 * Only accepts addresses that are already in ADMIN_EMAIL - so anyone browsing
 * the endpoint with a random email gets a 403.
 *
 * No CRON_SECRET, no audience required. Uses the same Resend env vars that
 * /api/register already depends on.
 *
 * Subject is prefixed with [PREVIEW] so it can be told apart from the real
 * reminder that fires from /api/send-reminder on 29 Apr.
 */

export default async function handler(req, res) {
  const { RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL, ZOOM_FALLBACK_URL } = process.env;

  if (!RESEND_API_KEY || !FROM_EMAIL || !ADMIN_EMAIL) {
    return res.status(500).json({ error: 'RESEND_API_KEY, FROM_EMAIL, and ADMIN_EMAIL must all be set' });
  }

  const to = typeof req.query?.to === 'string' ? req.query.to.trim().toLowerCase() : '';
  const firstName = typeof req.query?.firstName === 'string' && req.query.firstName.trim()
    ? req.query.firstName.trim()
    : 'there';

  if (!to) {
    return res.status(400).json({ error: 'Missing ?to=email query param' });
  }

  // Allowlist: only send to addresses already authorised in ADMIN_EMAIL
  const allowed = ADMIN_EMAIL.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(to)) {
    return res.status(403).json({
      error: 'Email not in allowlist',
      hint: 'Add this address to the ADMIN_EMAIL env var in Vercel to allow previews, or use one already in the list.',
      allowed
    });
  }

  const resend = new Resend(RESEND_API_KEY);
  const origin = `https://${req.headers.host || 'events.foundperform.com'}`;
  const email = buildReminderEmail({ firstName, zoomJoinUrl: ZOOM_FALLBACK_URL || '', origin });

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `[PREVIEW] ${email.subject}`,
      html: email.html
    });
    return res.status(200).json({ sent: 1, to, firstName });
  } catch (err) {
    console.error('Preview send failed:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
