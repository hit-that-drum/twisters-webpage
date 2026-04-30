# Supabase + Vercel Deployment Guide

This project is refactored for:
- Supabase Postgres as the database
- Vercel frontend deployment (`frontend` project)
- Vercel backend deployment (`backend` project, serverless)

## Environment split

This repo now separates dotenv files by environment at project root:
- Local test/dev: `.env.development`
- Deployment reference: `.env.production`
- Personal overrides (not committed): `.env.local`, `.env.development.local`, `.env.production.local`

Backend loading order (first value wins):
1. `.env.[NODE_ENV].local`
2. `.env.[NODE_ENV]`
3. `.env.local`
4. `.env`

Frontend (Vite) also reads from root via `frontend/vite.config.ts` (`envDir: '../'`) and uses Vite mode files (`.env.development`, `.env.production`, etc.).

## 1) Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy your Postgres connection string (Transaction pooler URI recommended).

Required backend DB environment variable:
- `SUPABASE_DB_URL` (or `DATABASE_URL`)

## 2) Backend on Vercel

Deploy the `backend` directory as a separate Vercel project.

### Backend pre-deploy checklist

- Root Directory: `backend`
- Build Command: leave default
- Install Command: leave default
- Output Directory: empty
- Framework Preset: Other

### Backend environment variables

- `SUPABASE_DB_URL` (recommended)
- `JWT_SECRET`
- `FRONTEND_BASE_URL` (your deployed frontend URL)
- `EMAIL_FROM` (the sender address used for password reset and signup verification emails)
- `SENDGRID_API_KEY` (recommended)
- `VITE_GOOGLE_CLIENT_ID` (if Google login is enabled)
- `KAKAO_REST_API_KEY` (if Kakao login is enabled)
- `KAKAO_CLIENT_SECRET` (recommended for Kakao code exchange)
- `KAKAO_REDIRECT_URI` (backend Kakao redirect URI)
- `B2_ENDPOINT` (Backblaze B2 S3-compatible endpoint, for example `https://s3.<region>.backblazeb2.com`)
- `B2_REGION`
- `B2_BUCKET_NAME`
- `B2_KEY_ID`
- `B2_APPLICATION_KEY`
- `DB_SSL=true` (default behavior is SSL enabled)

#### Backend env validation checklist

- `SUPABASE_DB_URL` uses Supabase Transaction Pooler URI
- `JWT_SECRET` is a new production-only random secret
- `FRONTEND_BASE_URL` exactly matches frontend production URL (no trailing slash)
- `EMAIL_FROM` is a verified sender address or domain-authenticated address in SendGrid
- SendGrid Web API delivery must be able to send both password-reset emails and signup verification emails
- `SENDGRID_API_KEY` is a valid SendGrid API key with Mail Send permission
- `VITE_GOOGLE_CLIENT_ID` matches Google OAuth web app config
- `KAKAO_REST_API_KEY` matches Kakao Developers REST API key
- `KAKAO_REDIRECT_URI` exactly matches Kakao Developers redirect URI entry
- Backblaze B2 bucket is private, and CORS allows frontend-origin `PUT`, `GET`, and `HEAD`
- `DB_SSL` set to `true` on Vercel

The backend uses:
- `backend/api/[...route].ts` as the Vercel serverless handler
- `backend/vercel.json` to route all requests to the handler

After deploy, your API base URL is your backend domain, for example:
- `https://your-backend.vercel.app`

## 3) Frontend on Vercel

Deploy the `frontend` directory as another Vercel project.

### Frontend pre-deploy checklist

- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `dist`
- Framework Preset: Vite

### Frontend environment variables

- `VITE_API_BASE_URL=https://your-backend.vercel.app`
- `VITE_GOOGLE_CLIENT_ID=...`
- `VITE_KAKAO_REST_API_KEY=...`
- `VITE_KAKAO_REDIRECT_URI=https://your-frontend.vercel.app/auth/kakao/callback`

#### Frontend env validation checklist

- `VITE_API_BASE_URL` points to backend Vercel domain
- `VITE_GOOGLE_CLIENT_ID` equals backend value and Google console value
- `VITE_KAKAO_REST_API_KEY` equals Kakao REST API key
- `VITE_KAKAO_REDIRECT_URI` equals Kakao Developers redirect URI value
- Frontend and backend are both set to Production environment in Vercel

## 4) Release verification checklist

Run after both projects are deployed:

1. Open frontend URL and verify signin page loads.
2. Sign in and confirm `/authentication/me` succeeds.
3. Open Notice page and verify admin/non-admin UI visibility behaves correctly.
4. Create/update/delete notice as admin and verify success.
5. Try create/update/delete as non-admin and verify `403` response.
6. Sign up with a new local account and verify the signup email arrives from `EMAIL_FROM`.
7. Open the email verification link and confirm the frontend lands on `/signin`, consumes the verification token, and shows the verification success message.
8. Attempt local signin before admin approval and confirm the account is blocked with the pending-approval message.
9. Trigger forgot-password flow and verify the reset email arrives, the link opens the frontend, and the reset API succeeds.
10. Confirm backend logs have no DB connection, JWT secret, or SendGrid delivery errors.

## 4.1) Copy-paste Vercel env templates

Backend project (`backend` root directory):

