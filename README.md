# CoupleSync

CoupleSync is a private web app for two partners. Each person answers on their own. The app compares guesses with actual answers, keeps preference alignment separate from knowledge accuracy, and stores memories, reflections, and personality notes inside one couple space.

This repository is ready to deploy on Vercel or Render. It has not been deployed from this workspace.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

If Supabase variables are empty, the app uses a JSON database at `.data/db.json`. The first request creates the question bank, the fictional demo couple Maya Chen and Jordan Reyes, and the operator from `SUPER_ADMIN_EMAILS` when `SUPER_ADMIN_PASSWORD` is at least 8 characters. The login page has buttons labeled **Enter as Maya** and **Enter as Jordan**. Those accounts are not administrators. When `DEMO_PASSWORD` is set, that same password signs them in as well. Demo login buttons are disabled when Supabase Auth is configured.

Email verification, password reset, contact copies, and optional notification mail go out through Resend when `RESEND_API_KEY` is set. The sender is `wendevNoReply <noreply@wendev.site>`. `wendev.site` is verified in Resend, so messages can reach any inbox. `onboarding@resend.dev` only delivers to the address that owns the API key. Without the key, the one-time link stays on the page for local development.

Set `AUTH_SECRET` before running a production build that does not use Supabase. The development cookie secret is not safe to ship.

## Environment variables

| Name | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, sitemap, and auth redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public browser key. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also accepted |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never prefix it with `NEXT_PUBLIC_` |
| `AUTH_SECRET` | Local-mode session cookie. Required in production without Supabase |
| `RESEND_API_KEY` | Resend API key (`re_…`) for verification, reset, contact, and notification mail |
| `EMAIL_FROM` | From header. `wendevNoReply <noreply@wendev.site>` |
| `CONTACT_EMAIL` | Inbox that receives the public contact form |
| `ADMIN_EMAILS` | Comma-separated emails that receive the question admin tools |
| `SUPER_ADMIN_EMAILS` | Non-demo emails for the super admin role. Demo addresses are ignored |
| `SUPER_ADMIN_PASSWORD` | Local mode only. Creates the operator profile the first time that email is missing |
| `DEMO_PASSWORD` | Password for the fictional seed couple. At least 8 characters. They stay non-admin members |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Set to `true` after Google is enabled in Supabase |

Supabase mode turns on only when the URL, a public key, and the service role key are all set. The browser receives the public key. Server actions check membership before they read or write couple data. Row Level Security is a second boundary for the Data API.

## Supabase setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/20261023000000_couplesync.sql`.
   With the Supabase CLI linked to the project, `supabase db push` applies the same file.
3. In Authentication → URL configuration, set the site URL to `NEXT_PUBLIC_SITE_URL`.
4. Add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://your-domain/reset-password`
5. Enable email/password. Enable Google only if you want it, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
6. Confirm the private Storage bucket `private-media` exists. The migration creates it when the `storage` schema is present. Uploads are limited to JPEG, PNG, WEBP, GIF, and common audio types, at 5 MB for images and 8 MB for audio.
7. Copy the project URL, anon or publishable key, and service role key into `.env.local` or the host’s environment.

Then load the catalog:

```bash
npm run seed
```

Add the fictional couple as data only, without a shared password:

```bash
SEED_DEMO=true npm run seed
```

Set `DEMO_PASSWORD` in that same command when those profiles should have a known password. Those demo profiles are not Supabase Auth users. Use real accounts to sign in when Supabase is configured.

## Authentication

Local mode stores a bcrypt password hash and an httpOnly `cs_session` cookie. Supabase mode uses Supabase Auth for email/password and optional Google. A profile row is created with the Supabase user id on the first signed-in request. Question admin access comes from `ADMIN_EMAILS`. Super admin access comes from `SUPER_ADMIN_EMAILS`, never from the fictional demo couple. In local mode the first operator is created from `SUPER_ADMIN_PASSWORD` when that email has no profile yet. After that, new people are created from the user list.

## What the database enforces

- A person can have one active couple membership.
- A couple can have two active partners.
- Invitation codes and tokens are unique.
- A personal answer is unique per person, couple, and question.
- A prediction is unique per person, round, question, and kind (`partner` or `reverse`).
- Private answers are not readable through the Data API until a reveal row exists for that viewer.
- Sensitive answers also need `shareWithPartner` in the payload.
- Personality answers stay with the owner. A result is visible to a partner only when `shared` is true.
- Administrators can read reports and the question catalog. Policies do not grant them private answers, notes, memories, or personality results.
- `credentials`, `email_tokens`, and `login_attempts` have no Data API policies.

