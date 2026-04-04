"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { Loader2, Search, SlidersHorizontal, AlertTriangle, Hash, X, Tag } from "lucide-react"
import {
  discoverMovies,
  getMovieGenres,
  searchKeywords,
  type MovieGenre,
  type MovieListItem,
  type TMDBKeyword,
} from "@/lib/api"

// ─── URL ↔ FilterValues helpers ────────────────────────────────────────────

function filtersFromURL(params: URLSearchParams): FilterValues {
  const kwIds = params.get("kw_ids")
  const kwNames = params.get("kw_names")
  return {
    query:        params.get("q")           ?? "",
    genreIds:     params.get("genres")      ? params.get("genres")!.split(",") : [],
    yearFrom:     params.get("year_from")   ?? "",
    yearTo:       params.get("year_to")     ?? "",
    ratingMin:    params.get("rating_min")  ?? "",
    ratingMax:    params.get("rating_max")  ?? "",
    runtimeMin:   params.get("runtime_min") ?? "",
    runtimeMax:   params.get("runtime_max") ?? "",
    sortBy:       params.get("sort_by")     ?? "popularity.desc",
    actorId:      params.get("cast_id")     ? Number(params.get("cast_id")) : null,
    actorName:    params.get("cast_name")   ?? "",
    directorId:   params.get("crew_id")     ? Number(params.get("crew_id")) : null,
    directorName: params.get("crew_name")   ?? "",
    keywordIds:   kwIds ? kwIds.split(",").map(Number) : [],
    keywordNames: kwNames ? kwNames.split(",") : [],
  }
}

function filtersToURL(f: FilterValues): URLSearchParams {
  const p = new URLSearchParams()
  if (f.query)           p.set("q",           f.query)
  if (f.genreIds.length) p.set("genres",      f.genreIds.join(","))
  if (f.yearFrom)        p.set("year_from",   f.yearFrom)
  if (f.yearTo)          p.set("year_to",     f.yearTo)
  if (f.ratingMin)       p.set("rating_min",  f.ratingMin)
  if (f.ratingMax)       p.set("rating_max",  f.ratingMax)
  if (f.runtimeMin)      p.set("runtime_min", f.runtimeMin)
  if (f.runtimeMax)      p.set("runtime_max", f.runtimeMax)
  if (f.sortBy && f.sortBy !== "popularity.desc") p.set("sort_by", f.sortBy)
  if (f.actorId)    { p.set("cast_id",   String(f.actorId));    p.set("cast_name",  f.actorName) }
  if (f.directorId) { p.set("crew_id",   String(f.directorId)); p.set("crew_name", f.directorName) }
  if (f.keywordIds.length) {
    p.set("kw_ids",   f.keywordIds.join(","))
    p.set("kw_names", f.keywordNames.join(","))
  }
  return p
}

function isEmptyFilters(f: FilterValues): boolean {
  return (
    !f.query && f.genreIds.length === 0 && !f.yearFrom && !f.yearTo &&
    !f.ratingMin && !f.ratingMax && !f.runtimeMin && !f.runtimeMax &&
    !f.actorId && !f.directorId && f.keywordIds.length === 0
  )
}

function hasStructuredFilters(f: FilterValues): boolean {
  return (
    f.genreIds.length > 0 || !!f.yearFrom || !!f.yearTo ||
    !!f.ratingMin || !!f.ratingMax || !!f.runtimeMin || !!f.runtimeMax ||
    !!f.actorId || !!f.directorId || f.keywordIds.length > 0
  )
}

// ─── Page component ─────────────────────────────────────────────────────────

