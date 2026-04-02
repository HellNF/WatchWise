# Design: Migrazione WatchWise → Vercel + Supabase

**Data:** 2026-04-02  
**Stato:** Approvato

---

## Obiettivo

Portare WatchWise online gratuitamente migrando:
- Hosting → Vercel (backend Fastify + frontend Next.js)
- Database → Supabase PostgreSQL (da MongoDB)
- Autenticazione → Supabase Auth (da JWT custom + OAuth custom)

Stack risultante: **Fastify + Drizzle ORM + Supabase Auth + Vercel Functions**

---

## 1. Struttura repo e deployment

Il monorepo rimane invariato. Si creano due progetti Vercel separati che puntano allo stesso repository GitHub:

| Progetto Vercel | Root directory | Scopo |
|---|---|---|
| `watchwise-frontend` | `watchwise-frontend/` | Next.js App Router |
| `watchwise-backend` | `watchwise-backend/` | Fastify API |

Vercel rileva Fastify automaticamente e lo esegue come Vercel Function con Fluid Compute. Nessun `vercel.json` necessario.

**Unica modifica strutturale al backend:** rinominare `src/api.ts` → `src/index.ts` per il rilevamento automatico dell'entrypoint Vercel.

### Variabili d'ambiente backend (Vercel)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NODE_ENV=production
# JWKS derivato automaticamente da SUPABASE_URL: <url>/auth/v1/.well-known/jwks.json
```

### Variabili d'ambiente frontend (Vercel)
```
NEXT_PUBLIC_API_BASE_URL=https://watchwise-api.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Rimossi: `MONGODB_URI`, `MONGODB_DB`, `AUTH_JWT_SECRET`, `AUTH_TOKEN_TTL`, `AUTH_BASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `NEXT_PUBLIC_AUTH_BASE_URL`, `NEXT_PUBLIC_AUTH_CALLBACK_URL`.

---

## 2. Migrazione Auth

### Flusso precedente
```
frontend → GET /oauth/google (backend) → Google → backend callback → frontend + JWT custom
```

### Nuovo flusso
```
frontend → Supabase Auth URL → Google/GitHub → Supabase callback → frontend + Supabase JWT
frontend → Authorization: Bearer <supabase-jwt> → Fastify (verifica JOSE) → risposta
```

### Modifiche backend

| File | Azione |
|---|---|
| `src/auth/routes.ts` | **Eliminato** — OAuth ora gestito interamente da Supabase |
| `src/auth/tokens.ts` | **Riscritto** — verifica JWT Supabase via JOSE contro JWKS di Supabase (`https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`) |
| `src/middleware/auth.ts` | **Aggiornato** — cambia solo l'URL JWKS, logica identica |
| `src/api.ts` → `src/index.ts` | **Rinominato** — registrazione `authRoutes` rimossa |

Lo `userId` diventa UUID stringa (da Supabase Auth) invece di MongoDB ObjectId. Tutti i repository aggiornati di conseguenza.

### Modifiche frontend

| File | Azione |
|---|---|
| `lib/auth.ts` | **Riscritto** — `startOAuth()` usa `supabase.auth.signInWithOAuth()` |
| `app/auth/callback/` | **Aggiornato** — legge la sessione da `supabase.auth.getSession()`, salva il token in localStorage come prima |
| `lib/api.ts` | **Invariato** — continua a leggere il token da localStorage e inviarlo come `Bearer` |

Nuova dipendenza frontend: `@supabase/supabase-js`

---

## 3. Migrazione Database

### Setup Drizzle

Nuove dipendenze backend: `drizzle-orm`, `postgres`, `drizzle-kit` (dev)

Nuovi file:
- `src/db/schema.ts` — definizione completa dello schema in TypeScript
- `src/db/index.ts` — connessione PostgreSQL (rimpiazza `src/config/mongodb.ts`)
- `drizzle.config.ts` — configurazione migrazioni

### Schema PostgreSQL

