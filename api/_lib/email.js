/**
 * Shared helpers for registration and reminder emails.
 *
 * Any email styling changes should happen here so confirmation and reminder
 * emails stay visually aligned.
 */

export const SESSION = {
  title: 'How to build a competitive advantage in an AI future',
  dateLabel: 'Thursday, 30 April 2026',
  timeLabel: '1:00pm to 2:00pm BST',
  startIso: '2026-04-30T13:00:00+01:00',
  joinUrl: 'https://us06web.zoom.us/j/82080464202'
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
            Questions? Reply to this email or contact <a href="mailto:emily@foundperform.com" style="color:#999;">emily@foundperform.com</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function addToCalendarButton(origin) {
  const title = 'How+to+build+a+competitive+advantage+in+an+AI+future';
  const details = 'FOUND+webinar+with+Emily+Cook+and+Alexandra+Paizee.';
  const location = 'https%3A%2F%2Fus06web.zoom.us%2Fj%2F82080464202';
  const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=2026-04-30T12%3A00%3A00Z&enddt=2026-04-30T13%3A00%3A00Z&subject=${title}&body=${details}&location=${location}`;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20260430T120000Z%2F20260430T130000Z&details=${details}&location=${location}`;
  const outlookIcon = `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:8px;"><path fill="#0078d4" d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.4 1.34-.8v-2.63zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q1.03 0 1.86-.38.82-.39 1.4-1.06.57-.68.87-1.61.3-.93.3-2.01 0-1-.3-1.9-.3-.91-.87-1.58-.57-.68-1.38-1.06-.81-.38-1.82-.38-1.06 0-1.9.38-.84.39-1.4 1.06-.57.68-.87 1.6-.3.93-.3 1.93t.3 1.91q.3.92.86 1.6.56.69 1.39 1.07.83.38 1.86.38z"/></svg>`;
  const googleIcon = `<svg width="16" height="16" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:8px;"><path fill="#fff" d="M148.882 43.618l-47.368-5.263-57.895 5.263L38.355 96.25l5.264 52.632 52.631 6.579 52.632-6.579 5.263-53.947z"/><path fill="#1a73e8" d="M65.211 125.276c-3.934-2.658-6.658-6.539-8.145-11.671l9.132-3.763c.829 3.158 2.276 5.605 4.342 7.342 2.053 1.737 4.553 2.592 7.474 2.592 2.987 0 5.553-.908 7.698-2.724s3.224-4.132 3.224-6.934c0-2.868-1.132-5.211-3.395-7.026s-5.105-2.724-8.5-2.724h-5.276V91.3h4.737c2.921 0 5.382-.789 7.382-2.368s3-3.737 3-6.487c0-2.447-.895-4.395-2.684-5.855s-4.053-2.197-6.803-2.197c-2.684 0-4.816.711-6.395 2.145s-2.724 3.197-3.447 5.276l-9.039-3.763c1.197-3.395 3.395-6.395 6.618-8.987s7.342-3.895 12.342-3.895c3.697 0 7.026.711 9.974 2.145s5.263 3.421 6.934 5.947c1.671 2.539 2.5 5.382 2.5 8.539 0 3.224-.776 5.947-2.329 8.184-1.553 2.237-3.461 3.947-5.724 5.145v.539c2.987 1.25 5.428 3.158 7.342 5.724s2.868 5.632 2.868 9.211-.908 6.776-2.724 9.579c-1.816 2.803-4.329 5.013-7.513 6.618-3.197 1.605-6.789 2.421-10.776 2.421-4.618.013-8.882-1.316-12.803-3.974zM131.63 78.855l-10.026 7.250-5.013-7.605 18.039-13.013h6.895v61.382h-9.895z"/><path fill="#ea4335" d="M148.882 196.053l46.355-46.355-23.158-10.526-23.197 10.526-10.526 23.197z"/><path fill="#34a853" d="M32.079 172.895l10.526 23.158h106.277v-46.355H43.618z"/><path fill="#4285f4" d="M12.105 3.947c-4.342 0-7.895 3.553-7.895 7.895v137.895l23.158 10.526 23.158-10.526V43.618h105.408l10.526-23.158L157.066 3.947z"/><path fill="#188038" d="M4.211 149.737v38.421c0 4.342 3.553 7.895 7.895 7.895h38.421v-46.316H4.211z"/><path fill="#fbbc04" d="M148.882 43.618v106.079h46.355V43.618l-23.158-10.526z"/><path fill="#1967d2" d="M195.237 43.618V11.842c0-4.342-3.553-7.895-7.895-7.895h-31.776l-7.105 23.158z"/></svg>`;
  const btn = (href, icon, label) => `<a href="${href}" style="display:block;padding:12px 14px;background:#f7f3ec;color:#2d2d2d;text-decoration:none;border-radius:10px;border:1px solid #e8e3da;font-weight:600;font-size:14px;text-align:center;">${icon}${label}</a>`;
  return `<div style="margin:28px 0;">
    <p style="font-size:13px;color:#ff2846;margin:0 0 10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Add to calendar</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:420px;">
      <tr>
        <td width="50%" valign="top" style="padding-right:6px;">${btn(outlookUrl, outlookIcon, 'Outlook')}</td>
        <td width="50%" valign="top" style="padding-left:6px;">${btn(googleUrl, googleIcon, 'Google Calendar')}</td>
      </tr>
    </table>
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

function joinWebinarSection(zoomJoinUrl) {
  const url = zoomJoinUrl && zoomJoinUrl.trim() ? zoomJoinUrl : SESSION.joinUrl;
  return `<hr style="border:none;border-top:1px solid #e8e3da;margin:32px 0 20px;">
    <p style="font-size:15px;line-height:1.6;color:#2d2d2d;margin:0 0 14px;font-weight:600;">How to join this webinar</p>
    <p style="font-size:14px;line-height:1.65;color:#555;margin:0 0 18px;">
      On the day, click the button below to join on Zoom. We recommend joining a couple of minutes early.
    </p>
    <div style="margin:0 0 8px;">
      <a href="${url}" style="display:inline-block;background:#ff2846;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Join Webinar</a>
    </div>`;
}

function scorecardCta() {
  return `<p style="font-size:15px;line-height:1.6;color:#2d2d2d;margin:32px 0 10px;font-weight:600;">If you want to discover more before the session:</p>
    <p style="font-size:14px;line-height:1.65;color:#555;margin:0 0 12px;">
      Find out what's holding you back at work. Take our free 5-minute assessment to benchmark yourself against the key performance factors of career success. Built on data &amp; insights from 500+ top professionals.
    </p>
    <p style="margin:0 0 8px;">
      <a href="https://scorecard.foundperform.com" style="color:#ff2846;text-decoration:underline;font-weight:600;font-size:15px;">Take the Performance Assessment</a>
    </p>`;
}

export function buildConfirmationEmail({ firstName, zoomJoinUrl, origin }) {
  const body = `
    <p style="font-size:16px;line-height:1.6;color:#444;margin:0 0 20px;">
      You're registered for <strong>${SESSION.title}</strong>
      on <strong>${SESSION.dateLabel}</strong>, ${SESSION.timeLabel}.
    </p>
    ${addToCalendarButton(origin)}
    <hr style="border:none;border-top:1px solid #e8e3da;margin:24px 0;">
    <p style="font-size:14px;line-height:1.6;color:#2d2d2d;margin:0 0 12px;font-weight:600;">If you want to discover more before the session:</p>
    <ol style="font-size:14px;line-height:1.7;color:#555;padding-left:20px;margin:0 0 24px;">
      <li style="margin-bottom:10px;"><a href="https://scorecard.foundperform.com" style="color:#ff2846;">Take the Key Performer Scorecard.</a><br><span style="color:#777;font-size:13px;">Find out if you are a top performer in your industry.</span></li>
      <li style="margin-bottom:10px;"><a href="${origin}/interview" style="color:#ff2846;">Watch Emily's interview with leading neuroscientist Dr Sarah McKay.</a><br><span style="color:#777;font-size:13px;">Discover the impact of high pressure jobs &amp; AI on the brain.</span></li>
    </ol>
    ${joinWebinarSection(zoomJoinUrl)}
  `;
  return {
    subject: `You're in, ${firstName}. ${SESSION.dateLabel} webinar`,
    html: wrap({ heading: `You're in, ${escapeHtml(firstName)}.`, bodyHtml: body, origin })
  };
}

