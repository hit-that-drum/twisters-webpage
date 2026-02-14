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
- `VITE_GOOGLE_CLIENT_ID` (if Google login is enabled)
- `DB_SSL=true` (default behavior is SSL enabled)

#### Backend env validation checklist

- `SUPABASE_DB_URL` uses Supabase Transaction Pooler URI
- `JWT_SECRET` is a new production-only random secret
- `FRONTEND_BASE_URL` exactly matches frontend production URL (no trailing slash)
- `VITE_GOOGLE_CLIENT_ID` matches Google OAuth web app config
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

#### Frontend env validation checklist

- `VITE_API_BASE_URL` points to backend Vercel domain
- `VITE_GOOGLE_CLIENT_ID` equals backend value and Google console value
- Frontend and backend are both set to Production environment in Vercel

## 4) Release verification checklist

Run after both projects are deployed:

1. Open frontend URL and verify signin page loads.
2. Sign in and confirm `/authentication/me` succeeds.
3. Open Notice page and verify admin/non-admin UI visibility behaves correctly.
4. Create/update/delete notice as admin and verify success.
5. Try create/update/delete as non-admin and verify `403` response.
6. Trigger forgot-password flow and verify reset link + reset API behavior.
7. Confirm backend logs have no DB connection or JWT secret errors.

## 5) Local development

Backend now uses Postgres connection string rather than MySQL host/user/password values.

For local backend/frontend development:
- Fill values in root `.env.development`
- Set `DB_SSL=false` when local Postgres does not support SSL
- Keep real secrets in `.env.development.local` if needed (gitignored)

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
- Backend also mounts `/api/authentication/*` and `/api/notice/*` for compatibility with serverless pathing.
- On Vercel, use Project Environment Variables as the source of truth for production secrets.
