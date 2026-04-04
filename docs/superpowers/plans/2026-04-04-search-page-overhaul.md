# Search Page Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the slow, client-side-filtered search page with a backend-powered discover pipeline, instant debounced search, avatar person suggestions, URL state, sort + load more, empty-state trending sections, and a mobile bottom-sheet filter panel.

**Architecture:** A new `GET /api/movies/discover` backend endpoint translates all filter params directly into TMDB `/discover/movie` query params (or `/search/movie` when free text is present), returning `{ results, total_pages, page }`. The frontend becomes a pure display layer with no post-fetch filtering. Filters are serialised into the URL via `useSearchParams` so searches are shareable and survive refresh.

**Tech Stack:** Fastify (backend), Next.js 16 App Router + `useSearchParams`/`useRouter` (frontend), TMDB REST API, `vaul` Drawer (already installed) for mobile bottom sheet, Tailwind CSS + shadcn/ui components already present.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `watchwise-backend/src/adapters/tmdb/types.ts` | Modify | Add `total_pages` to `TMDBDiscoverResponse` |
| `watchwise-backend/src/adapters/tmdb/service.ts` | Modify | Add `discoverMovies()` function |
| `watchwise-backend/src/data/movies/routes.ts` | Modify | Add `GET /api/movies/discover` route; expose `profile_path` from people search |
| `watchwise-frontend/lib/api.ts` | Modify | Add `DiscoverParams`, `DiscoverResult`, `discoverMovies()`, update `PersonSearchResult` |
| `watchwise-frontend/components/search-filters.tsx` | Create | Reusable filter panel (sidebar + bottom sheet) |
| `watchwise-frontend/components/search-empty-state.tsx` | Create | Trending/upcoming/top-rated sections shown before any search |
| `watchwise-frontend/app/search/page.tsx` | Rewrite | Orchestrator: URL state, debounce, sort, load more, mobile sheet |

---

## Task 1 — Backend types: add `total_pages` to discover response

**Files:**
- Modify: `watchwise-backend/src/adapters/tmdb/types.ts`

The current `TMDBDiscoverResponse` only has `page` and `results`. TMDB also returns `total_pages` which we need for "Load more" pagination.

- [ ] **Step 1: Update the type**

In `watchwise-backend/src/adapters/tmdb/types.ts`, change:

```typescript
export interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
}
```

to:

```typescript
export interface TMDBDiscoverResponse {
  page: number;
  total_pages: number;
  results: TMDBMovie[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd watchwise-backend && npx tsc --noEmit
```

Expected: no errors (the field was already returned by TMDB but unused).

- [ ] **Step 3: Commit**

```bash
git add watchwise-backend/src/adapters/tmdb/types.ts
git commit -m "feat(backend): expose total_pages in TMDBDiscoverResponse"
```

---

## Task 2 — Backend service: `discoverMovies()`

**Files:**
- Modify: `watchwise-backend/src/adapters/tmdb/service.ts`

