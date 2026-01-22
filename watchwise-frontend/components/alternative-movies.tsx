"use client"

import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
export interface AlternativeMovieItem {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
  isDiscovery?: boolean
  reason?: string
}

export function AlternativeMovies({ movies }: { movies?: AlternativeMovieItem[] }) {
  const items = useMemo(() => movies ?? [], [movies])

  return (
    <section className="py-8 border-t border-border/30 px-4 md:px-6 lg:px-8 max-w-10/12 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Or Maybe</p>
          <h2 className="text-xl font-medium">Other great choices</h2>
        </div>
        <button className="text-sm text-primary flex items-center gap-1 hover:underline">
          Refresh
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {items.map((movie) => (
          <MovieCard
            key={movie.id}
            id={movie.id}
            title={movie.title}
            poster={movie.poster}
            year={movie.year}
            rating={movie.rating}
            isDiscovery={movie.isDiscovery}
            reason={movie.reason}
            children={<MovieQuickActions movieId={movie.id} />}
          />
        ))}
      </div>
    </section>
  )
}
