"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MovieCard } from "@/components/movie-card"
import { Check, Calendar, ClipboardCheck } from "lucide-react"
import {
  getWatchHistory,
  getMovieDetails,
  type WatchHistoryEntry,
  type MovieDetails
} from "@/lib/api"

type SeenMovieCard = {
  id: string
  title: string
  year?: number
  poster?: string
  watchedAt?: string
  myRating?: number
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
  const [items, setItems] = useState<SeenMovieCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
            myRating: toTenStar(entry?.rating)
          }
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
    if (loading) return <div className="text-muted-foreground">Loading...</div>
    if (error) return <div className="text-destructive">{error}</div>
    if (!items.length) return <div className="text-muted-foreground">No watched movies yet.</div>

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((movie) => (
          <div key={movie.id} className="flex flex-col gap-12">
            <MovieCard
              id={movie.id}
              title={movie.title}
              poster={movie.poster}
              year={movie.year}
              rating={movie.myRating}
              className=""
              children={<div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ClipboardCheck className="w-4 h-4" />
                          <span>{formatRelativeDate(movie.watchedAt)}</span>
                        </div>}
            />
            
          </div>
        ))}
      </div>
    )
  }, [loading, error, items])

  return (
    <main className="min-h-screen pb-28">
      <Header />
      <div className="container mx-auto px-4 py-8 mx-1 max-w-11/12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-full">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Movies You've Seen</h1>
        </div>
        {content}
      </div>
      <BottomNav />
    </main>
  )
}
