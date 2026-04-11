"use client"

import { useEffect, useMemo, useState } from "react"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { Check, ClipboardCheck, Trash2, Loader2, CalendarClock, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  deleteWatchHistory,
  getWatchHistory,
  getMovieDetails,
  type WatchHistoryEntry,
  type MovieDetails
} from "@/lib/api"
import { cn } from "@/lib/utils"

type SeenMovieCard = {
  id: string
  title: string
  year?: number
  poster?: string
  watchedAt?: string
  myRating?: number
  entryId?: string
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w500"

function toPosterUrl(posterPath?: string) {
  if (!posterPath) return "/placeholder.svg"
  if (posterPath.startsWith("http")) return posterPath
  return `${POSTER_BASE}${posterPath}`
}

function toTenStar(rating?: number) {
  if (rating === undefined || rating === null) return 0
  const normalized = Math.round(rating)
  return Math.max(0, Math.min(10, normalized))
}

function formatRelativeDate(isoDate?: string) {
  if (!isoDate) return "Recently"
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return "Recently"

  const diffDays = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day")
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month")
  const diffYears = Math.round(diffMonths / 12)
  return rtf.format(diffYears, "year")
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

export default function SeenMoviesPage() {
  const checking = useRequireAuth()
  const [items, setItems] = useState<SeenMovieCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const history = await getWatchHistory()

        // Dedup movieIds and keep first entry for watchedAt/rating
        const byMovie = new Map<string, WatchHistoryEntry>()
        for (const h of history) {
          if (!byMovie.has(h.movieId)) byMovie.set(h.movieId, h)
        }

        const movieIds = Array.from(byMovie.keys())
        const cache = new Map<string, MovieDetails>()

        const detailsList = await mapWithConcurrency(movieIds, 6, async (movieId) => {
          if (cache.has(movieId)) return cache.get(movieId)!
          const details = await getMovieDetails(movieId)
          cache.set(movieId, details)
          return details
        })

        const result: SeenMovieCard[] = movieIds.map((movieId, idx) => {
          const entry = byMovie.get(movieId)
          const details = detailsList[idx]

          return {
            id: movieId,
            title: details?.title ?? movieId,
            year: details?.year,
            poster: toPosterUrl(details?.posterPath),
            watchedAt: entry?.watchedAt,
            myRating: toTenStar(entry?.rating),
            entryId: entry?.id
          }
        })

        // Sort by most recently watched
        result.sort((a, b) => {
            const dateA = a.watchedAt ? new Date(a.watchedAt).getTime() : 0
            const dateB = b.watchedAt ? new Date(b.watchedAt).getTime() : 0
            return dateB - dateA
        })

        if (active) setItems(result)
      } catch {
        if (active) setError("Failed to load watch history.")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const content = useMemo(() => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Retrieving your history...</p>
      </div>
    )
    
    if (error) return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
        {error}
      </div>
    )
    
    if (!items.length) {
      return (
        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
          <div className="p-4 rounded-full bg-zinc-900 mb-4 border border-white/5">
             <CalendarClock className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No movies yet</h3>
          <p className="text-sm text-zinc-500">Mark movies as seen to build your history.</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((movie) => (
          <div key={movie.id} className="relative group">
            <MovieCard
              id={movie.id}
              title={movie.title}
              poster={movie.poster}
              year={movie.year}
              rating={movie.myRating}
              meta={
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-zinc-400 font-mono">
                    {formatRelativeDate(movie.watchedAt)}
                  </Badge>
                  {movie.myRating ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" /> {movie.myRating}/10
                    </div>
                  ) : null}
                </div>
              }
            >
                <div className="flex items-center justify-between gap-2 w-full pt-2">
                    <div className="flex-1">
                       <MovieQuickActions movieId={movie.id} showHistory={false} />
                    </div>
                    
                    <button
                        type="button"
                        aria-label="Remove from history"
                        onClick={async (e) => {
                            e.preventDefault()
                            if (!movie.entryId) return
                            setRemovingId(movie.entryId)
                            try {
                                await deleteWatchHistory(movie.entryId)
                                setItems((prev) => prev.filter((item) => item.entryId !== movie.entryId))
                                toast.success("Removed from history")
                            } catch {
                                toast.error("Unable to remove from history")
                            } finally {
                                setRemovingId(null)
                            }
                        }}
                        className={cn(
                            "h-8 w-8 flex items-center justify-center rounded-full bg-black/40 border border-white/10 text-zinc-400 transition-colors",
                            "hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30",
                            removingId === movie.entryId ? "opacity-50 cursor-not-allowed" : ""
                        )}
                        disabled={removingId === movie.entryId}
                    >
                        {removingId === movie.entryId ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </MovieCard>
          </div>
        ))}
      </div>
    )
  }, [loading, error, items, removingId])

  if (checking) return null

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-emerald-500/30 pb-28">
      <Header />

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col gap-2 mb-10">
            <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300 uppercase tracking-widest text-[10px] gap-2 pl-2">
                <Check className="h-3 w-3" />
                Journal
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white">
                Watch History
            </h1>
            <p className="text-zinc-400 text-sm">
                Movies you've marked as seen.
            </p>
        </div>

        {content}
      </div>
      <Footer />
      <BottomNav />
    </main>
  )
}