```env
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:6543/postgres
JWT_SECRET=<generate-a-new-random-production-secret>
DB_SSL=true
FRONTEND_BASE_URL=https://your-frontend.vercel.app
EMAIL_APP_NAME=Twisters
EMAIL_FROM=noreply@your-domain.com
SENDGRID_API_KEY=<your-sendgrid-api-key-with-mail-send>
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
KAKAO_REST_API_KEY=<your-kakao-rest-api-key>
KAKAO_CLIENT_SECRET=<your-kakao-client-secret>
KAKAO_REDIRECT_URI=https://your-frontend.vercel.app/auth/kakao/callback
B2_ENDPOINT=https://s3.<region>.backblazeb2.com
B2_REGION=<region>
B2_BUCKET_NAME=<your-private-bucket-name>
B2_KEY_ID=<your-bucket-application-key-id>
B2_APPLICATION_KEY=<your-bucket-application-key>
SESSION_IDLE_TIMEOUT_MINUTES=60
SESSION_ABSOLUTE_TIMEOUT_DAYS=7
SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS=30
SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS=60
```

SendGrid-specific backend example:

```env
EMAIL_APP_NAME=Twisters
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=SG.xxxxx_your_real_sendgrid_api_key
```

SendGrid notes:

- `SENDGRID_API_KEY` must be the real SendGrid API key, not your dashboard password
- `EMAIL_FROM` must be a verified sender or a domain-authenticated address in SendGrid
- Test a real reset email and a real signup verification email immediately after deploy because invalid sender/auth values show up in SendGrid API errors and backend logs

Frontend project (`frontend` root directory):

```env
VITE_API_BASE_URL=https://your-backend.vercel.app
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
VITE_KAKAO_REST_API_KEY=<your-kakao-rest-api-key>
VITE_KAKAO_REDIRECT_URI=https://your-frontend.vercel.app/auth/kakao/callback
```

Remove the Google/Kakao variables from either project if you are not shipping that login option yet.

## 4.2) One-page post-deploy test scenario

1. Open the frontend production URL and confirm the signin page renders without console or network errors.
2. Sign in with an approved member account and verify `/authentication/me` returns `200`.
3. Sign in with an admin account and verify admin-only navigation and Notice CRUD actions are visible and functional.
4. Sign in with a non-admin account and verify admin-only actions are hidden and protected endpoints return `403`.
5. Sign up with a brand-new local account and confirm the signup verification email arrives from `EMAIL_FROM`.
6. Open the verification link and verify the frontend lands on `/signin`, consumes the verification token, and shows the success toast.
7. Attempt local signin before admin approval and confirm the account is blocked with the pending-approval message.
8. Request a password reset for the same account and confirm the reset email arrives from `EMAIL_FROM`.
9. Open the reset link and verify the frontend lands on `/signin` with a valid reset flow.
10. Submit a new password, sign in with it after admin approval, and confirm the old password no longer works.
11. Verify Google login if enabled.
12. Verify Kakao login if enabled, including the callback redirect URL.
13. Review Vercel logs for the frontend and backend and confirm there are no startup, DB, JWT, or SendGrid errors.

## 4.3) Compressed deployment order

1. Create the Supabase project and run `supabase/schema.sql`.
2. Create the Vercel backend project with Root Directory `backend`.
3. Add backend env vars (`SUPABASE_DB_URL`, `JWT_SECRET`, `DB_SSL`, `FRONTEND_BASE_URL`, `EMAIL_FROM`, `SENDGRID_API_KEY`, OAuth values if used).
4. Deploy the backend and save the production API URL.
5. Create the Vercel frontend project with Root Directory `frontend`.
6. Add frontend env vars (`VITE_API_BASE_URL` pointing at the deployed backend, plus OAuth values if used).
7. Deploy the frontend and save the production app URL.
8. Update Google/Kakao console redirect/origin settings to the real production URLs.
9. Run the post-deploy verification sheet, especially signup-verification email delivery, login, `/authentication/me`, admin permissions, and reset-email delivery.

## 5) Local development

Backend now uses Postgres connection string rather than MySQL host/user/password values.

For local backend/frontend development:
- Fill values in root `.env.development`
- Set `DB_SSL=false` when local Postgres does not support SSL
- Keep real secrets in `.env.development.local` if needed (gitignored)
- Without SendGrid configured in local non-production environments, signup/resend flows return a `devVerificationLink` so the frontend can simulate email-link landing on `/signin`

Then run:
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

For Docker Compose local dev:
- `docker compose up --build`
- If dependency resolution looks stale (for example `ERR_MODULE_NOT_FOUND`), reset volumes once:
  `docker compose down -v && docker compose up --build`
- If DB container keeps restarting after switching from MySQL to Postgres, reset volumes once:
  `docker compose down -v && docker compose up --build`

## 6) Notes

- Existing routes are unchanged (`/authentication/*`, `/notice/*`).
- Local account activation is now a two-step process: email verification first, then admin approval.
- Social login accounts (Google/Kakao) are treated as verified once the provider login succeeds, but they still require admin approval before access.
- Backend also mounts `/api/authentication/*` and `/api/notice/*` for compatibility with serverless pathing.
- On Vercel, use Project Environment Variables as the source of truth for production secrets.
