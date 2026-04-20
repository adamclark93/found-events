import { Resend } from 'resend';
import { buildReminderEmail } from './_lib/email.js';

/**
 * GET /api/send-reminder
 *
 * Sends a "tomorrow at 1pm BST" reminder to everyone in the Resend audience.
 *
 * Triggered either by:
 *   - Vercel Cron (configured in vercel.json). Vercel auto-sends
 *     `Authorization: Bearer ${CRON_SECRET}` to cron-scheduled GET requests
 *   - Manual curl: `curl -H "Authorization: Bearer $CRON_SECRET" \
 *       https://events.foundperform.com/api/send-reminder`
 *
 * Query params (for pre-launch testing):
 *   ?dryrun=1           Returns who would be emailed, does not actually send
 *   ?to=foo@bar.co      Sends ONE email to that address only, ignores audience
 *
 * Required env vars: RESEND_API_KEY, FROM_EMAIL, RESEND_AUDIENCE_ID, CRON_SECRET
 * Optional: ZOOM_FALLBACK_URL (included in the email if set)
 *
 * Response: { sent: N, skipped: N, failed: N, errors: [...], mode: "live|dryrun|test" }
 */

export default async function handler(req, res) {
  const { RESEND_API_KEY, FROM_EMAIL, RESEND_AUDIENCE_ID, CRON_SECRET, ZOOM_FALLBACK_URL } = process.env;

  // Auth: require bearer token matching CRON_SECRET
  const authHeader = req.headers['authorization'] || '';
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY or FROM_EMAIL' });
  }

  const dryrun = req.query?.dryrun === '1' || req.query?.dryrun === 'true';
  const testTo = typeof req.query?.to === 'string' ? req.query.to.trim() : '';

  const resend = new Resend(RESEND_API_KEY);
  const origin = `https://${req.headers.host || 'events.foundperform.com'}`;

  // ---------- Test mode: send to a single address only ----------
  if (testTo) {
    const email = buildReminderEmail({
      firstName: 'Test',
      zoomJoinUrl: ZOOM_FALLBACK_URL || '',
      origin
    });
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: testTo,
        subject: `[TEST] ${email.subject}`,
        html: email.html
      });
      return res.status(200).json({ mode: 'test', sent: 1, to: testTo });
    } catch (err) {
      console.error('Test send failed:', err);
      return res.status(500).json({ mode: 'test', error: String(err?.message || err) });
    }
  }

  // ---------- Live / dry-run mode: needs the audience ----------
  if (!RESEND_AUDIENCE_ID) {
    return res.status(500).json({ error: 'Missing RESEND_AUDIENCE_ID. Set it to enable audience-based reminders.' });
  }

  // 1. Fetch all contacts in the audience
  let contacts;
  try {
    const listRes = await resend.contacts.list({ audienceId: RESEND_AUDIENCE_ID });
    contacts = listRes?.data?.data || [];
  } catch (err) {
    console.error('Failed to list contacts:', err);
    return res.status(500).json({ error: 'Failed to fetch audience', detail: String(err?.message || err) });
  }

  // 2. Filter out unsubscribed
  const recipients = contacts.filter(c => !c.unsubscribed && c.email);

  // Dry run: report who would be emailed, don't send
  if (dryrun) {
    return res.status(200).json({
      mode: 'dryrun',
      audienceSize: contacts.length,
      wouldSend: recipients.length,
      skipped: contacts.length - recipients.length,
      recipients: recipients.map(c => ({ email: c.email, firstName: c.first_name || '' }))
    });
  }

  if (recipients.length === 0) {
    return res.status(200).json({ mode: 'live', sent: 0, skipped: contacts.length, failed: 0, errors: [] });
  }

  // 3. Send in batches of 100 (Resend batch API limit)
  const batches = [];
  for (let i = 0; i < recipients.length; i += 100) {
    batches.push(recipients.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const batch of batches) {
    const payload = batch.map(contact => {
      const email = buildReminderEmail({
        firstName: contact.first_name || contact.firstName || '',
        zoomJoinUrl: ZOOM_FALLBACK_URL || '',
        origin
      });
      return {
        from: FROM_EMAIL,
        to: contact.email,
        subject: email.subject,
        html: email.html
      };
    });

    try {
      await resend.batch.send(payload);
      sent += batch.length;
    } catch (err) {
      console.error('Batch send failed, falling back to per-contact:', err);
      // Fallback: try individually so one bad contact doesn't kill the batch
      for (const message of payload) {
        try {
          await resend.emails.send(message);
          sent += 1;
        } catch (individualErr) {
          failed += 1;
          errors.push({ to: message.to, error: String(individualErr?.message || individualErr) });
        }
      }
    }
  }

  return res.status(200).json({
    mode: 'live',
    sent,
    skipped: contacts.length - recipients.length,
    failed,
    errors: errors.slice(0, 10) // cap so response stays small
  });
}
