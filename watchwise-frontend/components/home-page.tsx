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
  type CarouselApi,
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
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!api) return
    const onSelect = () => setActiveIndex(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    return () => { api.off("select", onSelect) }
  }, [api])

  // Auto-play hero
  useEffect(() => {
    if (!api) return
    const interval = setInterval(() => {
      api.scrollNext()
    }, 8000)
    return () => clearInterval(interval)
  }, [api])

  const activeHero = items[activeIndex] ?? items[0]
  const heroBackdrop = activeHero?.backdrop || activeHero?.poster || "/placeholder.svg"

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- HERO SECTION --- */}
      <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden group">
        
        {/* Background Image with Fade */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-zinc-950 transition-opacity duration-700" /> 
          <Image
            key={activeHero?.id} // Key forces fade animation on change
            src={heroBackdrop}
            alt={activeHero?.title ?? "Hero"}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top animate-in fade-in zoom-in-105 duration-1000"
          />
          {/* Complex Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/30 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-end pb-32 px-4 md:px-8 lg:px-12 max-w-[1400px] mx-auto">
          <div className="max-w-3xl space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
            
            {/* Badges */}
            <div className="flex items-center gap-3">
              <Badge className="gap-1.5 py-1.5 px-3 bg-violet-600 hover:bg-violet-600 text-white border-0 shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                <Sparkles className="h-3.5 w-3.5 fill-white" />
                {activeHero?.badge ?? "Featured"}
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-white/20 bg-black/20 backdrop-blur-md text-zinc-200">
                <Film className="h-3.5 w-3.5" />
                {activeHero?.year ? `Released ${activeHero.year}` : "Trending"}
              </Badge>
            </div>

            {/* Title & Overview */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] drop-shadow-2xl">
                {activeHero?.title ?? "Discover Movies"}
              </h1>
              
              <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
                {typeof activeHero?.rating === "number" && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Star className="h-4 w-4 fill-amber-400" /> 
                    {activeHero.rating.toFixed(1)} Rating
                  </span>
                )}
                {typeof activeHero?.year === "number" && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    {activeHero.year}
                  </span>
                )}
              </div>

              <p className="text-lg text-zinc-300/90 line-clamp-3 max-w-2xl leading-relaxed">
                {activeHero?.overview ?? "A dynamic selection tailored for you."}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              {activeHero?.id && (
                <Button asChild size="lg" className="h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-base shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  <Link href={`/movie/${encodeURIComponent(activeHero.id)}`}>
                    <Play className="mr-2 h-5 w-5 fill-black" /> Watch Details
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="lg" asChild className="h-14 px-8 rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md">
                <Link href="/suggestions">
                  <Sparkles className="mr-2 h-5 w-5" /> Recommended
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Carousel Navigation (Glass Dock) */}
        {items.length > 0 && (
          <div className="absolute bottom-8 right-4 md:right-12 z-20 max-w-[50%] lg:max-w-[40%] hidden md:block">
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-2">
              <Carousel
                opts={{ align: "start", loop: true }}
                setApi={setApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2">
                  {items.map((movie, index) => (
                    <CarouselItem key={movie.id} className="basis-1/3 lg:basis-1/4 pl-2">
                      <button
                        onClick={() => api?.scrollTo(index)}
                        className={cn(
                          "relative aspect-video w-full overflow-hidden rounded-lg border transition-all duration-300",
                          index === activeIndex 
                            ? "border-violet-500 ring-1 ring-violet-500/50 opacity-100" 
                            : "border-transparent opacity-50 hover:opacity-80"
                        )}
                      >
                        <Image
                          src={movie.backdrop || movie.poster || "/placeholder.svg"}
                          alt={movie.title}
                          fill
                          sizes="(max-width: 1024px) 20vw, 12vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          </div>
        )}
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
