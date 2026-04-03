"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import { MovieCard } from "@/components/movie-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, X, Filter } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Searching the database...</p>
      </div>
    )
    
    if (error) return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
        {error}
      </div>
    )
    
    if (!results.length) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-2xl bg-white/5">
          <Search className="h-8 w-8 mb-4 opacity-50" />
          <p>No results found. Try adjusting your filters.</p>
        </div>
      )
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
              <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground mt-1">
                {movie.duration ? <Badge variant="secondary" className="bg-white/5">{movie.duration}m</Badge> : null}
                {movie.genres?.slice(0, 2).map(g => (
                  <span key={g} className="px-1.5 py-0.5 rounded-sm bg-white/5">{g}</span>
                ))}
              </div>
            }
          />
        ))}
      </div>
    )
  }, [loading, error, results])

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-emerald-500/30 pb-28">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- CONTENT --- */}
      <div className="relative z-10">
        <Header />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          
          <div className="flex flex-col gap-2 mb-10">
            <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300 uppercase tracking-widest text-[10px]">
              Advanced Search
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
              Discover Movies
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Filter by title, genre, cast, director, and more to find exactly what you're looking for.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            
            {/* SIDEBAR FILTERS */}
            <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-5 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-emerald-400" />
                    <h2 className="font-semibold">Filters</h2>
                  </div>
                  {results.length > 0 && (
                    <span className="text-xs font-mono text-zinc-500">
                      {results.length} found
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  
                  {/* Title Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                      <Input
                        className="pl-9 bg-black/20 border-white/10 focus-visible:ring-emerald-500/50"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="E.g. Inception"
                      />
                    </div>
                  </div>

                  {/* Keywords Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Keywords</label>
                    <Input
                      className="bg-black/20 border-white/10 focus-visible:ring-emerald-500/50"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="space, time travel..."
                    />
                  </div>

                  {/* Genres */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Genres</label>
                    <div className="rounded-xl border border-white/5 bg-black/20 p-3 max-h-48 overflow-y-auto custom-scrollbar">
                      <label className="flex items-center gap-2 text-sm p-1 hover:bg-white/5 rounded cursor-pointer">
                        <Checkbox
                          checked={selectedGenreIds.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedGenreIds([])
                          }}
                          className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <span>All genres</span>
                      </label>
                      <div className="grid grid-cols-1 gap-1 mt-1">
                        {genres.map((genre) => {
                          const id = String(genre.id)
                          return (
                            <label key={id} className="flex items-center gap-2 text-sm p-1 hover:bg-white/5 rounded cursor-pointer">
                              <Checkbox
                                checked={selectedGenreIds.includes(id)}
                                onCheckedChange={(checked) => {
                                  setSelectedGenreIds((prev) =>
                                    checked
                                      ? [...prev, id]
                                      : prev.filter((value) => value !== id)
                                  )
                                }}
                                className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                              <span className="truncate">{genre.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Duration Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase">Min Mins</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={minDuration}
                        onChange={(e) => setMinDuration(e.target.value)}
                        className="bg-black/20 border-white/10 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase">Max Mins</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="300"
                        value={maxDuration}
                        onChange={(e) => setMaxDuration(e.target.value)}
                        className="bg-black/20 border-white/10 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Rating Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase">Min Rating</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        placeholder="0"
                        value={minRating}
                        onChange={(e) => setMinRating(e.target.value)}
                        className="bg-black/20 border-white/10 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase">Max Rating</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        placeholder="10"
                        value={maxRating}
                        onChange={(e) => setMaxRating(e.target.value)}
                        className="bg-black/20 border-white/10 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Year Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase">Start Year</label>
                      <Input
                        type="number"
                        min={1900}
                        placeholder="1900"
                        value={minYear}
                        onChange={(e) => setMinYear(e.target.value)}
                        className="bg-black/20 border-white/10 h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase">End Year</label>
                      <Input
                        type="number"
                        min={1900}
                        placeholder="2025"
                        value={maxYear}
                        onChange={(e) => setMaxYear(e.target.value)}
                        className="bg-black/20 border-white/10 h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* People Filters */}
                  <div className="space-y-3">
                    <div className="space-y-1 relative">
                       <label className="text-[10px] text-zinc-500 uppercase">Actor</label>
                       <Input 
                          value={actorInput} 
                          onChange={(e) => setActorInput(e.target.value)} 
                          placeholder="Search actor..."
                          className="bg-black/20 border-white/10 h-9 text-sm"
                          onKeyDown={(e) => {
                             if (e.key === "Enter" && actorSuggestions.length > 0 && !selectedActor) {
                                e.preventDefault()
                                selectActor(actorSuggestions[0])
                             }
                          }}
                       />
                       {selectedActor && (
                         <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-xs mt-1">
                            <span className="text-emerald-200">{selectedActor.name}</span>
                            <button onClick={() => setSelectedActor(null)} className="text-emerald-400 hover:text-white"><X className="h-3 w-3"/></button>
                         </div>
                       )}
                       {actorSuggestions.length > 0 && !selectedActor && (
                          <div className="absolute top-full left-0 w-full z-50 mt-1 bg-zinc-900 border border-white/10 rounded-md shadow-xl overflow-hidden">
                             {actorSuggestions.map(p => (
                                <button key={p.id} onClick={() => selectActor(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5">{p.name}</button>
                             ))}
                          </div>
                       )}
                    </div>

                    <div className="space-y-1 relative">
                       <label className="text-[10px] text-zinc-500 uppercase">Director</label>
                       <Input 
                          value={directorInput} 
                          onChange={(e) => setDirectorInput(e.target.value)} 
                          placeholder="Search director..."
                          className="bg-black/20 border-white/10 h-9 text-sm"
                          onKeyDown={(e) => {
                             if (e.key === "Enter" && directorSuggestions.length > 0 && !selectedDirector) {
                                e.preventDefault()
                                selectDirector(directorSuggestions[0])
                             }
                          }}
                       />
                       {selectedDirector && (
                         <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-xs mt-1">
                            <span className="text-blue-200">{selectedDirector.name}</span>
                            <button onClick={() => setSelectedDirector(null)} className="text-blue-400 hover:text-white"><X className="h-3 w-3"/></button>
                         </div>
                       )}
                       {directorSuggestions.length > 0 && !selectedDirector && (
                          <div className="absolute top-full left-0 w-full z-50 mt-1 bg-zinc-900 border border-white/10 rounded-md shadow-xl overflow-hidden">
                             {directorSuggestions.map(p => (
                                <button key={p.id} onClick={() => selectDirector(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5">{p.name}</button>
                             ))}
                          </div>
                       )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      onClick={handleSearch} 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Filters"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-zinc-400 hover:text-white hover:bg-white/5"
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
                      Reset All
                    </Button>
                  </div>

                </div>
              </div>
            </aside>

            {/* RESULTS SECTION */}
            <section className="space-y-6">
              
              {/* Active Filters Display */}
              <div className="flex flex-wrap items-center gap-2">
                {query && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">"{query}"</Badge>}
                {selectedGenres.map(g => (
                   <Badge key={g.id} variant="secondary" className="bg-white/5 hover:bg-white/10">{g.name}</Badge>
                ))}
                {(minYear || maxYear) && <Badge variant="secondary" className="bg-white/5">{minYear || '...'} - {maxYear || '...'}</Badge>}
              </div>

              {content}

            </section>
          </div>
        </div>
      </div>
      <Footer />
      <BottomNav />
    </main>
  )
}