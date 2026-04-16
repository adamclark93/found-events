# FOUND Webinar Registration Page

Single-page registration site for the 29 Apr 2026 webinar, deployed to Vercel.

## What's here

| Path | What it is |
|---|---|
| `index.html` | The landing page (static, self-contained CSS + JS) |
| `api/register.js` | Serverless function for form submits: validates, optionally registers with Zoom, sends confirmation via Resend, adds contact to audience, notifies admin |
| `api/send-reminder.js` | Serverless function that sends the day-before reminder to every contact in the Resend audience. Triggered by Vercel Cron or manual curl |
| `api/_lib/email.js` | Shared email template module - confirmation and reminder both use it, so styling stays aligned |
| `webinar.ics` | Static calendar invite for the 29 Apr session (served from root) |
| `vercel.json` | Security headers, `.ics` content-type, and cron schedule |
| `package.json` | Just `resend` as a dep |
| `*.jpg`, `*.png` | Hero, speaker, testimonial, logo images |

## Running locally

```bash
python3 -m http.server 8080      # serves the static page (form submit will 404 until deployed)
```

For full end-to-end testing including the API, run Vercel's dev server:

```bash
npx vercel dev
```

This runs at http://localhost:3000 and routes `/api/register` to the serverless function.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables. All are used by `api/register.js`.

### Required for registration

| Var | What | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | Resend API key for sending email | resend.com → API Keys |
| `FROM_EMAIL` | Verified sender, e.g. `FOUND <emily@foundperform.com>` | Must be a verified domain in Resend |
| `ADMIN_EMAIL` | Who gets the "new registration" notification (comma-separated OK) | e.g. `emily@foundperform.com,adam@foundperform.com` |

### Required for day-before reminder

| Var | What | Where to get it |
|---|---|---|
| `RESEND_AUDIENCE_ID` | UUID of the Resend audience that registrants get added to | Resend → Audiences → create "Webinar 29 Apr 2026" → copy the ID |
| `CRON_SECRET` | Random string that authenticates `/api/send-reminder` calls. Vercel Cron sends this automatically | Generate with `openssl rand -hex 32` (or any random 32+ char string) |

### Optional — adds personalised Zoom join links

If all four are set, the function will register each person directly with Zoom Webinars and send them their personal join URL. If any are missing, we fall back to `ZOOM_FALLBACK_URL`.

| Var | What |
|---|---|
| `ZOOM_ACCOUNT_ID` | From Zoom Server-to-Server OAuth app |
| `ZOOM_CLIENT_ID` | ^ |
| `ZOOM_CLIENT_SECRET` | ^ |
| `ZOOM_WEBINAR_ID` | Numeric ID of the webinar you created in Zoom for 29 Apr |
| `ZOOM_FALLBACK_URL` | Shared Zoom Meeting link — used if Webinar API isn't set up |

## Setting up Resend (required)