Add a new exported function that builds a full TMDB discover or search call from structured params. When `query` is present it uses `/search/movie` (TMDB doesn't support free text in `/discover`). Otherwise it uses `/discover/movie` with all filter params.

- [ ] **Step 1: Add the function at the bottom of `service.ts`**

Append after the existing `searchPeople` function:

```typescript
export interface DiscoverParams {
  query?: string;
  genre_ids?: string;        // comma-separated TMDB genre IDs e.g. "28,12"
  year_from?: number;
  year_to?: number;
  rating_min?: number;
  rating_max?: number;
  runtime_min?: number;
  runtime_max?: number;
  with_cast?: number;        // TMDB person ID
  with_crew?: number;        // TMDB person ID (director)
  sort_by?: string;          // e.g. "popularity.desc"
  page?: number;
}

export interface DiscoverResponse {
  results: MovieCandidate[];
  page: number;
  total_pages: number;
}

export async function discoverMovies(
  params: DiscoverParams
): Promise<DiscoverResponse> {
  const page = params.page ?? 1;
  const sortBy = params.sort_by ?? "popularity.desc";

  // If free-text query: use /search/movie (TMDB doesn't support text + discover)
  if (params.query?.trim()) {
    const cacheKey = `tmdb:search:movie:${params.query}:${page}`;
    const cached = getCached(cacheKey) as DiscoverResponse | undefined;
    if (cached) return cached;

    const data = await tmdbFetch<TMDBDiscoverResponse>("/search/movie", {
      query: params.query.trim(),
      page,
    });

    const result: DiscoverResponse = {
      results: data.results.map(mapTMDBMovieToCandidate),
      page: data.page,
      total_pages: data.total_pages ?? 1,
    };
    setCached(cacheKey, result);
    return result;
  }

  // Otherwise: use /discover/movie with all filter params
  const discoverParams: Record<string, string | number | undefined> = {
    sort_by: sortBy,
    page,
    with_genres: params.genre_ids || undefined,
    "primary_release_date.gte": params.year_from
      ? `${params.year_from}-01-01`
      : undefined,
    "primary_release_date.lte": params.year_to
      ? `${params.year_to}-12-31`
      : undefined,
    "vote_average.gte": params.rating_min,
    "vote_average.lte": params.rating_max,
    "with_runtime.gte": params.runtime_min,
    "with_runtime.lte": params.runtime_max,
    with_cast: params.with_cast,
    with_crew: params.with_crew,
    "vote_count.gte": 10, // avoid noise from films with 1 vote
  };

  // Build a stable cache key from all non-undefined params
  const cacheKey = `tmdb:discover:${JSON.stringify(discoverParams)}`;
  const cached = getCached(cacheKey) as DiscoverResponse | undefined;
  if (cached) return cached;

  const data = await tmdbFetch<TMDBDiscoverResponse>(
    "/discover/movie",
    discoverParams
  );

  const result: DiscoverResponse = {
    results: data.results.map(mapTMDBMovieToCandidate),
    page: data.page,
    total_pages: data.total_pages ?? 1,
  };
  setCached(cacheKey, result);
  return result;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd watchwise-backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add watchwise-backend/src/adapters/tmdb/service.ts
git commit -m "feat(backend): add discoverMovies() with full TMDB param support"
```

---

## Task 3 — Backend route: `GET /api/movies/discover` + person avatar fix

**Files:**
- Modify: `watchwise-backend/src/data/movies/routes.ts`

Two changes: (1) register the new `/api/movies/discover` route, (2) the existing `/api/people/search` already returns `profile_path` from TMDB — no change needed there, it was always in the raw TMDB response. We only need to add the discover route.

- [ ] **Step 1: Add import of `discoverMovies` and `DiscoverParams`**

In `watchwise-backend/src/data/movies/routes.ts`, update the import from `../../adapters/tmdb/service`:

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
} from "../../adapters/tmdb/service";
```

- [ ] **Step 2: Register the route inside `movieRoutes()`**

Add this block **before** the `app.get("/api/movies/:id", ...)` catch-all route (specific routes must come before parameterised ones in Fastify):

```typescript
app.get("/api/movies/discover", async (req, reply) => {
  const q = req.query as Record<string, string | undefined>;

  const page = Number.isFinite(Number(q.page)) ? Math.max(1, Number(q.page)) : 1;
  const rating_min = q.rating_min !== undefined ? Number(q.rating_min) : undefined;
  const rating_max = q.rating_max !== undefined ? Number(q.rating_max) : undefined;
  const runtime_min = q.runtime_min !== undefined ? Number(q.runtime_min) : undefined;
  const runtime_max = q.runtime_max !== undefined ? Number(q.runtime_max) : undefined;
  const year_from = q.year_from !== undefined ? Number(q.year_from) : undefined;
  const year_to = q.year_to !== undefined ? Number(q.year_to) : undefined;
  const with_cast = q.with_cast !== undefined ? Number(q.with_cast) : undefined;
  const with_crew = q.with_crew !== undefined ? Number(q.with_crew) : undefined;

  return discoverMovies({
    query: q.query || undefined,
    genre_ids: q.genre_ids || undefined,
    year_from: Number.isFinite(year_from) ? year_from : undefined,
    year_to: Number.isFinite(year_to) ? year_to : undefined,
    rating_min: Number.isFinite(rating_min) ? rating_min : undefined,
    rating_max: Number.isFinite(rating_max) ? rating_max : undefined,
    runtime_min: Number.isFinite(runtime_min) ? runtime_min : undefined,
    runtime_max: Number.isFinite(runtime_max) ? runtime_max : undefined,
    with_cast: Number.isFinite(with_cast) ? with_cast : undefined,
    with_crew: Number.isFinite(with_crew) ? with_crew : undefined,
    sort_by: q.sort_by || "popularity.desc",
    page,
  });
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd watchwise-backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test the endpoint manually**

Start the backend (`npm run dev` in `watchwise-backend/`) then:

```bash
curl "http://localhost:3001/api/movies/discover?genre_ids=28&sort_by=vote_average.desc&rating_min=7"
```

Expected: JSON array of action movies with rating ≥ 7.

```bash
curl "http://localhost:3001/api/movies/discover?query=inception"
```

Expected: JSON array containing Inception.

- [ ] **Step 5: Commit**

```bash
git add watchwise-backend/src/data/movies/routes.ts
git commit -m "feat(backend): register GET /api/movies/discover route"
```

---

## Task 4 — Frontend API client update

**Files:**
- Modify: `watchwise-frontend/lib/api.ts`

Add the `DiscoverParams`, `DiscoverResult` types and the `discoverMovies()` fetch function. Also update `PersonSearchResult` to include `profile_path` and `known_for_department` (already returned by the backend but not typed on the frontend).

- [ ] **Step 1: Find the `PersonSearchResult` type and update it**

In `watchwise-frontend/lib/api.ts`, find the `PersonSearchResult` type (currently used by `searchPeople`) and update it:

```typescript
export type PersonSearchResult = {
  id: number
  name: string
  known_for_department?: string
  profile_path?: string
}
```

- [ ] **Step 2: Add discover types and function**

Append to `watchwise-frontend/lib/api.ts`:

```typescript
export type DiscoverParams = {
  query?: string
  genre_ids?: string        // comma-separated e.g. "28,12"
  year_from?: number
  year_to?: number
  rating_min?: number
  rating_max?: number
  runtime_min?: number
  runtime_max?: number
  with_cast?: number
  with_crew?: number
  sort_by?: string
  page?: number
}

export type DiscoverResult = {
  results: MovieListItem[]
  page: number
  total_pages: number
}

export async function discoverMovies(params: DiscoverParams): Promise<DiscoverResult> {
  const q = new URLSearchParams()
  if (params.query)       q.set("query",       params.query)
  if (params.genre_ids)   q.set("genre_ids",   params.genre_ids)
  if (params.year_from)   q.set("year_from",   String(params.year_from))
  if (params.year_to)     q.set("year_to",     String(params.year_to))
  if (params.rating_min !== undefined) q.set("rating_min", String(params.rating_min))
  if (params.rating_max !== undefined) q.set("rating_max", String(params.rating_max))
  if (params.runtime_min !== undefined) q.set("runtime_min", String(params.runtime_min))
  if (params.runtime_max !== undefined) q.set("runtime_max", String(params.runtime_max))
  if (params.with_cast)   q.set("with_cast",   String(params.with_cast))
  if (params.with_crew)   q.set("with_crew",   String(params.with_crew))
  if (params.sort_by)     q.set("sort_by",     params.sort_by)
  if (params.page)        q.set("page",        String(params.page))

  const qs = q.toString()
  return requestJson<DiscoverResult>(`/movies/discover${qs ? `?${qs}` : ""}`)
}
```

- [ ] **Step 3: Verify the frontend builds**

```bash
cd watchwise-frontend && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to these types.

- [ ] **Step 4: Commit**

```bash
git add watchwise-frontend/lib/api.ts
git commit -m "feat(frontend): add discoverMovies() API client + PersonSearchResult avatar fields"
```

---

## Task 5 — `SearchFilters` component

**Files:**
- Create: `watchwise-frontend/components/search-filters.tsx`

A self-contained filter panel that receives current filter values as props and calls `onChange` callbacks. Used both in the desktop sidebar and inside the mobile Drawer — no layout logic, pure form UI.

- [ ] **Step 1: Create the component**

```typescript
// watchwise-frontend/components/search-filters.tsx
"use client"

import { useEffect, useState } from "react"
import { X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { searchPeople, type MovieGenre, type PersonSearchResult } from "@/lib/api"
import { cn } from "@/lib/utils"

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w45"

export type FilterValues = {
  query: string
  genreIds: string[]
  yearFrom: string
  yearTo: string
  ratingMin: string
  ratingMax: string
  runtimeMin: string
  runtimeMax: string
  sortBy: string
  actorId: number | null
  actorName: string
  directorId: number | null
  directorName: string
}

export const DEFAULT_FILTERS: FilterValues = {
  query: "",
  genreIds: [],
  yearFrom: "",
  yearTo: "",
  ratingMin: "",
  ratingMax: "",
  runtimeMin: "",
  runtimeMax: "",
  sortBy: "popularity.desc",
  actorId: null,
  actorName: "",
  directorId: null,
  directorName: "",
}

type Props = {
  genres: MovieGenre[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  onReset: () => void
  resultCount?: number
}

export function SearchFilters({ genres, values, onChange, onReset, resultCount }: Props) {
  const [actorInput, setActorInput] = useState(values.actorName)
  const [actorSuggestions, setActorSuggestions] = useState<PersonSearchResult[]>([])
  const [directorInput, setDirectorInput] = useState(values.directorName)
  const [directorSuggestions, setDirectorSuggestions] = useState<PersonSearchResult[]>([])

  // Sync input with external reset
  useEffect(() => { setActorInput(values.actorName) }, [values.actorName])
  useEffect(() => { setDirectorInput(values.directorName) }, [values.directorName])

  useEffect(() => {
    if (!actorInput.trim() || values.actorId) { setActorSuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await searchPeople(actorInput.trim(), 6)
      setActorSuggestions(res)
    }, 300)
    return () => clearTimeout(t)
  }, [actorInput, values.actorId])

  useEffect(() => {
    if (!directorInput.trim() || values.directorId) { setDirectorSuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await searchPeople(directorInput.trim(), 6)
      setDirectorSuggestions(res)
    }, 300)
    return () => clearTimeout(t)
  }, [directorInput, values.directorId])

  const set = (patch: Partial<FilterValues>) => onChange({ ...values, ...patch })

  return (
    <div className="space-y-5">
      {/* Sort */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Sort by</label>
        <Select value={values.sortBy} onValueChange={(v) => set({ sortBy: v })}>
          <SelectTrigger className="bg-black/20 border-white/10 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            <SelectItem value="popularity.desc">Popularity</SelectItem>
            <SelectItem value="vote_average.desc">Rating</SelectItem>
            <SelectItem value="primary_release_date.desc">Newest first</SelectItem>
            <SelectItem value="primary_release_date.asc">Oldest first</SelectItem>
            <SelectItem value="revenue.desc">Box office</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Genres */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Genres</label>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3 max-h-44 overflow-y-auto custom-scrollbar">
          <label className="flex items-center gap-2 text-sm p-1 hover:bg-white/5 rounded cursor-pointer">
            <Checkbox
              checked={values.genreIds.length === 0}
              onCheckedChange={(c) => { if (c) set({ genreIds: [] }) }}
              className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <span>All genres</span>
          </label>
          {genres.map((genre) => {
            const id = String(genre.id)
            return (
              <label key={id} className="flex items-center gap-2 text-sm p-1 hover:bg-white/5 rounded cursor-pointer">
                <Checkbox
                  checked={values.genreIds.includes(id)}
                  onCheckedChange={(c) =>
                    set({ genreIds: c ? [...values.genreIds, id] : values.genreIds.filter((x) => x !== id) })
                  }
                  className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <span className="truncate">{genre.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Year</label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={1900} placeholder="From" value={values.yearFrom}
            onChange={(e) => set({ yearFrom: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
          <Input type="number" min={1900} placeholder="To" value={values.yearTo}
            onChange={(e) => set({ yearTo: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Rating (0–10)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} max={10} step={0.1} placeholder="Min" value={values.ratingMin}
            onChange={(e) => set({ ratingMin: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
          <Input type="number" min={0} max={10} step={0.1} placeholder="Max" value={values.ratingMax}
            onChange={(e) => set({ ratingMax: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
        </div>
      </div>

      {/* Runtime */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Runtime (min)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} placeholder="Min" value={values.runtimeMin}
            onChange={(e) => set({ runtimeMin: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
          <Input type="number" min={0} placeholder="Max" value={values.runtimeMax}
            onChange={(e) => set({ runtimeMax: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
        </div>
      </div>

      {/* Actor */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Actor</label>
        <div className="relative">
          <Input
            value={actorInput}
            onChange={(e) => { setActorInput(e.target.value); if (!e.target.value) set({ actorId: null, actorName: "" }) }}
            placeholder="Search actor..."
            className="bg-black/20 border-white/10 h-9 text-sm"
          />
          {values.actorId && (
            <button
              onClick={() => { set({ actorId: null, actorName: "" }); setActorInput("") }}
              className="absolute right-2 top-2.5 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {actorSuggestions.length > 0 && !values.actorId && (
            <div className="absolute top-full left-0 w-full z-50 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {actorSuggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { set({ actorId: p.id, actorName: p.name }); setActorInput(p.name); setActorSuggestions([]) }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                >
                  <img
                    src={p.profile_path ? `${TMDB_PROFILE_BASE}${p.profile_path}` : "/placeholder.svg"}
                    alt={p.name}
                    className="h-8 w-8 rounded-full object-cover bg-zinc-800 flex-shrink-0"
                  />
                  <div>
                    <p className="text-zinc-100 leading-tight">{p.name}</p>
                    {p.known_for_department && (
                      <p className="text-[10px] text-zinc-500">{p.known_for_department}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Director */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Director</label>
        <div className="relative">
          <Input
            value={directorInput}
            onChange={(e) => { setDirectorInput(e.target.value); if (!e.target.value) set({ directorId: null, directorName: "" }) }}
            placeholder="Search director..."
            className="bg-black/20 border-white/10 h-9 text-sm"
          />
          {values.directorId && (
            <button
              onClick={() => { set({ directorId: null, directorName: "" }); setDirectorInput("") }}
              className="absolute right-2 top-2.5 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {directorSuggestions.length > 0 && !values.directorId && (
            <div className="absolute top-full left-0 w-full z-50 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {directorSuggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { set({ directorId: p.id, directorName: p.name }); setDirectorInput(p.name); setDirectorSuggestions([]) }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                >
                  <img
                    src={p.profile_path ? `${TMDB_PROFILE_BASE}${p.profile_path}` : "/placeholder.svg"}
                    alt={p.name}
                    className="h-8 w-8 rounded-full object-cover bg-zinc-800 flex-shrink-0"
                  />
                  <div>
                    <p className="text-zinc-100 leading-tight">{p.name}</p>
                    {p.known_for_department && (
                      <p className="text-[10px] text-zinc-500">{p.known_for_department}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        className="w-full text-zinc-400 hover:text-white hover:bg-white/5 text-sm"
        onClick={onReset}
      >
        Reset all filters
      </Button>

      {resultCount !== undefined && (
        <p className="text-center text-xs text-zinc-600 font-mono">{resultCount} results</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the frontend builds**

```bash
cd watchwise-frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add watchwise-frontend/components/search-filters.tsx
git commit -m "feat(frontend): add SearchFilters component with avatar person suggestions"
```

---

## Task 6 — `SearchEmptyState` component

**Files:**
- Create: `watchwise-frontend/components/search-empty-state.tsx`

Shown when no search is active (no query, no filters). Fetches trending, upcoming, and top-rated from existing backend endpoints and renders three horizontal carousels.

- [ ] **Step 1: Create the component**

```typescript
// watchwise-frontend/components/search-empty-state.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingUp, Calendar, Star } from "lucide-react"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { requestJson, type MovieListItem } from "@/lib/api"

type Section = { title: string; icon: React.ReactNode; movies: MovieListItem[] }

export function SearchEmptyState() {
  const [sections, setSections] = useState<Section[]>([])

  useEffect(() => {
    async function load() {
      const [trending, upcoming, topRated] = await Promise.allSettled([
        requestJson<MovieListItem[]>("/movies/trending?limit=12"),
        requestJson<MovieListItem[]>("/movies/upcoming?limit=12"),
        requestJson<MovieListItem[]>("/movies/top-rated?limit=12"),
      ])

      const built: Section[] = []
      if (trending.status === "fulfilled" && trending.value.length)
        built.push({ title: "Trending this week", icon: <TrendingUp className="h-5 w-5 text-emerald-400" />, movies: trending.value })
      if (upcoming.status === "fulfilled" && upcoming.value.length)
        built.push({ title: "Coming soon", icon: <Calendar className="h-5 w-5 text-blue-400" />, movies: upcoming.value })
      if (topRated.status === "fulfilled" && topRated.value.length)
        built.push({ title: "All-time top rated", icon: <Star className="h-5 w-5 text-amber-400" />, movies: topRated.value })

      setSections(built)
    }
    load()
  }, [])

  if (!sections.length) return null

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {sections.map((section) => (
        <section key={section.title}>
          <div className="flex items-center gap-2 mb-5">
            {section.icon}
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="-ml-3">
              {section.movies.map((movie) => (
                <CarouselItem key={movie.movieId} className="pl-3 basis-[160px] md:basis-[180px]">
                  <MovieCard
                    id={movie.movieId}
                    title={movie.title}
                    poster={movie.posterPath}
                    year={movie.year}
                    rating={Number.isFinite(movie.voteAverage) ? movie.voteAverage : undefined}
                  >
                    <MovieQuickActions movieId={movie.movieId} />
                  </MovieCard>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 border-white/10 bg-black/50" />
            <CarouselNext className="hidden md:flex -right-4 border-white/10 bg-black/50" />
          </Carousel>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd watchwise-frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add watchwise-frontend/components/search-empty-state.tsx
git commit -m "feat(frontend): add SearchEmptyState with trending/upcoming/top-rated carousels"
```

---

## Task 7 — Rewrite `app/search/page.tsx`

**Files:**
- Rewrite: `watchwise-frontend/app/search/page.tsx`

The orchestrator. Reads/writes URL params for filter state, debounces changes to trigger `discoverMovies()`, manages load-more pagination, renders the `SearchFilters` in a desktop sidebar and inside a `Drawer` (vaul) for mobile.

**Key logic:**
- URL params are the source of truth: `q`, `genres`, `year_from`, `year_to`, `rating_min`, `rating_max`, `runtime_min`, `runtime_max`, `cast_id`, `cast_name`, `crew_id`, `crew_name`, `sort_by`, `page`
- A `useEffect` watching all filter values fires a 500ms debounced `discoverMovies()` call
- "Load more" appends page N+1 results to existing results
- When all filter values match `DEFAULT_FILTERS` (and `query` is empty), show `SearchEmptyState`
- When `query` is non-empty AND any structured filter is active, show a yellow hint banner

- [ ] **Step 1: Replace the entire file content**

```typescript
// watchwise-frontend/app/search/page.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { SearchFilters, DEFAULT_FILTERS, type FilterValues } from "@/components/search-filters"
import { SearchEmptyState } from "@/components/search-empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Loader2, Search, SlidersHorizontal, AlertTriangle } from "lucide-react"
import { discoverMovies, getMovieGenres, type MovieGenre, type MovieListItem } from "@/lib/api"

// ─── URL ↔ FilterValues helpers ────────────────────────────────────────────

function filtersFromURL(params: URLSearchParams): FilterValues {
  return {
    query:       params.get("q")          ?? "",
    genreIds:    params.get("genres")     ? params.get("genres")!.split(",") : [],
    yearFrom:    params.get("year_from")  ?? "",
    yearTo:      params.get("year_to")    ?? "",
    ratingMin:   params.get("rating_min") ?? "",
    ratingMax:   params.get("rating_max") ?? "",
    runtimeMin:  params.get("runtime_min") ?? "",
    runtimeMax:  params.get("runtime_max") ?? "",
    sortBy:      params.get("sort_by")    ?? "popularity.desc",
    actorId:     params.get("cast_id")    ? Number(params.get("cast_id")) : null,
    actorName:   params.get("cast_name")  ?? "",
    directorId:  params.get("crew_id")    ? Number(params.get("crew_id")) : null,
    directorName: params.get("crew_name") ?? "",
  }
}

function filtersToURL(f: FilterValues): URLSearchParams {
  const p = new URLSearchParams()
  if (f.query)       p.set("q",           f.query)
  if (f.genreIds.length) p.set("genres",  f.genreIds.join(","))
  if (f.yearFrom)    p.set("year_from",   f.yearFrom)
  if (f.yearTo)      p.set("year_to",     f.yearTo)
  if (f.ratingMin)   p.set("rating_min",  f.ratingMin)
  if (f.ratingMax)   p.set("rating_max",  f.ratingMax)
  if (f.runtimeMin)  p.set("runtime_min", f.runtimeMin)
  if (f.runtimeMax)  p.set("runtime_max", f.runtimeMax)
  if (f.sortBy && f.sortBy !== "popularity.desc") p.set("sort_by", f.sortBy)
  if (f.actorId)     { p.set("cast_id", String(f.actorId)); p.set("cast_name", f.actorName) }
  if (f.directorId)  { p.set("crew_id", String(f.directorId)); p.set("crew_name", f.directorName) }
  return p
}

function isEmptyFilters(f: FilterValues): boolean {
  return (
    !f.query && f.genreIds.length === 0 && !f.yearFrom && !f.yearTo &&
    !f.ratingMin && !f.ratingMax && !f.runtimeMin && !f.runtimeMax &&
    !f.actorId && !f.directorId
  )
}

function hasStructuredFilters(f: FilterValues): boolean {
  return (
    f.genreIds.length > 0 || !!f.yearFrom || !!f.yearTo ||
    !!f.ratingMin || !!f.ratingMax || !!f.runtimeMin || !!f.runtimeMax ||
    !!f.actorId || !!f.directorId
  )
}

// ─── Page component ─────────────────────────────────────────────────────────

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<FilterValues>(() => filtersFromURL(searchParams))
  const [genres, setGenres] = useState<MovieGenre[]>([])
  const [results, setResults] = useState<MovieListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load genres once
  useEffect(() => {
    getMovieGenres().then(setGenres).catch(() => setGenres([]))
  }, [])

  // Sync filters → URL (replace, no new history entry for every keystroke)
  useEffect(() => {
    const qs = filtersToURL(filters).toString()
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false })
  }, [filters, router])

  // Debounced search trigger
  const runSearch = useCallback(
    async (f: FilterValues, p: number, append: boolean) => {
      if (isEmptyFilters(f)) {
        setResults([])
        setTotalPages(1)
        return
      }

      if (append) setLoadingMore(true)
      else { setLoading(true); setError(null) }

      try {
        const data = await discoverMovies({
          query:       f.query || undefined,
          genre_ids:   f.genreIds.length ? f.genreIds.join(",") : undefined,
          year_from:   f.yearFrom   ? Number(f.yearFrom)   : undefined,
          year_to:     f.yearTo     ? Number(f.yearTo)     : undefined,
          rating_min:  f.ratingMin  ? Number(f.ratingMin)  : undefined,
          rating_max:  f.ratingMax  ? Number(f.ratingMax)  : undefined,
          runtime_min: f.runtimeMin ? Number(f.runtimeMin) : undefined,
          runtime_max: f.runtimeMax ? Number(f.runtimeMax) : undefined,
          with_cast:   f.actorId    ?? undefined,
          with_crew:   f.directorId ?? undefined,
          sort_by:     f.sortBy,
          page:        p,
        })

        setResults((prev) => append ? [...prev, ...data.results] : data.results)
        setTotalPages(data.total_pages)
        setPage(p)
      } catch {
        setError("Search failed. Please try again.")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    []
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(filters, 1, false)
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, runSearch])

  const handleFiltersChange = (next: FilterValues) => {
    setFilters(next)
  }

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setResults([])
    setPage(1)
    setTotalPages(1)
  }

  const handleLoadMore = () => {
    runSearch(filters, page + 1, true)
  }

  // Active filter chips for the results header
  const activeChips = useMemo(() => {
    const chips: string[] = []
    if (filters.query) chips.push(`"${filters.query}"`)
    if (filters.genreIds.length) {
      const names = filters.genreIds.map((id) => genres.find((g) => String(g.id) === id)?.name ?? id)
      chips.push(...names)
    }
    if (filters.yearFrom || filters.yearTo) chips.push(`${filters.yearFrom || "…"} – ${filters.yearTo || "…"}`)
    if (filters.ratingMin || filters.ratingMax) chips.push(`★ ${filters.ratingMin || "0"}–${filters.ratingMax || "10"}`)
    if (filters.actorName) chips.push(filters.actorName)
    if (filters.directorName) chips.push(`Dir. ${filters.directorName}`)
    return chips
  }, [filters, genres])

  const showEmptyState = isEmptyFilters(filters) && results.length === 0 && !loading
  const showHybridHint = !!filters.query && hasStructuredFilters(filters)

  const filterPanel = (
    <SearchFilters
      genres={genres}
      values={filters}
      onChange={handleFiltersChange}
      onReset={handleReset}
      resultCount={results.length || undefined}
    />
  )

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-emerald-500/30 pb-28">
      {/* Background ambience */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10">
        <Header />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page heading */}
          <div className="flex flex-col gap-2 mb-8">
            <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300 uppercase tracking-widest text-[10px]">
              Advanced Search
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
              Discover Movies
            </h1>
          </div>

          {/* Search bar (always visible, full-width above the grid) */}
          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              <Input
                className="pl-10 h-12 bg-zinc-900/60 border-white/10 focus-visible:ring-emerald-500/50 text-base rounded-2xl backdrop-blur"
                placeholder="Search by title…"
                value={filters.query}
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              />
              {loading && (
                <Loader2 className="absolute right-3.5 top-3.5 h-5 w-5 animate-spin text-emerald-400" />
              )}
            </div>

            {/* Mobile filter trigger */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden h-12 px-4 rounded-2xl border-white/10 bg-zinc-900/60 text-zinc-300 gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeChips.length > 0 && (
                    <span className="ml-1 h-4 w-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center">
                      {activeChips.length}
                    </span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-zinc-950 border-t border-white/10 max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle className="text-white">Filters</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-8 overflow-y-auto">
                  {filterPanel}
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Hybrid hint */}
          {showHybridHint && (
            <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Text search ignores genre, year, and rating filters — clear the text to use them.
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block space-y-4 sticky top-24 h-fit">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-5">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
                  <h2 className="font-semibold text-sm">Filters</h2>
                </div>
                {filterPanel}
              </div>
            </aside>

            {/* Results */}
            <section className="min-w-0">
              {/* Active chips */}
              {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {activeChips.map((chip) => (
                    <Badge key={chip} variant="secondary" className="bg-white/5 border-white/10 text-zinc-300">
                      {chip}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Empty state (no filters active) */}
              {showEmptyState && <SearchEmptyState />}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">
                  {error}
                </div>
              )}

              {/* Loading skeleton (first load) */}
              {loading && !results.length && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              )}

              {/* Results grid */}
              {results.length > 0 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.map((movie) => (
                      <MovieCard
                        key={movie.movieId}
                        id={movie.movieId}
                        title={movie.title}
                        poster={movie.posterPath}
                        year={movie.year}
                        rating={Number.isFinite(movie.voteAverage) ? movie.voteAverage : undefined}
                      >
                        <MovieQuickActions movieId={movie.movieId} />
                      </MovieCard>
                    ))}
                  </div>

                  {/* Load more */}
                  {page < totalPages && (
                    <div className="mt-10 flex justify-center">
                      <Button
                        variant="outline"
                        className="h-12 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 gap-2"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                        ) : (
                          "Load more"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* No results (filters active but empty) */}
              {!loading && !showEmptyState && results.length === 0 && !error && !isEmptyFilters(filters) && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <Search className="h-8 w-8 mb-4 opacity-50" />
                  <p>No movies found. Try broadening your filters.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <Footer />
      <BottomNav />
    </main>
  )
}
```

- [ ] **Step 2: Verify the frontend builds**

```bash
cd watchwise-frontend && npm run build 2>&1 | tail -30
```

Expected: build completes with no TypeScript errors. There may be linting warnings about `react-hooks/exhaustive-deps` — these are acceptable for the debounce ref.

- [ ] **Step 3: Manual smoke test**

1. Open `http://localhost:3000/search` — trending/upcoming/top-rated carousels should appear
2. Type "inception" in the search bar — results appear after ~500ms debounce, Inception is in the list
3. Select "Action" genre (with no text) — action movies appear via discover
4. Add `rating_min=8` — results narrow
5. Select an actor via the autocomplete — avatar and department visible in dropdown
6. Click "Load more" — next page appended
7. Resize to mobile — "Filters" button appears, opens bottom sheet
8. Copy URL, open in new tab — same search state restored

- [ ] **Step 4: Commit**

```bash
git add watchwise-frontend/app/search/page.tsx
git commit -m "feat(frontend): rewrite search page — instant debounce, URL state, load more, mobile drawer"
```

---

## Self-Review

**Spec coverage:**
- ✅ New `GET /api/movies/discover` backend endpoint (Tasks 2–3)
- ✅ Option A: text → `/search/movie`, filters → `/discover/movie` (Task 2)
- ✅ Instant search with 500ms debounce (Task 7)
- ✅ Empty state with trending/upcoming/top-rated (Task 6)
- ✅ Sort dropdown (Task 5 + Task 7)
- ✅ "Load more" pagination (Task 7)
- ✅ Person avatars + department in suggestions (Task 5)
- ✅ URL state with `useSearchParams` (Task 7)
- ✅ Mobile bottom sheet via vaul Drawer (Task 7)
- ✅ Hybrid hint when text + structured filters (Task 7)
- ✅ `total_pages` in TMDB types (Task 1)

**Placeholder scan:** No TBD/TODO/placeholder text found.

**Type consistency:**
- `FilterValues` defined in `search-filters.tsx` and imported in `page.tsx` ✅
- `DEFAULT_FILTERS` exported from `search-filters.tsx`, imported in `page.tsx` ✅
- `DiscoverResult.results` is `MovieListItem[]`, matches `MovieCard` props ✅
- `PersonSearchResult.profile_path` used in `SearchFilters` dropdown ✅
- `discoverMovies()` param names match `DiscoverParams` fields ✅
