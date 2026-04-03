# WatchWise — Bug Report

> Stato aggiornato: 2026-04-03

---

## BUG-01 — `watchwise-user` mai scritto in localStorage

**Sintomo:** Dopo il login con Google/GitHub, il token viene salvato (`watchwise-token`) ma le informazioni dell'utente (`watchwise-user`) non vengono mai scritte. L'header mostra "Sign in" invece dell'avatar.

**Stato:** ⚠️ Parzialmente mitigato nel codice (fallback user scritto anche se backend non raggiungibile). Il vero fix richiede configurazione Vercel.

**Percorso del codice:**
`app/auth/callback/page.tsx` → `upsertUserSession()` → `POST /api/auth/session`

**Causa radice — livello 1 (Frontend → Backend):**
```typescript
// app/auth/callback/page.tsx:13
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
```
`NEXT_PUBLIC_API_BASE_URL` è una variabile `NEXT_PUBLIC_*`, quindi viene iniettata **a build time** da Vercel. Se non è configurata nel progetto frontend Vercel, `API_BASE = ""` e la fetch diventa:
```
fetch("/api/auth/session")   ← URL relativa → Next.js risponde 404
```
Il `catch` ora salva un `fallbackUser` dal JWT Supabase (avatar vuoto, username dall'email), quindi l'header mostra qualcosa — ma l'utente non viene creato nel database backend.

**Causa radice — livello 2 (Backend → Supabase):**
Anche se il frontend chiama il backend correttamente, `POST /api/auth/session` può fallire con **500** se la variabile `SUPABASE_URL` non è configurata nel progetto **backend** Vercel.

**Fix necessario (configurazione Vercel):**
- Vercel → Progetto **frontend** → Settings → Environment Variables → aggiungere:
  ```
  NEXT_PUBLIC_API_BASE_URL = https://<dominio-backend>.vercel.app
  ```
- Vercel → Progetto **backend** → Settings → Environment Variables → verificare:
  ```
  SUPABASE_URL = https://<project-id>.supabase.co
  ```
- Dopo aver aggiunto le variabili: **re-deploy entrambi i progetti**

---

## BUG-02 — Redirect sempre alla landing page "/" dopo login

**Stato:** ✅ RISOLTO (2026-04-03)

**Sintomo:** Dopo autenticazione avvenuta con successo, l'utente veniva reindirizzato a `/` invece che a `/profile`.

**Fix applicati:**

**A. `lib/auth.ts` — disabilitato `detectSessionInUrl`**
```typescript
_supabase = createClient(url, key, {
  auth: { detectSessionInUrl: false },
})
```
Root cause: Supabase intercettava automaticamente il `code` dalla URL e chiamava `exchangeCodeForSession` in background. Il nostro `useEffect` chiamava lo stesso codice una seconda volta → codice PKCE già usato → Promise rejected → nessun redirect.

**B. `app/auth/callback/page.tsx` — aggiunto `.catch()` al chain**
```typescript
supabase.auth.exchangeCodeForSession(code)
  .then(async (...) => { ... })
  .catch((err: unknown) => {
    setStatus("error")
    setDetails(err instanceof Error ? err.message : "Unknown authentication error")
  })
```
Senza `.catch()`, qualsiasi rejection lasciava lo status su "idle" (spinner infinito, nessun messaggio di errore, nessun redirect).

---

## BUG-03 — Header non si aggiorna dopo login (stale UI)

**Stato:** ✅ PARZIALMENTE RISOLTO (2026-04-03)

**Sintomo:** Dopo redirect a `/profile`, l'header mostrava "Sign in / Sign up" invece dell'avatar.

**Causa principale:** BUG-01 (se `watchwise-user` non viene scritto, l'Header non trova nulla). Risolto con il fallback in BUG-01.

**Causa secondaria risolta:** Il cambio avatar nel profilo aggiornava `localStorage["watchwise-user"]` ma **non dispatchava `watchwise-auth-changed`** → l'Header non si aggiornava.

**Fix in `app/profile/page.tsx`:**
```typescript
localStorage.setItem("watchwise-user", JSON.stringify(parsed))
window.dispatchEvent(new Event("watchwise-auth-changed"))  // ← aggiunto
```

---

## BUG-04 — Backend non raggiungibile dal frontend in produzione

**Stato:** ⚠️ Richiede configurazione Vercel (vedi checklist sotto)

**Sintomo:** Tutte le chiamate API del frontend falliscono (raccomandazioni, liste, gruppi, ecc.)

**Cose da verificare:**

1. **URL frontend → backend:** Se `NEXT_PUBLIC_API_BASE_URL = "https://backend.vercel.app"`, le API vengono chiamate come `https://backend.vercel.app/api/...`. ✓

2. **Vercel backend routing:** `vercel.json` manda tutto a `api/index.ts`. ✓

---

## BUG-05 — Link "TV Series" nell'header porta a 404 *(nuovo)*

**Stato:** ✅ RISOLTO (2026-04-03)

**Sintomo:** Il link "TV Series" nella navbar desktop era un `<Link href="/tv">` che portava a una pagina inesistente. Il dropdown mostrava già "Coming soon..." ma il link stesso era cliccabile.

**Fix in `components/header.tsx`:**
```tsx
// Prima
<Link href="/tv" className="... disabled:opacity-50">TV Series</Link>

// Dopo
<span className="text-sm font-medium text-foreground/40 cursor-not-allowed select-none">
  TV Series
</span>
```

---

## Checklist variabili d'ambiente Vercel

### Progetto Backend
| Variabile | Dove trovarla | Obbligatoria |
|-----------|--------------|--------------|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | ✅ |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (Transaction mode) | ✅ |
| `TMDB_API_KEY` | themoviedb.org → Account → API | ✅ |
| `TMDB_API_READ_ACCESS_TOKEN` | themoviedb.org → Account → API | ✅ |
| `NODE_ENV` | `production` | ✅ |

### Progetto Frontend
| Variabile | Valore | Obbligatoria |
|-----------|--------|--------------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://<nome-progetto-backend>.vercel.app` | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key | ✅ |
| `NEXT_PUBLIC_AUTH_CALLBACK_URL` | `https://<nome-progetto-frontend>.vercel.app/auth/callback` | ✅ |

> ⚠️ Dopo aver aggiunto o modificato variabili `NEXT_PUBLIC_*`, è necessario fare un **nuovo deploy** del frontend perché vengono iniettate a build time.

---

## Checklist configurazione Supabase

1. **Authentication → URL Configuration → Site URL:** impostare a `https://<frontend>.vercel.app`
2. **Authentication → URL Configuration → Redirect URLs:** aggiungere:
   - `https://<frontend>.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (per sviluppo locale)
3. **Authentication → Providers → Google/GitHub:** abilitati con Client ID e Secret corretti

---

## Ordine di diagnosi consigliato

```
1. Verifica variabili d'ambiente Vercel (checklist sopra)
2. Apri DevTools → Console → fai login → leggi gli errori
3. Apri DevTools → Network → cerca la richiesta POST /api/auth/session
   → se manca del tutto: NEXT_PUBLIC_API_BASE_URL non è impostata
   → se risponde 401/500: SUPABASE_URL mancante nel backend
   → se risponde 200: il bug è nel codice di callback (controllare BUG-02)
4. Apri DevTools → Application → localStorage → subito dopo redirect OAuth
   → se watchwise-auth-redirect = "/profile": il redirect dovrebbe funzionare
   → se la chiave è assente: Safari ITP o bug pre-redirect
5. Controlla Supabase → Authentication → Logs per errori OAuth
```