1. Sign in at [resend.com](https://resend.com).
2. Add `foundperform.com` as a domain → add the DNS records Resend shows you (SPF, DKIM, return-path). Wait for it to verify.
3. API Keys → Create API Key → name it `found-events-prod` → copy the value.
4. In Vercel:
   - `RESEND_API_KEY` = that value
   - `FROM_EMAIL` = `FOUND <hello@foundperform.com>` (or any verified address on the domain)
   - `ADMIN_EMAIL` = whoever should see new registrations

That's enough to go live. Emails will be sent, admin gets notified, confirmation link placeholder points to `ZOOM_FALLBACK_URL` or reads "we'll send the link the morning of" if that's unset too.

## Setting up the day-before reminder

A Vercel Cron job fires `/api/send-reminder` at **08:00 UTC on 28 April 2026 (9:00am BST)**. It reads every contact in the Resend audience and sends them a branded "see you tomorrow" email.

To enable it:

1. **Resend → Audiences → Create audience** → name it e.g. "Webinar 29 Apr 2026" → copy the audience ID.
2. **Generate a secret** on your terminal:
   ```bash
   openssl rand -hex 32
   ```
3. **Vercel env vars** — add:
   - `RESEND_AUDIENCE_ID` = the audience ID from step 1
   - `CRON_SECRET` = the secret from step 2
4. **Redeploy**. New registrations from this point on get added to the audience.
5. **Confirm the cron is scheduled**: Vercel → Project → Settings → Cron Jobs. You should see `/api/send-reminder` scheduled for `0 8 28 4 *`.

### Firing the reminder manually

If you need to send early, late, or test-send, you can hit the endpoint by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://events.foundperform.com/api/send-reminder
```

It returns `{ mode, sent, skipped, failed, errors }` so you can see what happened.

### Pre-launch testing

Before 28 Apr, use one of these to confirm everything is wired correctly:

**Dry run** — see who would be emailed without sending anything:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://events.foundperform.com/api/send-reminder?dryrun=1"
```
Returns `{ mode: "dryrun", audienceSize, wouldSend, recipients: [...] }`. Confirms your audience is populated and the function can read it.

**Send to yourself** — fire the real rendered email only to one address:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://events.foundperform.com/api/send-reminder?to=emily@foundperform.com"
```
Subject gets prefixed with `[TEST]` so you can tell it apart from the real send. Use this to verify the rendered email is exactly as expected.

### Verifying the cron is scheduled

Vercel → Project → Settings → Cron Jobs. You should see `/api/send-reminder` with next run showing **28 Apr 2026 08:00 UTC**. If it's missing or the date is wrong, the cron won't fire.

After the cron fires, check Vercel → Functions → Logs → `send-reminder.js` to see the execution result (status code, counts, any errors).

### After the webinar

The cron expression is `0 8 28 4 *` - no year, so it fires every year on 28 April at 08:00 UTC. Delete it from `vercel.json` (or from Vercel Cron Jobs UI) after the event if you don't want it firing again in 2027.

## Setting up Zoom Webinars (recommended but optional)

This gives each registrant a personal, non-shareable Zoom join link. Without it, everyone gets the same link.

### 1. Enable Zoom Webinars

You need a Zoom plan with the **Webinars add-on** (~$79/mo for 100 attendees). If you only want a basic group call, skip this and use `ZOOM_FALLBACK_URL` with a regular Zoom Meeting link.

### 2. Create the webinar in Zoom

- Zoom web portal → Webinars → Schedule a Webinar
- Topic: `Private Markets: Build Future-Ready Skills in an AI World`
- When: 29 Apr 2026, 3:00pm, duration 60 minutes, timezone London
- Registration: **Required** → "Automatically Approve"
- Add Emily + Alexandra as panelists
- Save. Copy the numeric **Webinar ID** from the URL — that's `ZOOM_WEBINAR_ID`.

### 3. Create a Server-to-Server OAuth app

- Zoom App Marketplace → Develop → Build App → Server-to-Server OAuth
- Name: `FOUND Registration API`
- Scopes needed: `webinar:write:admin` (to add registrants), `webinar:read:admin`
- Activate the app
- Copy **Account ID**, **Client ID**, **Client Secret** → those are `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`

### 4. Add all four env vars in Vercel and redeploy

Next registration will be created as a real Zoom registrant and get their personal join URL in the confirmation email.

## Spam & rate limiting

- **Honeypot field** on the form — bots auto-fill it and get silently 200'd with no email sent.
- **In-memory rate limit**: 5 requests per IP per minute per function instance. Good enough for launch; swap for Upstash Redis if you see scripted abuse.

## Analytics (not yet wired)

Add GA4 + LinkedIn Insight tag script tags in `<head>` when ready. Form submit already dispatches a `register-form` submit event you can hook into.

## Post-launch checklist

- [ ] Resend domain verified and sender email tested
- [ ] `ADMIN_EMAIL` receives a test registration
- [ ] Resend audience created and `RESEND_AUDIENCE_ID` set
- [ ] `CRON_SECRET` set (32+ chars, random)
- [ ] Manual reminder test: `curl -H "Authorization: Bearer $CRON_SECRET" .../api/send-reminder` returns `sent > 0`
- [ ] Vercel Cron Jobs shows `/api/send-reminder` on `0 8 28 4 *`
- [ ] `webinar.ics` opens correctly in Google Cal, Outlook, Apple Cal
- [ ] Zoom webinar created (if using Webinars API)
- [ ] Custom domain pointed at Vercel (e.g. `events.foundperform.com`)
- [ ] Test form with a real email end-to-end
- [ ] Privacy policy link resolves
