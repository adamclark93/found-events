/**
 * Shared helpers for registration and reminder emails.
 *
 * Any email styling changes should happen here so confirmation and reminder
 * emails stay visually aligned.
 */

export const SESSION = {
  dateLabel: 'Wednesday, 29 April 2026',
  timeLabel: '3:00pm to 4:00pm BST',
  startIso: '2026-04-29T15:00:00+01:00'
};

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * Layout wrapper used by every customer-facing email.
 * Keeps colours, typography stack, logo, and spacing consistent.
 */
function wrap({ heading, bodyHtml, origin }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f1ece4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2d2d2d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ece4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:36px 40px 32px;">
        <tr><td>
          <div style="text-align:center;margin:0 0 28px;">
            <img src="${origin}/found-logo.png" alt="FOUND" width="96" style="display:block;margin:0 auto;max-width:96px;height:auto;">
          </div>
          <h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.15;margin:0 0 20px;color:#2d2d2d;">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          <hr style="border:none;border-top:1px solid #e8e3da;margin:32px 0 20px;">
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 10px;">
            Hosted by Emily Cook (Founder, FOUND) and Alexandra Paizee (Principal Scientist, Neuropsychology).
          </p>
          <p style="font-size:12px;line-height:1.6;color:#999;margin:0;">
            Questions? Reply to this email or contact <a href="mailto:hello@foundperform.com" style="color:#999;">hello@foundperform.com</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function addToCalendarButton(origin) {
  return `<div style="margin:28px 0;">
    <a href="${origin}/webinar.ics" style="display:inline-block;background:#ff2846;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;">Add to Calendar</a>
  </div>`;
}

function learnList() {
  return `<p style="font-size:14px;line-height:1.6;color:#2d2d2d;margin:28px 0 12px;font-weight:600;">A reminder of what you'll learn</p>
    <ul style="font-size:15px;line-height:1.7;color:#555;padding-left:20px;margin:0 0 28px;">
      <li>How AI is impacting the way you think and perform.</li>
      <li>The skills shaping the future of private markets.</li>
      <li>Live Q&amp;A with Alexandra and Emily.</li>
    </ul>`;
}

function scorecardCta() {
  return `<p style="font-size:15px;line-height:1.6;color:#2d2d2d;margin:32px 0 10px;font-weight:600;">One thing to do ahead of the session</p>
    <p style="font-size:14px;line-height:1.65;color:#555;margin:0 0 20px;">
      Find out what's holding you back at work. We've created a free 5-minute assessment to benchmark you against the key performance factors of career success. Built on data &amp; insights from 500+ top professionals.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 8px;">
      <tr><td align="center">
        <a href="https://scorecard.foundperform.com" style="display:inline-block;background:#ff2846;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Take Performance Assessment</a>
      </td></tr>
    </table>`;
}

export function buildConfirmationEmail({ firstName, zoomJoinUrl, origin }) {
  const body = `
    <p style="font-size:16px;line-height:1.6;color:#444;margin:0 0 20px;">
      You're registered for <strong>Private Markets: Build Future-Ready Skills in an AI World</strong>
      on <strong>${SESSION.dateLabel}</strong>, ${SESSION.timeLabel}.
    </p>
    ${addToCalendarButton(origin)}
    <hr style="border:none;border-top:1px solid #e8e3da;margin:24px 0;">
    <p style="font-size:14px;line-height:1.6;color:#2d2d2d;margin:0 0 12px;font-weight:600;">Two things to do before the session</p>
    <ol style="font-size:14px;line-height:1.7;color:#555;padding-left:20px;margin:0 0 24px;">
      <li><a href="https://scorecard.foundperform.com" style="color:#ff2846;">Take the Key Performer Scorecard.</a> Useful context to bring.</li>
      <li><a href="https://www.youtube.com/watch?v=d0hXs_6SD-E" style="color:#ff2846;">Watch Emily's interview with Dr Sarah McKay.</a> The perfect primer.</li>
    </ol>
  `;
  return {
    subject: `You're in, ${firstName}. ${SESSION.dateLabel} webinar`,
    html: wrap({ heading: `You're in, ${escapeHtml(firstName)}.`, bodyHtml: body, origin })
  };
}

export function buildReminderEmail({ firstName, zoomJoinUrl, origin }) {
  const body = `
    <p style="font-size:16px;line-height:1.6;color:#444;margin:0 0 20px;">
      Quick reminder that <strong>Private Markets: Build Future-Ready Skills in an AI World</strong>
      is tomorrow, <strong>${SESSION.dateLabel}</strong> at ${SESSION.timeLabel}.
    </p>
    <p style="margin:0 0 12px;">
      <a href="${origin}/webinar.ics" style="color:#ff2846;text-decoration:underline;font-weight:600;font-size:15px;">add to your calendar</a>
    </p>
    ${learnList()}
    ${scorecardCta()}
    <p style="font-size:13px;line-height:1.6;color:#777;margin:24px 0 0;">
      Can't make it anymore? No action needed. We'll send you the recording.
    </p>
  `;
  const salutation = firstName ? `See you tomorrow, ${escapeHtml(firstName)}.` : 'See you tomorrow.';
  return {
    subject: `Tomorrow at 3pm BST: Private Markets x AI webinar`,
    html: wrap({ heading: salutation, bodyHtml: body, origin })
  };
}

export function buildAdminHtml(data) {
  const rows = Object.entries({
    Name: `${data.firstName} ${data.lastName}`,
    Email: data.email,
    Company: data.company,
    Role: data.role,
    Questions: data.questions || 'none',
    Source: data.utm?.utm_source || 'direct',
    Campaign: data.utm?.utm_campaign || 'none'
  }).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;">${k}</td><td style="padding:6px 0;font-size:14px;color:#2d2d2d;">${escapeHtml(v)}</td></tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;padding:16px;">
  <h2 style="font-size:18px;margin:0 0 16px;">New webinar registration</h2>
  <table cellpadding="0" cellspacing="0">${rows}</table>
  </body></html>`;
}
