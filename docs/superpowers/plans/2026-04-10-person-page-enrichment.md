# Person Page Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arricchire la pagina `/person/[role]/[id]` con dati biografici completi, gallery foto, sezione "Known for", tab Movies/TV con ordinamento, e link social (IMDB + Instagram), sostituendo l'attuale pagina minimal.

**Architecture:** Il backend arricchisce `fetchPersonDetails` usando `append_to_response=external_ids,images,combined_credits` (singola chiamata TMDB, singola voce di cache). Il frontend riceve un oggetto `PersonFullDetails` più ricco e ridisegna la pagina con le nuove sezioni mantenendo il rendering client-only.

**Tech Stack:** Fastify (backend), Next.js 16 App Router `"use client"` (frontend), TMDB API v3, Tailwind CSS, shadcn/ui, Lucide icons.

---

## File Map

| File | Tipo | Responsabilità |
|------|------|----------------|
| `watchwise-backend/src/adapters/tmdb/types.ts` | Modify | Aggiungere tipi TMDB per person full response |
| `watchwise-backend/src/adapters/tmdb/service.ts` | Modify | Sostituire `fetchPersonDetails` con `fetchPersonFullDetails` |
| `watchwise-frontend/lib/api.ts` | Modify | Aggiornare `PersonDetails` → `PersonFullDetails` + `getPersonDetails` |
| `watchwise-frontend/app/person/[role]/[id]/page.tsx` | Modify | Riscrivere la pagina con tutte le nuove sezioni |

---

## Task 1: TMDB Types — Person Full Response

**Files:**
- Modify: `watchwise-backend/src/adapters/tmdb/types.ts`

- [ ] **Step 1: Aggiungere i nuovi tipi TMDB**

Aprire `watchwise-backend/src/adapters/tmdb/types.ts` e aggiungere in fondo al file (prima della riga vuota finale):

```typescript
// ===== PERSON FULL DETAILS (append_to_response) =====

export interface TMDBPersonCreditItem {
  id: number;
  title?: string;         // movies
  name?: string;          // TV shows
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  poster_path?: string;
  character?: string;     // cast credits
  job?: string;           // crew credits
  department?: string;
  order?: number;
}

export interface TMDBPersonExternalIds {
  imdb_id?: string;
  instagram_id?: string;
  twitter_id?: string;
  facebook_id?: string;
  tiktok_id?: string;
}

export interface TMDBPersonImageProfile {
  file_path: string;
  width: number;
  height: number;
}

export interface TMDBPersonFullResponse {
  id: number;
  name: string;
  profile_path?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  gender: number;           // 0=not set, 1=female, 2=male, 3=non-binary
  place_of_birth?: string;
  also_known_as: string[];
  known_for_department?: string;
  popularity: number;
  external_ids: TMDBPersonExternalIds;
  images: {
    profiles: TMDBPersonImageProfile[];
  };
  combined_credits: {
    cast: TMDBPersonCreditItem[];
    crew: TMDBPersonCreditItem[];
  };
}
```

- [ ] **Step 2: Verificare che il file compili**

```bash
cd watchwise-backend && npx tsc --noEmit 2>&1 | head -20
```

Output atteso: nessun errore (o solo errori preesistenti non correlati).

- [ ] **Step 3: Commit**

```bash
cd watchwise-backend && git add src/adapters/tmdb/types.ts
git commit -m "feat(tmdb): add PersonFullResponse types for append_to_response"
```

---

## Task 2: Backend Service — fetchPersonFullDetails

**Files:**
- Modify: `watchwise-backend/src/adapters/tmdb/service.ts`

- [ ] **Step 1: Aggiornare gli import in cima a service.ts**

Trovare la sezione import dei tipi (righe 1-13) e aggiungere `TMDBPersonFullResponse` all'import esistente:

