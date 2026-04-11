"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { cn } from "@/lib/utils"
import { 
  ChevronRight, 
  Film, 
  Sparkles, 
  Users, 
  Play, 
  Star, 
  Calendar 
} from "lucide-react"

// --- TYPES ---
export type HomeHeroItem = {
  id: string
  title: string
  backdrop?: string
  poster?: string
  year?: number
  rating?: number
  overview?: string
  badge?: string
}

export type HomeMovieItem = {
  id: string
  title: string
  poster?: string
  year?: number
  rating?: number
  isDiscovery?: boolean
  reason?: string
}

export type HomeCategory = {
  key: string
  title: string
  subtitle?: string
  items: HomeMovieItem[]
  href?: string
}

// --- COMPONENTS ---

function CategoryRow({
  title,
  subtitle,
  items,
  href,
}: {
  title: string
  subtitle?: string
  items: HomeMovieItem[]
  href?: string
}) {
  const list = useMemo(() => items.slice(0, 15), [items])

  if (!list.length) return null

  return (
    <section
      className="py-10 relative"
      style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}
    >
      <div className="flex flex-col gap-6 px-4 md:px-6 lg:px-8 max-w-[1400px] mx-auto">
        
        {/* Row Header */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            {subtitle && (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                {subtitle}
              </p>
            )}
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {title}
            </h2>
          </div>
          {href && (
            <Link 
              href={href} 
              className="group flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              See all 
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        {/* Carousel Row */}
        <div className="relative">
          <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
            <CarouselContent className="-ml-4">
              {list.map((movie) => (
                <CarouselItem key={movie.id} className="pl-4 basis-[150px] sm:basis-[180px] md:basis-[220px]">
                  <MovieCard
                    id={movie.id}
                    title={movie.title}
                    poster={movie.poster}
                    year={movie.year}
                    rating={movie.rating}
                    isDiscovery={movie.isDiscovery}
                    reason={movie.reason}
                  >
                    <MovieQuickActions movieId={movie.id} />
                  </MovieCard>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Desktop fade edges + navigation */}
            <div className="hidden md:block pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
            <div className="hidden md:block pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

            <CarouselPrevious className="hidden md:flex -left-4 border-white/10 bg-black/50 hover:bg-black/80 text-white z-20 h-10 w-10" />
            <CarouselNext className="hidden md:flex -right-4 border-white/10 bg-black/50 hover:bg-black/80 text-white z-20 h-10 w-10" />
          </Carousel>
          {/* Mobile right-edge fade — pointer-events-none preserves swipe */}
          <div className="md:hidden absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-zinc-950 pointer-events-none z-10" />
        </div>
      </div>
    </section>
  )
}

export function HomePageClient({
  heroItems,
  categories,
}: {
  heroItems: HomeHeroItem[]
  categories: HomeCategory[]
}) {
  const items = useMemo(() => heroItems.filter(Boolean), [heroItems])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!items.length) return
    if (activeIndex >= items.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, items.length])

  useEffect(() => {
    if (items.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [items.length])

  const activeHero = items[activeIndex] ?? items[0]
  const heroBackdrop = activeHero?.backdrop || activeHero?.poster || "/placeholder.svg"

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            key={activeHero?.id}
            src={heroBackdrop}
            alt={activeHero?.title ?? "Hero"}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
        </div>

        <div className="relative z-10 px-4 py-16 md:px-6 lg:px-8 lg:py-24 max-w-10/12 mx-auto">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <Badge className="gap-1 bg-primary/90 text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                {activeHero?.badge ?? "Featured"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Film className="h-3 w-3" />
                Streaming picks
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
                {activeHero?.title ?? "Discover your next movie"}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground line-clamp-3">
                {activeHero?.overview ??
                  "A dynamic selection of movies tailored for you, with fresh discoveries every day."}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {typeof activeHero?.year === "number" ? (
                  <span>{activeHero.year}</span>
                ) : null}
                {typeof activeHero?.rating === "number" ? (
                  <span>· {activeHero.rating.toFixed(1)} / 10</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {activeHero?.id ? (
                <Button asChild size="lg">
                  <Link href={`/movie/${encodeURIComponent(activeHero.id)}`}>Details</Link>
                </Button>
              ) : null}
              <Button variant="outline" size="lg" asChild>
                <Link href="/suggestions">Suggested for You</Link>
              </Button>
            </div>

            {items.length > 1 ? (
              <div className="flex items-center gap-2 self-start md:self-auto md:ml-auto">
                {items.map((movie, index) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Go to movie ${index + 1}: ${movie.title}`}
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-300",
                      index === activeIndex
                        ? "w-8 bg-white"
                        : "w-2.5 bg-white/40 hover:bg-white/70"
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* --- MOVIE NIGHT BANNER --- */}
      <section className="relative z-10 px-4 md:px-6 lg:px-8 max-w-[1400px] mx-auto -mt-8 mb-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-900/40 via-zinc-900/60 to-zinc-900/60 backdrop-blur-xl shadow-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
          
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-violet-600/30 transition-colors" />

          <div className="flex items-center gap-6 relative z-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Movie Night with Friends?</h3>
              <p className="text-zinc-400 max-w-md">
                Create a group, swipe on movies, and let our AI find the perfect match for everyone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <Button asChild size="lg" className="w-full md:w-auto rounded-full bg-white text-black hover:bg-zinc-200 font-bold">
              <Link href="/groups">Create Group</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- CATEGORY ROWS --- */}
      <div className="relative z-10 pb-20">
        {categories.map((category) => (
          <CategoryRow
            key={category.key}
            title={category.title}
            subtitle={category.subtitle}
            items={category.items}
            href={category.href}
          />
        ))}
      </div>

    </div>
  )
}
