"use client"

import { useEffect, useState } from "react"
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