```typescript
import {
  TMDBMovieListResponse,
  TMDBMovieDetails,
  TMDBWatchProvidersResponse,
  TMDBGenreListResponse,
  TMDBPersonMovieCreditsResponse,
  TMDBDiscoverResponse,
  TMDBPersonSearchResponse,
  TMDBMovieImagesResponse,
  TMDBMovieVideosResponse,
  TMDBKeywordSearchResponse,
  TMDBPersonFullResponse,
} from "./types";
```

- [ ] **Step 2: Definire il tipo PersonFullDetails nel service**

Trovare l'interfaccia `PersonDetails` (riga ~492) e sostituirla interamente con:

```typescript
export interface PersonCreditItem {
  id: number;
  title: string;
  year?: number;
  posterPath?: string;
  popularity: number;
  voteAverage: number;
  mediaType: "movie" | "tv";
  character?: string;
  job?: string;
}

export interface PersonFullDetails {
  id: number;
  name: string;
  profilePath?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  gender?: string;
  placeOfBirth?: string;
  alsoKnownAs: string[];
  knownForDepartment?: string;
  imdbId?: string;
  instagramId?: string;
  images: Array<{ filePath: string; width: number; height: number }>;
  movieCredits: PersonCreditItem[];
  tvCredits: PersonCreditItem[];
}
```

- [ ] **Step 3: Sostituire la funzione fetchPersonDetails**

Trovare la funzione `fetchPersonDetails` (riga ~502) e sostituirla interamente con:

