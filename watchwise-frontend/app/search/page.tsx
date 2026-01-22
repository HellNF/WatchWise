"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MovieCard } from "@/components/movie-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getMovieGenres,
  getMoviesByGenre,
  getMoviesByPerson,
  getMovieDetails,
  searchMovies,
  searchPeople,
  type MovieGenre,
  type MovieListItem,
  type PersonSearchResult
} from "@/lib/api"

const POSTER_BASE = "https://image.tmdb.org/t/p/w500"

type PersonOption = {
  id: number
  name: string
}

type SearchMovieCard = {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
  duration?: number
  genres?: string[]
  director?: string
}

function toPosterUrl(posterPath?: string) {
  if (!posterPath) return "/placeholder.svg"
  if (posterPath.startsWith("http")) return posterPath
  return `${POSTER_BASE}${posterPath}`
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await mapper(items[i])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

function normalizePeople(results: PersonSearchResult[]) {
  return results.map((person) => ({
    id: person.id,
    name: person.name
  }))
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [genres, setGenres] = useState<MovieGenre[]>([])
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [selectedActor, setSelectedActor] = useState<PersonOption | null>(null)
  const [selectedDirector, setSelectedDirector] = useState<PersonOption | null>(null)
  const [actorInput, setActorInput] = useState("")
  const [directorInput, setDirectorInput] = useState("")
  const [actorSuggestions, setActorSuggestions] = useState<PersonOption[]>([])
  const [directorSuggestions, setDirectorSuggestions] = useState<PersonOption[]>([])
  const [minDuration, setMinDuration] = useState<string>("")
  const [maxDuration, setMaxDuration] = useState<string>("")
  const [minRating, setMinRating] = useState<string>("")
  const [maxRating, setMaxRating] = useState<string>("")
  const [minYear, setMinYear] = useState<string>("")
  const [maxYear, setMaxYear] = useState<string>("")
  const [keywords, setKeywords] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchMovieCard[]>([])

  const selectActor = (person: PersonOption) => {
    setSelectedActor(person)
    setActorInput("")
    setActorSuggestions([])
  }

  const selectDirector = (person: PersonOption) => {
    setSelectedDirector(person)
    setDirectorInput("")
    setDirectorSuggestions([])
  }

  useEffect(() => {
    let active = true

    const loadGenres = async () => {
      try {
        const list = await getMovieGenres()
        if (active) setGenres(list)
      } catch {
        if (active) setGenres([])
      }
    }

    loadGenres()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!actorInput.trim()) {
      setActorSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await searchPeople(actorInput.trim(), 6)
      setActorSuggestions(normalizePeople(results))
    }, 300)

    return () => clearTimeout(timer)
  }, [actorInput])

  useEffect(() => {
    if (!directorInput.trim()) {
      setDirectorSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const results = await searchPeople(directorInput.trim(), 6)
      setDirectorSuggestions(normalizePeople(results))
    }, 300)

    return () => clearTimeout(timer)
  }, [directorInput])

  const selectedGenres = useMemo(
    () =>
      genres.filter((genre) => selectedGenreIds.includes(String(genre.id))),
    [genres, selectedGenreIds]
  )

  const keywordList = useMemo(
    () =>
      keywords
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    [keywords]
  )

  const handleSearch = async () => {
    setLoading(true)
    setError(null)

    try {
      const trimmedQuery = query.trim()
      const keywordQuery = keywordList.join(" ")
      const limit = 20

      let base: MovieListItem[] = []

      if (trimmedQuery) {
        base = await searchMovies(trimmedQuery, limit)
      } else if (keywordQuery) {
        base = await searchMovies(keywordQuery, limit)
      } else if (selectedActor) {
        base = await getMoviesByPerson("actor", String(selectedActor.id), { limit })
      } else if (selectedDirector) {
        base = await getMoviesByPerson("director", String(selectedDirector.id), { limit })
      } else if (selectedGenreIds.length) {
        const genreLists = await Promise.all(
          selectedGenreIds.map((genreId) => getMoviesByGenre(genreId, { limit }))
        )
        const combined = genreLists.flat()
        const seen = new Set<string>()
        base = combined.filter((item) => {
          if (seen.has(item.movieId)) return false
          seen.add(item.movieId)
          return true
        })
      }

      if (!base.length) {
        setResults([])
        return
      }

      const detailsList = await mapWithConcurrency(base, 6, (item) =>
        getMovieDetails(item.movieId)
      )

      const min = minDuration ? Number(minDuration) : null
      const max = maxDuration ? Number(maxDuration) : null
      const minRate = minRating ? Number(minRating) : null
      const maxRate = maxRating ? Number(maxRating) : null
      const minY = minYear ? Number(minYear) : null
      const maxY = maxYear ? Number(maxYear) : null

      const filtered = base
        .map((item, index) => ({ item, details: detailsList[index] }))
        .filter(({ item, details }) => {
          if (trimmedQuery && !item.title.toLowerCase().includes(trimmedQuery.toLowerCase())) {
            if (!details?.title?.toLowerCase().includes(trimmedQuery.toLowerCase())) {
              return false
            }
          }

          if (selectedGenres.length) {
            if (!details?.genres?.length) return false
            const matches = details.genres.some((genre) =>
              selectedGenres.some(
                (selected) => selected.name.toLowerCase() === genre.toLowerCase()
              )
            )
            if (!matches) return false
          }

          if (selectedActor) {
            const actorMatch = details?.actorsDetailed?.some(
              (actor) => actor.id === selectedActor.id
            )
            if (!actorMatch) return false
          }

          if (selectedDirector) {
            if (details?.directorId !== selectedDirector.id) return false
          }

          if (min !== null || max !== null) {
            const duration = details?.duration
            if (!duration) return false
            if (min !== null && duration < min) return false
            if (max !== null && duration > max) return false
          }

          if (minRate !== null || maxRate !== null) {
            const rating = details?.rating ?? item.voteAverage
            if (rating === undefined || rating === null) return false
            if (minRate !== null && rating < minRate) return false
            if (maxRate !== null && rating > maxRate) return false
          }

          if (minY !== null || maxY !== null) {
            const year = details?.year
            if (!year) return false
            if (minY !== null && year < minY) return false
            if (maxY !== null && year > maxY) return false
          }

          if (keywordList.length) {
            const haystack = [
              details?.title,
              details?.overview,
              details?.director,
              ...(details?.genres ?? []),
              ...(details?.actorsDetailed?.map((actor) => actor.name) ?? []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()

            const allMatch = keywordList.every((keyword) => haystack.includes(keyword))
            if (!allMatch) return false
          }

          return true
        })
        .map(({ item, details }) => ({
          id: item.movieId,
          title: details?.title ?? item.title,
          year: details?.year,
          poster: toPosterUrl(details?.posterPath ?? item.posterPath),
          rating: details?.rating ?? item.voteAverage,
          duration: details?.duration,
          genres: details?.genres,
          director: details?.director
        }))

      setResults(filtered)
    } catch {
      setError("Unable to complete search.")
    } finally {
      setLoading(false)
    }
  }

  const content = useMemo(() => {
    if (loading) return <div className="text-muted-foreground">Searching...</div>
    if (error) return <div className="text-destructive">{error}</div>
    if (!results.length) {
      return <div className="text-muted-foreground">No results found.</div>
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {results.map((movie) => (
          <MovieCard
            key={movie.id}
            id={movie.id}
            title={movie.title}
            poster={movie.poster}
            year={movie.year}
            rating={movie.rating}
            meta={
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {movie.duration ? <span>{movie.duration} min</span> : null}
                {movie.genres?.length ? (
                  <span className="line-clamp-1">{movie.genres.join(", ")}</span>
                ) : null}
                {movie.director ? <span>Director: {movie.director}</span> : null}
              </div>
            }
          />
        ))}
      </div>
    )
  }, [loading, error, results])

  return (
    <main className="min-h-screen pb-28 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_50%)]">
      <Header />
      <div className="container mx-auto px-4 py-10 mx-1 max-w-11/12">
        <div className="flex flex-col gap-3 mb-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300/80">
            Quick Search
          </div>
          <h1 className="text-4xl font-semibold">Search</h1>
          <p className="text-base text-muted-foreground">
            Find movies by title, genre, duration, cast, and director.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-emerald-500/20 bg-card/80 p-6 shadow-lg shadow-emerald-500/10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Filters</h2>
                  <p className="text-xs text-muted-foreground">Refine your search</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  {results.length} results
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    className="h-11 text-base"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="E.g. Inception"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Keywords</label>
                  <Input
                    className="h-11 text-base"
                    value={keywords}
                    onChange={(event) => setKeywords(event.target.value)}
                    placeholder="E.g. space, time travel"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate keywords with a comma.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Genres</label>
                  <div className="grid gap-2 rounded-xl border border-emerald-500/20 bg-background/60 p-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedGenreIds.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedGenreIds([])
                        }}
                      />
                      <span>All genres</span>
                    </label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {genres.map((genre) => {
                        const id = String(genre.id)
                        const checked = selectedGenreIds.includes(id)
                        return (
                          <label key={id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                setSelectedGenreIds((prev) =>
                                  checked
                                    ? prev.filter((value) => value !== id)
                                    : [...prev, id]
                                )
                              }}
                            />
                            <span>{genre.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min duration (min)</label>
                    <Input
                      className="h-11 text-base"
                      type="number"
                      min={0}
                      value={minDuration}
                      onChange={(event) => setMinDuration(event.target.value)}
                      placeholder="90"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max duration (min)</label>
                    <Input
                      className="h-11 text-base"
                      type="number"
                      min={0}
                      value={maxDuration}
                      onChange={(event) => setMaxDuration(event.target.value)}
                      placeholder="150"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min rating</label>
                    <Input
                      className="h-11 text-base"
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={minRating}
                      onChange={(event) => setMinRating(event.target.value)}
                      placeholder="7.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max rating</label>
                    <Input
                      className="h-11 text-base"
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={maxRating}
                      onChange={(event) => setMaxRating(event.target.value)}
                      placeholder="9.5"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min year</label>
                    <Input
                      className="h-11 text-base"
                      type="number"
                      min={1900}
                      max={2100}
                      value={minYear}
                      onChange={(event) => setMinYear(event.target.value)}
                      placeholder="2000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max year</label>
                    <Input
                      className="h-11 text-base"
                      type="number"
                      min={1900}
                      max={2100}
                      value={maxYear}
                      onChange={(event) => setMaxYear(event.target.value)}
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actor</label>
                  <Input
                    className="h-11 text-base"
                    value={actorInput}
                    onChange={(event) => setActorInput(event.target.value)}
                    placeholder="Search an actor"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && actorSuggestions.length > 0 && !selectedActor) {
                        event.preventDefault()
                        selectActor(actorSuggestions[0])
                      }
                    }}
                  />
                  {selectedActor ? (
                    <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
                      <span>{selectedActor.name}</span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedActor(null)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  {actorSuggestions.length > 0 && !selectedActor ? (
                    <div className="rounded-md border border-border/50 bg-background shadow-sm">
                      {actorSuggestions.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => selectActor(person)}
                        >
                          <span>{person.name}</span>
                          <span className="text-xs text-muted-foreground">Actor</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Director</label>
                  <Input
                    className="h-11 text-base"
                    value={directorInput}
                    onChange={(event) => setDirectorInput(event.target.value)}
                    placeholder="Search a director"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && directorSuggestions.length > 0 && !selectedDirector) {
                        event.preventDefault()
                        selectDirector(directorSuggestions[0])
                      }
                    }}
                  />
                  {selectedDirector ? (
                    <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
                      <span>{selectedDirector.name}</span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedDirector(null)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  {directorSuggestions.length > 0 && !selectedDirector ? (
                    <div className="rounded-md border border-border/50 bg-background shadow-sm">
                      {directorSuggestions.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => selectDirector(person)}
                        >
                          <span>{person.name}</span>
                          <span className="text-xs text-muted-foreground">Director</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button className="h-11 text-base" onClick={handleSearch} disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                  </Button>
                  <Button
                    className="h-11 text-base"
                    variant="outline"
                    onClick={() => {
                      setQuery("")
                      setSelectedGenreIds([])
                      setSelectedActor(null)
                      setSelectedDirector(null)
                      setMinDuration("")
                      setMaxDuration("")
                      setMinRating("")
                      setMaxRating("")
                      setMinYear("")
                      setMaxYear("")
                      setKeywords("")
                      setResults([])
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {query ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  Title: {query}
                </span>
              ) : null}
              {selectedGenres.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100"
                >
                  Genre: {genre.name}
                </span>
              ))}
              {minRating ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  Rating ≥ {minRating}
                </span>
              ) : null}
              {maxRating ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  Rating ≤ {maxRating}
                </span>
              ) : null}
              {minDuration ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  Duration ≥ {minDuration} min
                </span>
              ) : null}
              {maxDuration ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  Duration ≤ {maxDuration} min
                </span>
              ) : null}
              {keywords ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  Keywords: {keywords}
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {results.length} results
              </p>
            </div>

            {content}
          </section>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