function SearchPageInner() {
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

  // ── Keyword search state ──
  const [inputValue, setInputValue] = useState(filters.query)
  const [kwSuggestions, setKwSuggestions] = useState<TMDBKeyword[]>([])
  const [kwLoading, setKwLoading] = useState(false)
  const kwDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isKeywordMode = inputValue.startsWith("@")
  const kwQuery = isKeywordMode ? inputValue.slice(1).trim() : ""

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load genres once
  useEffect(() => {
    getMovieGenres().then(setGenres).catch(() => setGenres([]))
  }, [])

  // Sync filters → URL
  useEffect(() => {
    const qs = filtersToURL(filters).toString()
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false })
  }, [filters, router])

  // Keyword suggestions debounce
  useEffect(() => {
    if (!isKeywordMode || !kwQuery) {
      setKwSuggestions([])
      return
    }
    if (kwDebounceRef.current) clearTimeout(kwDebounceRef.current)
    kwDebounceRef.current = setTimeout(async () => {
      setKwLoading(true)
      try {
        const res = await searchKeywords(kwQuery, 8)
        // Filter out already-selected keywords
        setKwSuggestions(res.filter((k) => !filters.keywordIds.includes(k.id)))
      } finally {
        setKwLoading(false)
      }
    }, 300)
    return () => { if (kwDebounceRef.current) clearTimeout(kwDebounceRef.current) }
  }, [kwQuery, isKeywordMode, filters.keywordIds])

  // When NOT in keyword mode, sync inputValue → filters.query
  useEffect(() => {
    if (!isKeywordMode) {
      setFilters((prev) => ({ ...prev, query: inputValue }))
    }
  }, [inputValue, isKeywordMode])

  const selectKeyword = (kw: TMDBKeyword) => {
    setFilters((prev) => ({
      ...prev,
      keywordIds: [...prev.keywordIds, kw.id],
      keywordNames: [...prev.keywordNames, kw.name],
    }))
    setInputValue("")
    setKwSuggestions([])
    inputRef.current?.focus()
  }

  const removeKeyword = (id: number) => {
    setFilters((prev) => {
      const idx = prev.keywordIds.indexOf(id)
      return {
        ...prev,
        keywordIds: prev.keywordIds.filter((_, i) => i !== idx),
        keywordNames: prev.keywordNames.filter((_, i) => i !== idx),
      }
    })
  }

  // Core search function
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
          query:        f.query        || undefined,
          genre_ids:    f.genreIds.length ? f.genreIds.join(",") : undefined,
          year_from:    f.yearFrom     ? Number(f.yearFrom)    : undefined,
          year_to:      f.yearTo       ? Number(f.yearTo)      : undefined,
          rating_min:   f.ratingMin    ? Number(f.ratingMin)   : undefined,
          rating_max:   f.ratingMax    ? Number(f.ratingMax)   : undefined,
          runtime_min:  f.runtimeMin   ? Number(f.runtimeMin)  : undefined,
          runtime_max:  f.runtimeMax   ? Number(f.runtimeMax)  : undefined,
          with_cast:    f.actorId      ?? undefined,
          with_crew:    f.directorId   ?? undefined,
          with_keywords: f.keywordIds.length ? f.keywordIds.join(",") : undefined,
          sort_by:      f.sortBy,
          page:         p,
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

  // Debounced auto-search on filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(filters, 1, false)
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, runSearch])

  const handleFiltersChange = (next: FilterValues) => setFilters(next)

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
    setInputValue("")
    setKwSuggestions([])
    setResults([])
    setPage(1)
    setTotalPages(1)
  }

  const handleLoadMore = () => runSearch(filters, page + 1, true)

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: string[] = []
    if (filters.query) chips.push(`"${filters.query}"`)
    if (filters.genreIds.length) {
      chips.push(...filters.genreIds.map((id) => genres.find((g) => String(g.id) === id)?.name ?? id))
    }
    if (filters.yearFrom || filters.yearTo) chips.push(`${filters.yearFrom || "…"} – ${filters.yearTo || "…"}`)
    if (filters.ratingMin || filters.ratingMax) chips.push(`★ ${filters.ratingMin || "0"}–${filters.ratingMax || "10"}`)
    if (filters.actorName) chips.push(filters.actorName)
    if (filters.directorName) chips.push(`Dir. ${filters.directorName}`)
    return chips
  }, [filters, genres])

  const showEmptyState = isEmptyFilters(filters) && results.length === 0 && !loading
  // Hybrid hint only for text query + structured filters (NOT keywords — keywords work fine with discover)
  const showHybridHint = !!filters.query && hasStructuredFilters({ ...filters, keywordIds: [], keywordNames: [] })

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
            {/* Search mode hint */}
            <p className="text-xs text-zinc-500 mt-1">
              Search by title, or type{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300 font-mono text-[11px]">@</kbd>
              {" "}to search by plot keyword{" "}
              <span className="text-zinc-600">— e.g. <span className="text-zinc-400 italic">@time travel</span>, <span className="text-zinc-400 italic">@heist</span></span>
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-start gap-3 mb-4">
            <div className="relative flex-1">
              {/* Icon changes based on mode */}
              {isKeywordMode ? (
                <Hash className="absolute left-3.5 top-3.5 h-4 w-4 text-violet-400" />
              ) : (
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
              )}

              <Input
                ref={inputRef}
                className={`pl-10 h-12 text-base rounded-2xl backdrop-blur transition-colors ${
                  isKeywordMode
                    ? "bg-violet-950/40 border-violet-500/40 focus-visible:ring-violet-500/50"
                    : "bg-zinc-900/60 border-white/10 focus-visible:ring-emerald-500/50"
                }`}
                placeholder={isKeywordMode ? "Type a keyword… (e.g. time travel, heist, dystopia)" : "Search by title… or type @ for keywords"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && isKeywordMode) {
                    setInputValue("")
                    setKwSuggestions([])
                  }
                  // Enter selects the first suggestion
                  if (e.key === "Enter" && kwSuggestions.length > 0 && isKeywordMode) {
                    e.preventDefault()
                    selectKeyword(kwSuggestions[0])
                  }
                }}
              />

              {/* Keyword mode label */}
              {isKeywordMode && (
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  {kwLoading && <Loader2 className="h-4 w-4 animate-spin text-violet-400" />}
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-1 rounded-lg border border-violet-500/20">
                    Keyword
                  </span>
                </div>
              )}

              {/* Title search spinner */}
              {!isKeywordMode && loading && (
                <Loader2 className="absolute right-3.5 top-3.5 h-5 w-5 animate-spin text-emerald-400" />
              )}

              {/* Keyword suggestions dropdown */}
              {isKeywordMode && kwSuggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full z-50 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
                    <Tag className="h-3 w-3 text-violet-400" />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">TMDB Keywords</span>
                  </div>
                  {kwSuggestions.map((kw) => (
                    <button
                      key={kw.id}
                      onClick={() => selectKeyword(kw)}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm group"
                    >
                      <Hash className="h-3.5 w-3.5 text-violet-400/60 group-hover:text-violet-400 flex-shrink-0" />
                      <span className="text-zinc-200 group-hover:text-white">{kw.name}</span>
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t border-white/5">
                    <span className="text-[10px] text-zinc-600">Press Enter to select the first result · Esc to cancel</span>
                  </div>
                </div>
              )}

              {/* No keyword results */}
              {isKeywordMode && kwQuery && !kwLoading && kwSuggestions.length === 0 && (
                <div className="absolute top-full left-0 w-full z-50 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl px-4 py-3 text-sm text-zinc-500">
                  No keywords found for &ldquo;{kwQuery}&rdquo;
                </div>
              )}
            </div>

            {/* Mobile filter trigger */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden h-12 px-4 rounded-2xl border-white/10 bg-zinc-900/60 text-zinc-300 gap-2 flex-shrink-0"
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

          {/* Selected keyword chips */}
          {filters.keywordIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium flex items-center gap-1">
                <Tag className="h-3 w-3" /> Keywords
              </span>
              {filters.keywordIds.map((id, i) => (
                <button
                  key={id}
                  onClick={() => removeKeyword(id)}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs hover:bg-violet-500/20 hover:border-violet-500/40 transition-colors"
                >
                  <Hash className="h-3 w-3" />
                  {filters.keywordNames[i] ?? id}
                  <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {/* Hybrid hint — only when text query + non-keyword structured filters */}
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

              {/* Empty state */}
              {showEmptyState && <SearchEmptyState />}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">
                  {error}
                </div>
              )}

              {/* Loading skeleton */}
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

              {/* No results */}
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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  )
}
