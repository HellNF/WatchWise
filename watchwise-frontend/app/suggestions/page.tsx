"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import GradientText from "@/components/ui/gradient-text"
import PrismaticBurst from "@/components/ui/prismatic-burst"
import { Sparkles, Check } from "lucide-react"
import {
  getRecommendedMovies,
  getRecommendations,
  getWatchHistory,
  type MovieListItem,
  type RecommendationResponse,
  type WatchHistoryEntry,
} from "@/lib/api"

const POSTER_BASE = "https://image.tmdb.org/t/p/w500"

type SuggestionCard = {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
  reasons?: string[]
  serendipity?: boolean
}

type CarouselItem = {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
}

function toPosterUrl(posterPath?: string) {
  if (!posterPath) return "/placeholder.svg"
  if (posterPath.startsWith("http")) return posterPath
  return `${POSTER_BASE}${posterPath}`
}

function mapRecommendations(response: RecommendationResponse): SuggestionCard[] {
  const entries = [response.recommended, ...(response.topK ?? [])]
  const seen = new Set<string>()
  return entries
    .filter((entry) => {
      const id = entry.movie.movieId
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((entry) => ({
      id: entry.movie.movieId,
      title: entry.movie.title,
      year: entry.movie.year,
      poster: toPosterUrl(entry.movie.posterPath),
      rating: entry.movie.voteAverage,
      reasons: entry.reasons ?? [],
      serendipity: entry.serendipity,
    }))
}

function mapMovieListItem(item: MovieListItem): CarouselItem {
  const normalizedId = item.movieId.includes(":")
    ? item.movieId.split(":").pop() ?? item.movieId
    : item.movieId
  return {
    id: normalizedId,
    title: item.title,
    year: item.year,
    poster: toPosterUrl(item.posterPath),
    rating: item.voteAverage,
  }
}

function pickLastHighRated(history: WatchHistoryEntry[]) {
  if (!history.length) return undefined
  const sorted = [...history].sort((a, b) => {
    const aTime = a.watchedAt ? new Date(a.watchedAt).getTime() : 0
    const bTime = b.watchedAt ? new Date(b.watchedAt).getTime() : 0
    return bTime - aTime
  })
  return sorted.find((entry) => (entry.rating ?? 0) >= 8)?.movieId
}

function buildQuestionnaireContext() {
  if (typeof window === "undefined") return undefined
  try {
    const raw = localStorage.getItem("watchwise-preferences")
    if (!raw) return undefined
    const prefs = JSON.parse(raw) as {
      mood?: string
      duration?: string
      genres?: string[]
    }
    const maxDuration =
      prefs.duration === "short"
        ? 90
        : prefs.duration === "medium"
          ? 120
          : prefs.duration === "long"
            ? 180
            : undefined

    return {
      mood: prefs.mood,
      preferredGenres: prefs.genres ?? [],
      maxDuration,
    }
  } catch {
    return undefined
  }
}

export default function SuggestionsPage() {
  const [items, setItems] = useState<SuggestionCard[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [burstQuality, setBurstQuality] = useState<"full" | "lite" | "micro" | "off">("full")
  const [isHeroVisible, setIsHeroVisible] = useState(true)
  const [isHeroHovered, setIsHeroHovered] = useState(false)
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [carouselLoading, setCarouselLoading] = useState(false)
  const pageSize = 30

  const mergeItems = (current: SuggestionCard[], next: SuggestionCard[]) => {
    const seen = new Set(current.map((item) => item.id))
    const merged = [...current]
    for (const item of next) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
    return merged
  }

  const loadSuggestions = async (nextPage = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)
    try {
      const context = buildQuestionnaireContext()
      const data = await getRecommendations({
        limit: pageSize,
        offset: nextPage * pageSize,
        context,
      })
      const mapped = mapRecommendations(data)
      setItems((prev) => (append ? mergeItems(prev, mapped) : mapped))
      setPage(nextPage)
    } catch {
      setError("Unable to load personalized suggestions.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void loadSuggestions()
  }, [])

  useEffect(() => {
    const loadCarousel = async () => {
      setCarouselLoading(true)
      try {
        const history = await getWatchHistory()
        const lastHighRatedId = pickLastHighRated(history)
        if (!lastHighRatedId) {
          setCarouselItems([])
          return
        }
        const recs = await getRecommendedMovies(lastHighRatedId, 10)
        setCarouselItems(recs.map(mapMovieListItem))
      } catch {
        setCarouselItems([])
      } finally {
        setCarouselLoading(false)
      }
    }

    void loadCarousel()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    const reduceData = window.matchMedia?.("(prefers-reduced-data: reduce)")
    const mediaQueries = [reduceMotion, reduceData].filter(Boolean)
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory
    const cores = navigator.hardwareConcurrency ?? 8

    const update = () => {
      const reduce = mediaQueries.some((mq) => mq?.matches)
      const lowPower = (deviceMemory !== undefined && deviceMemory <= 4) || cores <= 4
      const midPower = (deviceMemory !== undefined && deviceMemory <= 8) || cores <= 6
      if (reduce) setBurstQuality("off")
      else if (lowPower) setBurstQuality("micro")
      else if (midPower) setBurstQuality("lite")
      else setBurstQuality("full")
    }

    update()
    mediaQueries.forEach((mq) => mq?.addEventListener("change", update))
    return () => {
      mediaQueries.forEach((mq) => mq?.removeEventListener("change", update))
    }
  }, [])

  useEffect(() => {
    const hero = document.getElementById("suggestions-hero")
    if (!hero || !("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(
      (entries) => {
        setIsHeroVisible(Boolean(entries[0]?.isIntersecting))
      },
      { root: null, threshold: 0.05 }
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  const burstProps =
    burstQuality === "micro"
      ? {
          intensity: 2,
          speed: 0.12,
          distort: 0.12,
          rayCount: 3,
          animationType: "hover" as const,
          dpr: 1,
          maxFps: 18,
        }
      : burstQuality === "lite"
      ? {
          intensity: 0.95,
          speed: 0.16,
          distort: 0.18,
          rayCount: 6,
          animationType: "rotate" as const,
          dpr: 1,
          maxFps: 22,
        }
      : {
          intensity: 1.2,
          speed: 0.2,
          distort: 0.28,
          rayCount: 6,
          animationType: "rotate" as const,
          dpr: 1,
          maxFps: 30,
        }

  const content = useMemo(() => {
    if (loading) return <div className="text-muted-foreground">Loading suggestions...</div>
    if (error) return <div className="text-destructive">{error}</div>
    if (!items.length) {
      return <div className="text-muted-foreground">No suggestions available yet.</div>
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {items.map((movie) => (
          <MovieCard
            key={movie.id}
            id={movie.id}
            title={movie.title}
            poster={movie.poster}
            year={movie.year}
            rating={movie.rating}
            isDiscovery={movie.serendipity}
            alwaysShowActions
            meta={
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {movie.reasons?.length ? (
                  <ul className="list-disc pl-4">
                    {movie.reasons.slice(0, 3).map((reason) => (
                      <li key={`${movie.id}-${reason}`}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <span>Based on your preferences</span>
                )}
              </div>
            }
          >
            <MovieQuickActions
              movieId={movie.id}
              showNotInterested
              onNotInterested={(id) =>
                setItems((prev) => prev.filter((item) => item.id !== id))
              }
            />
          </MovieCard>
        ))}
      </div>
    )
  }, [loading, error, items])

  return (
    <main className="min-h-screen pb-28 ,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_50%)]">
      <Header />
      <div className="container mx-auto px-4 py-10 mx-1 max-w-11/12">
        <div
          id="suggestions-hero"
          className="relative overflow-hidden rounded-3xl border  bg-neutral-950/60 mb-10 group backdrop-blur-sm"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          onFocus={() => setIsHeroHovered(true)}
          onBlur={() => setIsHeroHovered(false)}
          tabIndex={0}
        >
          
          {burstQuality !== "off" && (
            <div className="absolute inset-0 pointer-events-none -z-10">
              <PrismaticBurst
                colors={["#fbbf24", "#ffffff", "#2dd4bf"]} // Yellow, White, Teal
                {...burstProps}
                paused={!isHeroVisible || !isHeroHovered}
              />
            </div>
          )}

          {/* Centered Content */}
          <div className="relative flex flex-col items-center text-center z-10 px-6 py-12">
            
            {/* Top Icon Group */}
            <div className="mb-8 flex flex-col items-center gap-2">
               <div className="relative">
                 <Sparkles className="h-8 w-8 text-yellow-300 fill-yellow-300/20 animate-pulse" />
               </div>
            </div>

            {/* Pill Badge */}
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-6 py-2 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.15)]">
               <span className="text-[10px] text-yellow-500">◀</span>
               <span className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-100">Main Feature</span>
               <span className="text-[10px] text-yellow-500">▶</span>
            </div>
            
            {/* Title with Gradient Text */}
            <div className="mb-6">
               <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-2xl leading-tight">
                  Your <GradientText colors={["#fefce8", "#fde047", "#eab308", "#fde047", "#fefce8"]} animationSpeed={6} showBorder={false} className="inline-block px-2 text-5xl md:text-6xl lg:text-7xl font-bold">tailored</GradientText>
                  <br className="my-2"/>
                  suggestions
               </h1>
            </div>
            
            {/* Subtitle */}
            <p className="mb-10 max-w-2xl text-lg text-yellow-100/80 font-medium">
              A daily blend of picks tuned to your taste, with a touch of discovery
            </p>

            {/* Footer Row */}
            <div className="flex w-full max-w-4xl flex-col items-center justify-between gap-6 md:flex-row px-4">
              {/* Features List */}
              <div className="flex flex-wrap justify-center gap-8 md:justify-start">
                  <div className="flex items-center gap-3 text-sm font-medium text-yellow-100">
                    <Check className="h-4 w-4 text-yellow-400" />
                    Personalized daily mix
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-yellow-100">
                    <Check className="h-4 w-4 text-yellow-400" />
                    Discovery first
                  </div>
              </div>

              {/* Refresh Button */}
              <Button
                className="group/btn h-12 min-w-[140px] border-yellow-500/50 bg-yellow-950/40 text-yellow-100 hover:bg-yellow-500/20 hover:text-white backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                variant="outline"
                onClick={() => loadSuggestions(0, false)}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>

        {carouselLoading || carouselItems.length ? (
          <section className="mb-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Based on your last 8+
                </p>
                <h2 className="text-2xl font-semibold">Because you loved your last movie</h2>
              </div>
            </div>

            {carouselLoading ? (
              <div className="text-muted-foreground">Loading recommendations...</div>
            ) : (
              <Carousel opts={{ align: "start" }} className="relative">
                <CarouselContent className="-ml-4">
                  {carouselItems.map((movie) => (
                    <CarouselItem
                      key={movie.id}
                      className="pl-4 basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6"
                    >
                      <MovieCard
                        id={movie.id}
                        title={movie.title}
                        poster={movie.poster}
                        year={movie.year}
                        rating={movie.rating}
                        alwaysShowActions
                      >
                        <MovieQuickActions movieId={movie.id} />
                      </MovieCard>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-6" />
                <CarouselNext className="hidden md:flex -right-6" />
              </Carousel>
            )}
          </section>
        ) : null}

        {content}

        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            className="h-11 text-base"
            onClick={() => loadSuggestions(page + 1, true)}
            disabled={loadingMore || loading}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
