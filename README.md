# FOUND Webinar Registration Page

Single-page registration site for the 29 Apr 2026 webinar, deployed to Vercel.

## What's here

| Path | What it is |
|---|---|
| `index.html` | The landing page (static, self-contained CSS + JS) |
| `api/register.js` | Vercel serverless function that handles form submits: validates, optionally registers with Zoom, sends confirmation email via Resend, notifies admin |
| `webinar.ics` | Static calendar invite for the 29 Apr session (served from root) |
| `vercel.json` | Security headers + `.ics` content-type |
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

### Required

| Var | What | Where to get it |
|---|---|---|
| `RESEND_API_KEY` | Resend API key for sending email | resend.com → API Keys |
| `FROM_EMAIL` | Verified sender, e.g. `FOUND <hello@foundperform.com>` | Must be a verified domain in Resend |
| `ADMIN_EMAIL` | Who gets the "new registration" notification (comma-separated OK) | e.g. `emily@foundperform.com,adam@foundperform.com` |

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
- [ ] `webinar.ics` opens correctly in Google Cal, Outlook, Apple Cal
- [ ] Zoom webinar created (if using Webinars API)
- [ ] Custom domain pointed at Vercel (e.g. `events.foundperform.com`)
- [ ] Test form with a real email end-to-end
- [ ] Privacy policy link resolves
