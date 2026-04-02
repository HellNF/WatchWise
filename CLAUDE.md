# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WatchWise is a movie recommendation platform with two separate projects:
- `watchwise-backend/` — Fastify + MongoDB REST API (TypeScript, port 3001)
- `watchwise-frontend/` — Next.js 16 App Router frontend (TypeScript, port 3000)

## Commands

### Backend (`cd watchwise-backend`)
```bash
npm run dev       # Start with ts-node-dev (hot reload)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled dist/api.js
```

### Frontend (`cd watchwise-frontend`)
```bash
npm run dev       # or: pnpm dev
npm run build
npm run lint      # ESLint
```

## Environment Setup

**Backend** — create `watchwise-backend/.env`:
```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=WatchWise
AUTH_JWT_SECRET=<random hex>
AUTH_TOKEN_TTL=1h
AUTH_BASE_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3001/oauth/google/callback
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
TMDB_API_KEY=...
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_API_READ_ACCESS_TOKEN=...
```

**Frontend** — create `watchwise-frontend/.env`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback
```

## Architecture

### Backend

All routes are registered in `src/api.ts`. Route modules follow the pattern `src/<domain>/routes.ts`.

**Key layers:**
- `src/auth/` — OAuth flow (Google/GitHub), JWT signing/verification (`tokens.ts`), OAuth callback routes
- `src/middleware/auth.ts` — `requireAuth` preHandler that populates `req.userId`. In dev (`NODE_ENV !== 'production'`), `Authorization: Bearer dev` sets userId to `000000000000000000000001`, bypassing real auth
- `src/data/` — MongoDB repositories for users, groups, lists, preferences, watch-history, movies, group-sessions
- `src/adapters/tmdb/` — TMDB API adapter for fetching movie data
- `src/pcs/` — Personalized Content System (recommendation engine)
- `src/common/errors.ts` — `AppError` class with typed `ErrorCode`

**Recommendation engine (`src/pcs/`):**
- `recommend-user/`: builds a candidate pool from TMDB, enriches with details, scores by weighted factors (genre 0.65, actor 0.25, director 0.15, rating 0.1, popularity 0.05), applies serendipity and jitter. Config in `src/pcs/config.ts` (`PCS_CONFIG`)
- `recommend-group/`: similar pipeline adapted for group preference aggregation
- Scoring weights and serendipity params are tunable in `PCS_CONFIG`

### Frontend

Uses Next.js App Router. All pages are under `app/`. The app is dark-mode only (forced `className="dark"`).

**Key patterns:**
- `lib/api.ts` — central `requestJson<T>()` fetch wrapper; auto-attaches JWT from localStorage; in non-production falls back to `Authorization: Bearer dev` when no token exists
- `lib/auth.ts` — OAuth flow helpers: `startOAuth()`, `storeSession()`, `getStoredToken()`, `clearSession()`. Token stored in both `localStorage` and a cookie (`watchwise-token`)
- `app/auth/callback` — OAuth callback handler, also handles the username-conflict flow where backend returns `USERNAME_TAKEN` and suggests alternatives
- `app/api/image/route.ts` — Next.js API route that proxies TMDB image requests (avoids CORS/mixed-content issues)

**Frontend URL structure:**
`/suggestions` (personal recs), `/groups/[id]` (group recs), `/movie/[id]`, `/person/[role]`, `/lists`, `/seen`, `/questionnaire`, `/profile`

## API Documentation

Full API spec: `apiDoc.apib` (API Blueprint format), hosted at https://watchwise.docs.apiary.io/