```typescript
function mapGender(g: number): string | undefined {
  if (g === 1) return "Female";
  if (g === 2) return "Male";
  if (g === 3) return "Non-binary";
  return undefined;
}

function mapCreditItem(item: import("./types").TMDBPersonCreditItem): PersonCreditItem {
  const raw = item.title ?? item.name ?? "Unknown";
  const rawDate = item.release_date ?? item.first_air_date;
  const year = rawDate ? new Date(rawDate).getFullYear() : undefined;
  return {
    id: item.id,
    title: raw,
    year: Number.isFinite(year) ? year : undefined,
    posterPath: item.poster_path
      ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
      : undefined,
    popularity: item.popularity,
    voteAverage: item.vote_average,
    mediaType: item.media_type,
    character: item.character || undefined,
    job: item.job || undefined,
  };
}

export async function fetchPersonFullDetails(personId: number): Promise<PersonFullDetails> {
  const cacheKey = `tmdb:person:${personId}:full`;
  const cached = getCached(cacheKey) as PersonFullDetails | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBPersonFullResponse>(
    `/person/${personId}`,
    { append_to_response: "external_ids,images,combined_credits" }
  );

  // Deduplicate credits by id (TMDB can list the same movie multiple times)
  const dedupeById = (items: PersonCreditItem[]): PersonCreditItem[] => {
    const seen = new Set<number>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const allCast = data.combined_credits.cast.map(mapCreditItem);
  const allCrew = data.combined_credits.crew.map(mapCreditItem);

  const movieCast = dedupeById(
    allCast.filter((c) => c.mediaType === "movie").sort((a, b) => b.popularity - a.popularity)
  );
  const movieCrew = dedupeById(
    allCrew
      .filter((c) => c.mediaType === "movie" && c.job === "Director")
      .sort((a, b) => b.popularity - a.popularity)
  );

  // Merge cast + director credits for movies, dedupe again
  const movieCredits = dedupeById([...movieCast, ...movieCrew].sort((a, b) => b.popularity - a.popularity));

  const tvCast = dedupeById(
    allCast.filter((c) => c.mediaType === "tv").sort((a, b) => b.popularity - a.popularity)
  );
  const tvCrew = dedupeById(
    allCrew
      .filter((c) => c.mediaType === "tv" && c.job === "Director")
      .sort((a, b) => b.popularity - a.popularity)
  );
  const tvCredits = dedupeById([...tvCast, ...tvCrew].sort((a, b) => b.popularity - a.popularity));

  const result: PersonFullDetails = {
    id: data.id,
    name: data.name,
    profilePath: data.profile_path
      ? `https://image.tmdb.org/t/p/w300${data.profile_path}`
      : undefined,
    biography: data.biography || undefined,
    birthday: data.birthday || undefined,
    deathday: data.deathday || undefined,
    gender: mapGender(data.gender),
    placeOfBirth: data.place_of_birth || undefined,
    alsoKnownAs: data.also_known_as ?? [],
    knownForDepartment: data.known_for_department || undefined,
    imdbId: data.external_ids?.imdb_id || undefined,
    instagramId: data.external_ids?.instagram_id || undefined,
    images: (data.images?.profiles ?? []).slice(0, 6).map((p) => ({
      filePath: `https://image.tmdb.org/t/p/w185${p.file_path}`,
      width: p.width,
      height: p.height,
    })),
    movieCredits,
    tvCredits,
  };

  setCached(cacheKey, result);
  return result;
}
```

- [ ] **Step 4: Aggiornare l'export in index.ts**

Aprire `watchwise-backend/src/adapters/tmdb/index.ts` e aggiungere `fetchPersonFullDetails` e `PersonFullDetails` agli export:

```bash
grep -n "fetchPersonDetails\|PersonDetails" watchwise-backend/src/adapters/tmdb/index.ts
```

Sostituire le righe che esportano `fetchPersonDetails` e `PersonDetails` con `fetchPersonFullDetails` e `PersonFullDetails`. Se il file non esiste o non ha questi export, aprirlo e aggiungere manualmente.

- [ ] **Step 5: Verificare che il backend compili**

```bash
cd watchwise-backend && npx tsc --noEmit 2>&1 | head -30
```

Output atteso: nessun errore legato ai nuovi tipi.

- [ ] **Step 6: Commit**

```bash
cd watchwise-backend && git add src/adapters/tmdb/service.ts src/adapters/tmdb/index.ts
git commit -m "feat(tmdb): replace fetchPersonDetails with fetchPersonFullDetails using append_to_response"
```

---

## Task 3: Backend Route — Aggiornare GET /api/people/:id

**Files:**
- Modify: `watchwise-backend/src/data/movies/routes.ts`

- [ ] **Step 1: Aggiornare l'import nel file routes.ts**

Trovare la riga che importa `fetchPersonDetails` (riga ~24) e sostituirla con `fetchPersonFullDetails`:

```typescript
import {
  fetchTrendingMovies,
  fetchPopularMovies,
  fetchNowPlayingMovies,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
  fetchMovieDetails,
  fetchStreamingAvailability,
  fetchMovieGenres,
  fetchMovieByActor,
  fetchMovieByDirector,
  fetchMoviesByGenre,
  searchMovies,
  searchPeople,
  fetchMovieImages,
  fetchMovieVideos,
  fetchMovieWatchProviders,
  fetchSimilarMovies,
  fetchRecommendedMovies,
  discoverMovies,
  searchKeywords,
  fetchPersonFullDetails,
  fetchJustWatchLinks,
} from "../../adapters/tmdb/service";
```

- [ ] **Step 2: Aggiornare il handler del route GET /api/people/:id**

Trovare il route handler (riga ~108):

```typescript
app.get("/api/people/:id", async (req, reply) => {
  const id = Number((req.params as any).id);
  if (!Number.isFinite(id)) {
    return reply.code(400).send({ error: "Invalid person id" });
  }
  return fetchPersonFullDetails(id);
});
```

- [ ] **Step 3: Verificare manualmente con curl**

Avviare il backend: `cd watchwise-backend && npm run dev`

In un altro terminale:
```bash
curl "http://localhost:3001/api/people/115440" | jq '{name, birthday, imdbId, movieCredits: (.movieCredits | length), tvCredits: (.tvCredits | length), images: (.images | length)}'
```

Output atteso (Sydney Sweeney):
```json
{
  "name": "Sydney Sweeney",
  "birthday": "1997-09-12",
  "imdbId": "nm4400073",
  "movieCredits": 25,
  "tvCredits": 15,
  "images": 6
}
```
I valori esatti varieranno ma tutti i campi devono essere presenti e non null.

- [ ] **Step 4: Commit**

```bash
cd watchwise-backend && git add src/data/movies/routes.ts
git commit -m "feat(routes): wire GET /api/people/:id to fetchPersonFullDetails"
```

---

## Task 4: Frontend API — Aggiornare PersonDetails type

**Files:**
- Modify: `watchwise-frontend/lib/api.ts`

- [ ] **Step 1: Trovare e sostituire il tipo PersonDetails**

Aprire `watchwise-frontend/lib/api.ts`. Trovare il tipo `PersonDetails` (riga ~596) e sostituirlo:

```typescript
export interface PersonCreditItem {
  id: number;
  title: string;
  year?: number;
  posterPath?: string;
  popularity: number;
  voteAverage: number;
  mediaType: "movie" | "tv";
  character?: string;
  job?: string;
}

