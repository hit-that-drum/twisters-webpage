# Supabase + Vercel Deployment Guide

This project is refactored for:
- Supabase Postgres as the database
- Vercel frontend deployment (`frontend` project)
- Vercel backend deployment (`backend` project, serverless)

## 1) Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy your Postgres connection string (Transaction pooler URI recommended).

Required backend DB environment variable:
- `SUPABASE_DB_URL` (or `DATABASE_URL`)

## 2) Backend on Vercel

Deploy the `backend` directory as a separate Vercel project.

### Backend environment variables

- `SUPABASE_DB_URL` (recommended)
- `JWT_SECRET`
- `FRONTEND_BASE_URL` (your deployed frontend URL)
- `VITE_GOOGLE_CLIENT_ID` (if Google login is enabled)
- `DB_SSL=true` (default behavior is SSL enabled)

The backend uses:
- `backend/api/[...route].ts` as the Vercel serverless handler
- `backend/vercel.json` to route all requests to the handler

After deploy, your API base URL is your backend domain, for example:
- `https://your-backend.vercel.app`

## 3) Frontend on Vercel

Deploy the `frontend` directory as another Vercel project.

### Frontend environment variables

- `VITE_API_BASE_URL=https://your-backend.vercel.app`
- `VITE_GOOGLE_CLIENT_ID=...`

## 4) Local development

Backend now uses Postgres connection string rather than MySQL host/user/password values.

For local backend development, set:
- `SUPABASE_DB_URL` (or `DATABASE_URL`) in root `.env`
- `DB_SSL=false` only when your local Postgres does not support SSL

Then run:
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

## 5) Notes

- Existing routes are unchanged (`/authentication/*`, `/notice/*`).
- Backend also mounts `/api/authentication/*` and `/api/notice/*` for compatibility with serverless pathing.