The application server still checks membership itself. Do not trust a couple id sent by the browser.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run start
npm run test:e2e
npm run seed
```

`npm run test:e2e` expects a production build and Playwright’s Chromium browser:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

The end-to-end test registers two people, pairs them with an invitation code, and saves the first step of a quiz. It uses local mode, so leave the Supabase variables empty for that run. The test process disables Resend so the one-time verification link still appears on the page.

## Render

`render.yaml` describes a Node web service. Import the repo in Render as a Blueprint, then fill the dashboard values that are marked secret:

- `NEXT_PUBLIC_SITE_URL` — the `https://` origin Render assigns, or your custom domain
- `RESEND_API_KEY` — the Resend key
- `SUPER_ADMIN_EMAILS` and `SUPER_ADMIN_PASSWORD` — the operator created on first boot in local mode
- `DEMO_PASSWORD` — Maya Chen and Jordan Reyes
- Supabase keys when you want a hosted database instead of the disk

`AUTH_SECRET` is generated by Render. The attached disk keeps `.data` (the local database, seed users, and uploads) across restarts. A verified Resend domain is already set: keep `EMAIL_FROM` on `noreply@wendev.site`.

This workspace has not been deployed.

## Vercel

1. Import the repository in Vercel. Framework preset: Next.js. Install command: `npm install`.
2. Add the environment variables from `.env.example`. Use the production site URL. `AUTH_SECRET` is required. Without Supabase, the local database is stored in `/tmp` on Vercel, so it lasts for that running instance and is seeded again on a cold start. Use Supabase when accounts must survive a new instance.
3. Run the Supabase migration and `npm run seed` against that project before inviting real people.
4. Deploy. Vercel provides HTTPS. Point a custom domain at the project and set `NEXT_PUBLIC_SITE_URL` to that `https://` origin.
5. Add the production `/auth/callback` and `/reset-password` URLs in Supabase.
6. Smoke test register, email verification, create couple, accept invite, answer a quiz, and open the connection page.

Do not put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in a `NEXT_PUBLIC_` variable. Private routes send `noindex`. The landing page, sitemap, robots file, manifest, and Open Graph image are public.

## Product notes

Knowledge score is `points earned / eligible questions × 100`. Skipped questions and questions without a comparable answer are excluded. With nothing eligible, the UI says “Not enough answers yet.” A lower score means there is more to discover. It is a game result, not a judgment of the relationship.

Preference alignment compares the two people’s own answers. Knowledge alignment compares a guess with the other person’s answer. Those are different numbers.

Personality pages are self-reflection tools. They do not diagnose anyone.

English is the interface language. Filipino (`fil`) is selectable in onboarding and settings, stored on the profile, and used for the signed-in navigation labels. Add further copy in `src/lib/i18n.ts`.

## Troubleshooting

- **Build asks for `AUTH_SECRET`.** Set it, or configure Supabase so production sessions use Supabase Auth.
- **Verification email never arrives.** Confirm `RESEND_API_KEY` and `EMAIL_FROM`. The from address must be on `wendev.site`. `onboarding@resend.dev` can only mail the Resend account owner. Addresses ending in `.local` are not mailed.
- **Seed users are missing after a restart.** Local mode stores them in `.data`. On Render that path is the disk in `render.yaml`. Without the disk or Supabase, a new instance starts empty and seeds again.
- **Google button is missing.** Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and enable the Google provider in Supabase.
- **Invite says it is invalid, expired, or already used.** Create a new invitation from settings. Codes expire after seven days and can be revoked.
- **A partner cannot join.** They already belong to a couple, the space already has two people, or they are accepting their own invite. Leaving a couple is in settings. Reconnecting requires both people to agree.
- **Score stays on “Not enough answers yet.”** Guesses need the other person’s actual answer, and the quiz mode has to allow a reveal. Skipped and unshared sensitive answers are not scored.
- **Photos fail in Supabase mode.** Confirm the `private-media` bucket exists and the service role key is set on the server.
- **Seed cannot connect.** Check the service role key and that the migration has been applied. Table names are snake_case.
- **Demo buttons do nothing.** Supabase mode does not sign in the fictional couple. Use a normal account, or run locally without Supabase variables.