export interface PersonFullDetails {
  id: number;
  name: string;
  profilePath?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  gender?: string;
  placeOfBirth?: string;
  alsoKnownAs: string[];
  knownForDepartment?: string;
  imdbId?: string;
  instagramId?: string;
  images: Array<{ filePath: string; width: number; height: number }>
  movieCredits: PersonCreditItem[];
  tvCredits: PersonCreditItem[];
}
```

- [ ] **Step 2: Aggiornare la funzione getPersonDetails**

Trovare la funzione `getPersonDetails` (riga ~603) e sostituirla:

```typescript
export async function getPersonDetails(personId: string) {
  return requestJson<PersonFullDetails>(`/people/${personId}`)
}
```

- [ ] **Step 3: Verificare che il frontend compili**

```bash
cd watchwise-frontend && npx tsc --noEmit 2>&1 | head -30
```

Ci si aspettano errori di tipo nella `page.tsx` della persona (perché usa ancora i vecchi campi) — questi verranno risolti nel Task 5. Tutti gli altri file non devono avere errori nuovi.

- [ ] **Step 4: Commit**

```bash
cd watchwise-frontend && git add lib/api.ts
git commit -m "feat(api): update PersonDetails → PersonFullDetails with credits, images, social"
```

---

## Task 5: Frontend Page — Riscrivere la pagina persona

**Files:**
- Modify: `watchwise-frontend/app/person/[role]/[id]/page.tsx`

Questa è una riscrittura completa. Sostituire l'intero contenuto del file con:

- [ ] **Step 1: Sostituire il contenuto del file**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import {
  postPreference,
  getPreferences,
  getPersonDetails,
  PersonFullDetails,
  PersonCreditItem,
} from "@/lib/api"
import {
  ChevronLeft,
  Loader2,
  Clapperboard,
  User,
  Heart,
  ExternalLink,
  Instagram,
  ChevronDown,
  ChevronUp,
  Tv,
} from "lucide-react"
import { toast } from "sonner"

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = "popularity" | "year" | "rating"

function sortCredits(items: PersonCreditItem[], key: SortKey): PersonCreditItem[] {
  const copy = [...items]
  if (key === "popularity") return copy.sort((a, b) => b.popularity - a.popularity)
  if (key === "year") return copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  if (key === "rating") return copy.sort((a, b) => b.voteAverage - a.voteAverage)
  return copy
}

// ─── Gallery Lightbox ─────────────────────────────────────────────────────────

function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: PersonFullDetails["images"]
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fixed inset-0 m-auto max-w-sm w-[90vw] bg-zinc-900 border border-white/10 rounded-2xl p-0 backdrop:bg-black/70"
    >
      <div className="relative">
        <img
          src={images[idx].filePath}
          alt=""
          className="w-full rounded-2xl object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80"
          aria-label="Close"
        >
          ✕
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === idx ? "bg-white scale-125" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </dialog>
  )
}

// ─── TV Show Card (disabled) ──────────────────────────────────────────────────

function TvShowCard({ item }: { item: PersonCreditItem }) {
  return (
    <div className="group relative flex flex-col gap-2 cursor-default select-none">
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-zinc-800">
        {item.posterPath ? (
          <img
            src={item.posterPath}
            alt={item.title}
            className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Tv className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className="bg-violet-600/80 text-white border-0 text-[10px] px-1.5 py-0.5 gap-1">
            <Tv className="h-2.5 w-2.5" />
            TV
          </Badge>
        </div>
      </div>
      <div className="px-0.5">
        <p className="text-xs font-medium text-zinc-300 leading-tight line-clamp-2">{item.title}</p>
        {item.year && <p className="text-[11px] text-zinc-500 mt-0.5">{item.year}</p>}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PersonMoviesPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const roleParam = String(params.role ?? "").toLowerCase()
  const personId = String(params.id ?? "")
  const personName = searchParams.get("name") ?? "Unknown Person"
  const isDirector = roleParam === "director"

  const [details, setDetails] = useState<PersonFullDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const [bioExpanded, setBioExpanded] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const [activeTab, setActiveTab] = useState<"movies" | "tv">("movies")
  const [sortKey, setSortKey] = useState<SortKey>("popularity")
  const [visibleCount, setVisibleCount] = useState(24)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ─── Fetch details ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!personId) return
    setLoading(true)
    getPersonDetails(personId)
      .then((d) => setDetails(d))
      .catch(() => setError("Unable to load person details. Please try again."))
      .finally(() => setLoading(false))
  }, [personId])

  // ─── Check favorited ────────────────────────────────────────────────────────
  useEffect(() => {
    const role = isDirector ? "director" : "actor"
    getPreferences()
      .then((prefs) => {
        const match = prefs.find(
          (p) => p.type === role && p.value.toLowerCase() === personName.toLowerCase()
        )
        setIsFavorited(Boolean(match))
      })
      .catch(() => {})
  }, [personName, isDirector])

  // ─── Infinite scroll ────────────────────────────────────────────────────────
  const currentCredits = details
    ? sortCredits(activeTab === "movies" ? details.movieCredits : details.tvCredits, sortKey)
    : []

  useEffect(() => {
    setVisibleCount(24)
  }, [activeTab, sortKey])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || visibleCount >= currentCredits.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + 12, currentCredits.length))
      },
      { rootMargin: "300px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, currentCredits.length])

  // ─── Favorite ───────────────────────────────────────────────────────────────
  const handleFavorite = async () => {
    const role = isDirector ? "director" : "actor"
    setFavoriteLoading(true)
    try {
      if (!isFavorited) {
        await postPreference({ type: role, value: personName, weight: 0.9, source: "person-page" })
        setIsFavorited(true)
        toast.success(`${personName} added to your favorites`)
      } else {
        setIsFavorited(false)
        toast(`${personName} removed from favorites`)
      }
    } catch {
      toast.error("Could not update favorites. Try again.")
    } finally {
      setFavoriteLoading(false)
    }
  }

  // ─── Known for (top 6 movie credits by popularity) ──────────────────────────
  const knownFor = details?.movieCredits.slice(0, 6) ?? []

  const displayedCredits = currentCredits.slice(0, visibleCount)
  const heroImage = details?.profilePath

  // ─── Format date ────────────────────────────────────────────────────────────
  const formatDate = (iso?: string) => {
    if (!iso) return undefined
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  return (
    <main className="relative min-h-dvh bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      <Header />

      {/* Background ambience */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <div className="p-1.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Back
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading person details...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
          </div>
        )}

        {!loading && !error && details && (
          <>
            {/* ── Hero ───────────────────────────────────────────────────── */}
            <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 h-52 md:h-72">
              {heroImage && (
                <img
                  src={heroImage}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-25 pointer-events-none"
                />
              )}
              {heroImage && (
                <img
                  src={heroImage}
                  alt={details.name}
                  className="absolute right-8 bottom-0 h-full max-h-56 md:max-h-72 w-auto object-cover object-top rounded-t-xl opacity-90 pointer-events-none hidden sm:block"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

              <div className="relative h-full flex flex-col justify-end p-6 md:p-10">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <Badge
                      variant="outline"
                      className="w-fit border-white/10 bg-white/5 text-zinc-400 uppercase tracking-widest text-[10px] gap-1.5 pl-2"
                    >
                      {isDirector ? <Clapperboard className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isDirector ? "Director" : "Actor"}
                    </Badge>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                      {details.name}
                    </h1>
                    {/* Social links */}
                    <div className="flex items-center gap-3 mt-1">
                      {details.imdbId && (
                        <a
                          href={`https://www.imdb.com/name/${details.imdbId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          IMDB
                        </a>
                      )}
                      {details.instagramId && (
                        <a
                          href={`https://www.instagram.com/${details.instagramId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-pink-400 transition-colors"
                        >
                          <Instagram className="h-3 w-3" />
                          Instagram
                        </a>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFavorite}
                    disabled={favoriteLoading}
                    className={
                      isFavorited
                        ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60 shrink-0"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white shrink-0"
                    }
                  >
                    <Heart className={`h-4 w-4 mr-1.5 transition-all ${isFavorited ? "fill-primary text-primary" : ""}`} />
                    {isFavorited ? "Favorited" : "Add to favorites"}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Bio section (2 columns) ────────────────────────────────── */}
            {(details.birthday || details.biography || details.alsoKnownAs.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mb-10 p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                {/* Left: personal info */}
                <div className="flex flex-col gap-4">
                  {details.knownForDepartment && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Known for</p>
                      <p className="text-sm text-zinc-200">{details.knownForDepartment}</p>
                    </div>
                  )}
                  {details.birthday && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Birthday</p>
                      <p className="text-sm text-zinc-200">{formatDate(details.birthday)}</p>
                    </div>
                  )}
                  {details.deathday && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Died</p>
                      <p className="text-sm text-zinc-200">{formatDate(details.deathday)}</p>
                    </div>
                  )}
                  {details.placeOfBirth && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Place of birth</p>
                      <p className="text-sm text-zinc-200">{details.placeOfBirth}</p>
                    </div>
                  )}
                  {details.gender && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Gender</p>
                      <p className="text-sm text-zinc-200">{details.gender}</p>
                    </div>
                  )}
                  {details.alsoKnownAs.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Also known as</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {details.alsoKnownAs.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: biography */}
                {details.biography && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Biography</p>
                    <p
                      className={`text-sm text-zinc-300 leading-relaxed whitespace-pre-line ${
                        bioExpanded ? "" : "line-clamp-4"
                      }`}
                    >
                      {details.biography}
                    </p>
                    <button
                      type="button"
                      onClick={() => setBioExpanded((v) => !v)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {bioExpanded ? (
                        <><ChevronUp className="h-3 w-3" /> Show less</>
                      ) : (
                        <><ChevronDown className="h-3 w-3" /> Read more</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Gallery strip ──────────────────────────────────────────── */}
            {details.images.length > 0 && (
              <div className="mb-10">
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">Photos</p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {details.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="shrink-0 w-24 h-32 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02]"
                    >
                      <img
                        src={img.filePath}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && (
              <GalleryLightbox
                images={details.images}
                initialIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
              />
            )}

            {/* ── Known for strip ────────────────────────────────────────── */}
            {knownFor.length > 0 && (
              <div className="mb-10">
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3">Known for</p>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                  {knownFor.map((movie) => (
                    <div key={movie.id} className="shrink-0 w-36">
                      <MovieCard
                        id={String(movie.id)}
                        title={movie.title}
                        poster={movie.posterPath}
                        year={movie.year}
                        rating={movie.voteAverage}
                      >
                        <MovieQuickActions movieId={String(movie.id)} />
                      </MovieCard>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tabs + Sort ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("movies")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "movies"
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Movies
                  {details.movieCredits.length > 0 && (
                    <span className="ml-1.5 text-[11px] text-zinc-500">
                      {details.movieCredits.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("tv")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "tv"
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  TV Shows
                  {details.tvCredits.length > 0 && (
                    <span className="ml-1.5 text-[11px] text-zinc-500">
                      {details.tvCredits.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Sort toggle */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                {(["popularity", "year", "rating"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSortKey(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                      sortKey === key
                        ? "bg-white/10 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {key === "popularity" ? "Popular" : key === "year" ? "Recent" : "Rating"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Filmography grid ───────────────────────────────────────── */}
            {currentCredits.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                <p className="text-zinc-500">No titles found for this person.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {displayedCredits.map((item) =>
                    activeTab === "tv" ? (
                      <TvShowCard key={item.id} item={item} />
                    ) : (
                      <MovieCard
                        key={item.id}
                        id={String(item.id)}
                        title={item.title}
                        poster={item.posterPath}
                        year={item.year}
                        rating={item.voteAverage}
                      >
                        <MovieQuickActions movieId={String(item.id)} />
                      </MovieCard>
                    )
                  )}
                </div>

                <div ref={sentinelRef} className="h-1" aria-hidden />
                {visibleCount < currentCredits.length && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {visibleCount >= currentCredits.length && currentCredits.length > 24 && (
                  <div className="flex flex-col items-center gap-2 text-zinc-500 py-10">
                    <div className="h-1 w-12 bg-zinc-800 rounded-full" />
                    <p className="text-sm">Full filmography loaded</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
```

- [ ] **Step 2: Verificare che il frontend compili senza errori**

```bash
cd watchwise-frontend && npx tsc --noEmit 2>&1 | head -30
```

Output atteso: nessun errore.

- [ ] **Step 3: Verifica visiva manuale**

Avviare frontend e backend:
```bash
# Terminal 1
cd watchwise-backend && npm run dev

# Terminal 2
cd watchwise-frontend && npm run dev
```

Aprire `http://localhost:3000/person/actor/115440?name=Sydney%20Sweeney` e verificare:
- [ ] Hero con foto, nome, link IMDB e Instagram visibili
- [ ] Sezione bio con data di nascita, luogo, gender, "also known as"
- [ ] Biografia troncata a 4 righe con bottone "Read more"
- [ ] Gallery strip con 4–6 foto; click apre lightbox nativo
- [ ] Sezione "Known for" con 6 film in scroll orizzontale
- [ ] Tab Movies/TV con conteggio film
- [ ] Sort toggle (Popular / Recent / Rating) che riordina la griglia
- [ ] Tab TV mostra badge "TV" viola sulle card
- [ ] Infinite scroll funziona nella tab Movies

Aprire `http://localhost:3000/person/director/525?name=Christopher%20Nolan` e verificare:
- [ ] Hero con badge "Director"
- [ ] Filmografia mostra film diretti (Inception, Interstellar, etc.)
- [ ] Tab TV eventualmente vuota o con pochi titoli

- [ ] **Step 4: Commit finale**

```bash
cd watchwise-frontend && git add app/person/[role]/[id]/page.tsx
git commit -m "feat(person-page): full enrichment — bio, gallery, known-for, tabs, sort"
```

---

## Spec Coverage Check

| Requisito | Task |
|-----------|------|
| Dati biografici completi (birthday, place_of_birth, deathday, gender, also_known_as) | Task 2, Task 4, Task 5 |
| Gallery 4–6 foto con lightbox `<dialog>` | Task 2 (slice), Task 5 |
| Sezione "Known for" orizzontale | Task 5 |
| Tab Movies / TV Shows | Task 5 |
| Sort toggle 3-way | Task 5 |
| Card TV con badge, no click | Task 5 |
| Link IMDB + Instagram | Task 2, Task 5 |
| Backend singola chiamata TMDB `append_to_response` | Task 2 |
| Deduplicazione crediti | Task 2 |
| Bio troncata + "Read more" | Task 5 |
| Favorite button preservato | Task 5 |
| Infinite scroll preservato | Task 5 |
