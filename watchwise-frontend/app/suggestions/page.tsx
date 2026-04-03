"use client"

import { useEffect, useMemo, useState } from "react"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import GradientText from "@/components/ui/gradient-text"
import PrismaticBurst from "@/components/ui/prismatic-burst"
import { Sparkles, Check, RefreshCcw, Loader2, History, Star, ThumbsUp } from "lucide-react"
import {
  getRecommendedMovies,
  getRecommendations,
  getWatchHistory,
  type MovieListItem,
  type RecommendationResponse,
  type WatchHistoryEntry,
  getMovieDetails,
} from "@/lib/api"
import { cn } from "@/lib/utils"

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
  // Ordina per data di visione (più recente prima)
  const sorted = [...history].sort((a, b) => {
    const aTime = a.watchedAt ? new Date(a.watchedAt).getTime() : 0
    const bTime = b.watchedAt ? new Date(b.watchedAt).getTime() : 0
    return bTime - aTime
  })
  // Trova il primo con rating >= 8
  const found = sorted.find((entry) => (entry.rating ?? 0) >= 8)?.movieId
  if (!found) return undefined
  // Normalize movieId if in format 'tmdb:12345'
  return found.includes(":") ? found.split(":").pop() ?? found : found
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
  const checking = useRequireAuth()
  const [items, setItems] = useState<SuggestionCard[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [burstQuality, setBurstQuality] = useState<"full" | "lite" | "micro" | "off">("full")
  const [isHeroVisible, setIsHeroVisible] = useState(true)
  const [isHeroHovered, setIsHeroHovered] = useState(false)
  
  // States for "Because you watched" section
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [carouselLoading, setCarouselLoading] = useState(false)
  const [sourceMovieTitle, setSourceMovieTitle] = useState<string>("")
  
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

  // Load "Because you watched" data
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

        // Fetch source movie details to show title
        try {
          const sourceDetails = await getMovieDetails(lastHighRatedId)
          setSourceMovieTitle(sourceDetails.title)
        } catch {
          setSourceMovieTitle("your favorite")
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
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Curating your list...</p>
      </div>
    )
    
    if (error) return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
        {error}
      </div>
    )
    
    if (!items.length) {
      return (
        <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
          <p className="text-zinc-500">No suggestions available yet. Try rating some movies!</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
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
              <div className="flex flex-col gap-1 text-[10px] text-muted-foreground mt-2">
                {movie.reasons?.length ? (
                  <ul className="space-y-1">
                    {movie.reasons.slice(0, 2).map((reason) => (
                      <li key={`${movie.id}-${reason}`} className="flex items-start gap-1 leading-tight">
                        <span className="text-amber-400 mt-0.5">•</span> {reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-zinc-500 italic">Based on your taste</span>
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

  if (checking) return null

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-amber-500/30 pb-28">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-amber-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- CONTENT --- */}
      <div className="relative z-10">
        <Header />

        <div className="container mx-auto px-4 py-8 max-w-[1400px]">
          
          {/* HERO SECTION */}
          <div
            id="suggestions-hero"
            className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900/60 mb-12 group outline-none focus:ring-2 focus:ring-amber-500/50 transition-all duration-500"
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
            onFocus={() => setIsHeroHovered(true)}
            onBlur={() => setIsHeroHovered(false)}
            tabIndex={0}
          >
            {burstQuality !== "off" && (
              <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen">
                <PrismaticBurst
                  colors={["#fbbf24", "#7c3aed", "#2dd4bf"]} // Amber, Violet, Teal
                  {...burstProps}
                  paused={!isHeroVisible || !isHeroHovered}
                />
              </div>
            )}

            <div className="relative z-10 px-6 py-16 md:py-20 flex flex-col items-center text-center">
              
              <div className="mb-6 animate-float">
                <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
                  <Sparkles className="h-8 w-8 text-amber-400 fill-amber-400/20" />
                </div>
              </div>

              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">AI Curated Daily</span>
              </div>
              
              <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-sm max-w-4xl leading-[1.1]">
                Your <GradientText colors={["#fcd34d", "#fbbf24", "#d97706", "#fbbf24", "#fcd34d"]} animationSpeed={6} showBorder={false} className="inline-block px-2">tailored</GradientText>
                <br className="hidden md:block" /> mix is ready.
              </h1>
              
              <p className="mb-10 max-w-xl text-lg text-zinc-300 font-medium leading-relaxed">
                We've analyzed your watch history to find hidden gems and new favorites just for you.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button
                  className="h-12 px-8 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-base shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
                  onClick={() => loadSuggestions(0, false)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                  {loading ? "Refreshing..." : "Refresh Picks"}
                </Button>
                
                <div className="flex items-center gap-6 px-6 text-sm font-medium text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    Personalized
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    Discovery First
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HISTORY CAROUSEL SECTION */}
          {(carouselLoading || carouselItems.length > 0) && (
            <section className="mb-16">
              {/* Feature Container */}
              <div className="relative rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-900/10 via-zinc-900/40 to-zinc-900/40 p-6 md:p-8 overflow-hidden backdrop-blur-sm">
                {/* Decorative Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1.5 py-1 px-3">
                        <History className="h-3.5 w-3.5" />
                        Because you watched
                      </Badge>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
                      Similar to <span className="text-amber-400">{sourceMovieTitle || "your favorites"}</span>
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-lg">
                      Since you rated this movie highly (8+), here are some other titles with a similar vibe and style.
                    </p>
                  </div>
                  
                  {/* Visual Indicator of Rating */}
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/5">
                    <ThumbsUp className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-medium text-zinc-300">Based on your 8+ ratings</span>
                  </div>
                </div>

                {carouselLoading ? (
                  <div className="h-56 w-full flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500/50" />
                  </div>
                ) : (
                  <Carousel opts={{ align: "start", loop: false }} className="w-full relative z-10">
                    <CarouselContent className="-ml-4">
                      {carouselItems.map((movie) => (
                        <CarouselItem
                          key={movie.id}
                          className="pl-4 basis-[150px] sm:basis-[180px] md:basis-[220px]"
                        >
                          <div className="group relative transition-transform duration-300 hover:-translate-y-1">
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
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex -left-4 border-amber-500/20 bg-black/60 hover:bg-amber-500/20 hover:text-white hover:border-amber-500/50 text-amber-200" />
                    <CarouselNext className="hidden md:flex -right-4 border-amber-500/20 bg-black/60 hover:bg-amber-500/20 hover:text-white hover:border-amber-500/50 text-amber-200" />
                  </Carousel>
                )}
              </div>
            </section>
          )}

          {/* MAIN GRID */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-gradient-to-b from-violet-500 to-transparent rounded-full" />
                <h2 className="text-2xl font-bold text-white">Top Suggestions</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                {items.length} Titles
              </span>
            </div>

            {content}

            {items.length > 0 && (
              <div className="flex justify-center pt-12 pb-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 border-white/10 bg-zinc-900/50 hover:bg-white/10 hover:text-white transition-all"
                  onClick={() => loadSuggestions(page + 1, true)}
                  disabled={loadingMore || loading}
                >
                  {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </section>

        </div>
      </div>
      <Footer />
      <BottomNav />
    </main>
  )
}