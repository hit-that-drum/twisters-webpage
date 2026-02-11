# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Full-stack authentication web application with React frontend, Express backend, and MySQL database. Supports email/password and Google OAuth authentication using Passport.js with JWT tokens.

## Development Commands

### Docker (recommended for full stack)
```bash
# Start all services (db, backend, frontend)
docker compose up

# Rebuild after dependency changes
docker compose up --build

# Stop services
docker compose down
```

### Local Development

**Backend** (runs on port 5050):
```bash
cd backend && npm run dev
```

**Frontend** (runs on port 5173):
```bash
cd frontend && npm run dev
```

**Frontend lint:**
```bash
cd frontend && npm run lint
```

**Frontend build:**
```bash
cd frontend && npm run build
```

## Architecture

### Backend (`/backend`)
- **Express 5** with TypeScript, uses ES modules (`"type": "module"`)
- Entry point: `src/index.ts`
- **IMPORTANT**: Import statements must use `.js` extensions (e.g., `import pool from '../db.js'`) due to ES module configuration
- Authentication via Passport.js:
  - `src/config/passport.ts` - LocalStrategy (email/password) and JwtStrategy
  - `src/routes/authRoutes.ts` - Auth endpoints under `/authentication`
  - `src/controllers/authController.ts` - Handler functions
- Database: `src/db.ts` - MySQL2 connection pool

### Frontend (`/frontend`)
- **React 19 + Vite + TypeScript + Tailwind CSS**
- Path alias: `@/` maps to `src/` (configured in `vite.config.ts`)
- Entry point: `src/main.tsx`
- Providers: GoogleOAuthProvider, SnackbarProvider (notistack), MUI StyledEngineProvider
- API utility: `src/utils/api.ts` - `apiFetch()` wrapper that auto-attaches JWT from localStorage
- Routes defined in `src/App.tsx`: `/signup`, `/signin`, `/home`, `/home/:userId`

### Environment Variables
Single `.env` file at project root, shared by all services. Required variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `PORT` - Backend port (default: 5050)
- `JWT_SECRET` - For signing JWT tokens
- `VITE_API_BASE_URL` - Frontend API endpoint
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

### Database
- MySQL 8.0 via Docker, schema in `init.sql`
- Single `users` table with email/password and optional Google OAuth fields

## Code Style
- Prettier configured at root: single quotes, semicolons, 2-space indent, 100 char width
- Korean comments used throughout codebase