export function buildReminderEmail({ firstName, zoomJoinUrl, origin }) {
  const body = `
    <p style="font-size:16px;line-height:1.6;color:#444;margin:0 0 20px;">
      Quick reminder that <strong>${SESSION.title}</strong>
      is tomorrow, <strong>${SESSION.dateLabel}</strong> at ${SESSION.timeLabel}.
    </p>
    ${addToCalendarButton(origin)}
    ${learnList()}
    ${scorecardCta()}
    ${joinWebinarSection(zoomJoinUrl)}
    <p style="font-size:13px;line-height:1.6;color:#777;margin:24px 0 0;">
      Can't make it anymore? No action needed. We'll send you the recording.
    </p>
  `;
  const salutation = firstName ? `See you tomorrow, ${escapeHtml(firstName)}.` : 'See you tomorrow.';
  return {
    subject: `Tomorrow at 1pm BST: ${SESSION.title}`,
    html: wrap({ heading: salutation, bodyHtml: body, origin })
  };
}

export function buildAdminHtml(data) {
  const rows = Object.entries({
    Name: `${data.firstName} ${data.lastName}`,
    Email: data.email,
    Company: data.company,
    Questions: data.questions || 'none',
    Source: data.utm?.utm_source || 'direct',
    Campaign: data.utm?.utm_campaign || 'none'
  }).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;">${k}</td><td style="padding:6px 0;font-size:14px;color:#2d2d2d;">${escapeHtml(v)}</td></tr>`).join('');

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;padding:16px;">
  <h2 style="font-size:18px;margin:0 0 16px;">New webinar registration</h2>
  <table cellpadding="0" cellspacing="0">${rows}</table>
  </body></html>`;
}