```
users
  id          uuid  PK  (= Supabase Auth user id)
  username    text  UNIQUE NOT NULL
  avatar_url  text
  created_at  timestamptz DEFAULT now()

groups
  id          uuid  PK DEFAULT gen_random_uuid()
  name        text  NOT NULL
  created_by  uuid  FK → users.id
  created_at  timestamptz DEFAULT now()

group_members
  group_id    uuid  FK → groups.id
  user_id     uuid  FK → users.id
  role        text  DEFAULT 'member'
  joined_at   timestamptz DEFAULT now()
  PRIMARY KEY (group_id, user_id)

lists
  id          uuid  PK DEFAULT gen_random_uuid()
  user_id     uuid  FK → users.id
  name        text  NOT NULL
  type        text  NOT NULL  -- 'watchlist' | 'favorites' | 'custom'
  created_at  timestamptz DEFAULT now()

list_items
  list_id     uuid  FK → lists.id
  movie_id    integer  NOT NULL  -- TMDB id
  added_at    timestamptz DEFAULT now()
  PRIMARY KEY (list_id, movie_id)

user_preferences
  user_id         uuid  PK  FK → users.id
  genre_ids       integer[]  DEFAULT '{}'
  actor_ids       integer[]  DEFAULT '{}'
  director_ids    integer[]  DEFAULT '{}'
  updated_at      timestamptz DEFAULT now()

watch_history
  id          uuid  PK DEFAULT gen_random_uuid()
  user_id     uuid  FK → users.id
  movie_id    integer  NOT NULL
  watched_at  timestamptz DEFAULT now()

movies
  tmdb_id     integer  PK
  title       text
  genres      jsonb
  cast        jsonb
  crew        jsonb
  popularity  real
  vote_avg    real
  fetched_at  timestamptz DEFAULT now()

group_sessions
  id          uuid  PK DEFAULT gen_random_uuid()
  group_id    uuid  FK → groups.id
  status      text  DEFAULT 'active'
  created_at  timestamptz DEFAULT now()

group_feedback
  id          uuid  PK DEFAULT gen_random_uuid()
  session_id  uuid  FK → group_sessions.id
  user_id     uuid  FK → users.id
  movie_id    integer  NOT NULL
  feedback    text  NOT NULL  -- 'like' | 'dislike' | 'skip'
  created_at  timestamptz DEFAULT now()
```

### Migrazione repository

Ogni modulo in `src/data/*/` viene riscritto con Drizzle query builder. Le **interfacce pubbliche restano identiche** — le route Fastify non richiedono modifiche.

Esempio di trasformazione:
```ts
// Prima (MongoDB)
const user = await db.collection('users').findOne({ _id: new ObjectId(id) })

// Dopo (Drizzle)
const user = await db.select().from(users).where(eq(users.id, id)).limit(1)
```

### PCS (recommendation engine)

La logica di scoring, serendipity e jitter in `src/pcs/` non cambia. Si aggiornano solo `buildPreferenceProfile()` e `buildCandidatePool()` per usare i nuovi repository Drizzle al posto di quelli MongoDB.

---

## 4. Ordine di implementazione

1. **Fork del repo** su GitHub (operazione manuale prima di iniziare)
2. Rinominare `src/api.ts` → `src/index.ts` e collegare i due progetti su Vercel
3. Configurare Supabase (nuovo progetto, abilitare Google/GitHub OAuth)
4. Aggiungere Drizzle, definire schema, generare migrazione iniziale
5. Riscrivere i repository `src/data/*/` uno per uno
6. Riscrivere `src/auth/` (rimozione OAuth custom, verifica JWT Supabase)
7. Aggiornare frontend: `lib/auth.ts` + `app/auth/callback/`
8. Test end-to-end in locale con `vercel dev`
9. Deploy su Vercel + verifica variabili d'ambiente

---

## 5. Dipendenze finali

### Backend — aggiunte
- `drizzle-orm`
- `postgres` (driver)
- `drizzle-kit` (dev)

### Backend — rimosse
- `mongodb`

### Frontend — aggiunte
- `@supabase/supabase-js`
