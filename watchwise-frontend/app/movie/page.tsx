"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { HeroRecommendation, type HeroMovie } from "@/components/hero-recommendation"
import { AlternativeMovies, type AlternativeMovieItem } from "@/components/alternative-movies"
import { BottomNav } from "@/components/bottom-nav"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"
import { PodiumRow, type PodiumItem } from "@/components/podium-row"
import { Badge } from "@/components/ui/badge"
import {
  getMovieDetails,
  getMoviesByCategory,
  postQuestionnairePreferences,
  type MovieDetails,
  type MovieListItem,
  type MoviesCategory,
} from "@/lib/api"
import { Loader2, Flame, Ticket, Star, TrendingUp, Calendar, Film } from "lucide-react"
import { cn } from "@/lib/utils"

function shouldShowQuestionnaire(): boolean {
  if (typeof window === "undefined") return false
  const lastVisit = localStorage.getItem("watchwise-last-visit")
  const today = new Date().toDateString()
  return lastVisit !== today
}

function markQuestionnaireShown(): void {
  if (typeof window === "undefined") return
  localStorage.setItem("watchwise-last-visit", new Date().toDateString())
}

// Enhanced config with Icons and Colors
const categoryConfig: Record<
  MoviesCategory,
  { label: string; reason: string; icon: any; color: string; description: string }
> = {
  popular: {
    label: "Popular Movies",
    reason: "Popular right now",
    icon: Flame,
    color: "text-orange-400",
    description: "The most watched movies this week.",
  },
  now_playing: {
    label: "Now Playing",
    reason: "In theaters now",
    icon: Ticket,
    color: "text-emerald-400",
    description: "Catch these on the big screen.",
  },
  top_rated: {
    label: "Top Rated",
    reason: "Highest rated",
    icon: Star,
    color: "text-amber-400",
    description: "Critically acclaimed masterpieces.",
  },
  trending: {
    label: "Trending",
    reason: "Trending now",
    icon: TrendingUp,
    color: "text-violet-400",
    description: "Viral hits and rising stars.",
  },
  upcoming: {
    label: "Upcoming",
    reason: "Coming soon",
    icon: Calendar,
    color: "text-blue-400",
    description: "Add these to your watchlist soon.",
  },
}

function MoviePageInner() {
  const searchParams = useSearchParams()
  const rawCategory = searchParams.get("category")?.toLowerCase() ?? "popular"
  const categoryKey = rawCategory in categoryConfig ? (rawCategory as MoviesCategory) : "popular"
  const category = categoryConfig[categoryKey]
  const CategoryIcon = category.icon

  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [heroMovie, setHeroMovie] = useState<HeroMovie | null>(null)
  const [alternatives, setAlternatives] = useState<AlternativeMovieItem[]>([])
  const [podiumItems, setPodiumItems] = useState<PodiumItem[]>([])
  const [allMovies, setAllMovies] = useState<MovieListItem[]>([])
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Refs to avoid stale closures in IntersectionObserver
  const loadingRef = useRef(false)
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])

  useEffect(() => {
    setMounted(true)
    if (shouldShowQuestionnaire()) {
      const timer = setTimeout(() => setShowQuestionnaire(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const loadMovies = useCallback(async (pageToLoad: number, replace = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (pageToLoad > 1) setLoadingMore(true)
    try {
      const list = await getMoviesByCategory(categoryKey, { limit: 20, page: pageToLoad })
      setHasMore(list.length >= 20)
      setPage(pageToLoad)
      setAllMovies((prev) => {
        const base = replace ? [] : prev
        const merged = [...base, ...list]
        const seen = new Set<string>()
        return merged.filter((item) => {
          if (seen.has(item.movieId)) return false
          seen.add(item.movieId)
          return true
        })
      })
    } catch (error) {
      console.error("Failed to load movies", error)
    } finally {
      loadingRef.current = false
      setLoadingMore(false)
    }
  }, [categoryKey])

  // Reset and initial load when category changes
  useEffect(() => {
    setAllMovies([])
    setPage(1)
    setHasMore(true)
    pageRef.current = 1
    hasMoreRef.current = true
    void loadMovies(1, true)
  }, [categoryKey, loadMovies])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          void loadMovies(pageRef.current + 1)
        }
      },
      { rootMargin: "400px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMovies])

  useEffect(() => {
    const normalizeMovieId = (value: string) => (value.includes(":") ? value.split(":").pop() ?? value : value)

    if (!allMovies.length) {
      setHeroMovie(null)
      setAlternatives([])
      setPodiumItems([])
      return
    }

    const podiumList = allMovies.slice(0, 10)
    const remainingList = allMovies.slice(10)

    const podium: PodiumItem[] = podiumList.map((item, index) => ({
      id: normalizeMovieId(item.movieId),
      title: item.title,
      poster: item.posterPath,
      rank: index + 1,
      year: item.year,
      rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
    }))

    const altItems: AlternativeMovieItem[] = remainingList.map((item, index) => ({
      id: normalizeMovieId(item.movieId),
      title: item.title,
      year: item.year,
      poster: item.posterPath,
      rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
      isDiscovery: index === remainingList.length - 1,
      reason: category.reason,
    }))

    setPodiumItems(podium)
    setAlternatives(altItems)
  }, [allMovies, category.reason])

  useEffect(() => {
    const first = allMovies[0]
    if (!first) return

    const formatRuntime = (minutes?: number) => {
      if (!minutes) return undefined
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return h ? `${h}h ${m}m` : `${m}m`
    }

    const loadHeroDetails = async () => {
      try {
        const details = (await getMovieDetails(first.movieId)) as MovieDetails

        setHeroMovie({
          id: first.movieId.includes(":") ? first.movieId.split(":").pop() ?? first.movieId : first.movieId,
          title: first.title,
          year: first.year,
          poster: first.posterPath,
          rating: Number.isFinite(first.voteAverage) ? first.voteAverage : undefined,
          runtime: formatRuntime(details.duration),
          genres: details.genres ?? [],
          description: details.overview,
          reasons: [category.reason],
          director: details.director
            ? { id: details.directorId, name: details.director, image: details.directorImage }
            : undefined,
          cast: details.actorsDetailed ?? [],
        })
      } catch (error) {
        console.error("Failed to load hero details", error)
      }
    }

    loadHeroDetails()
  }, [allMovies, category.reason])

  const handleQuestionnaireComplete = (prefs: UserPreferences) => {
    setShowQuestionnaire(false)
    markQuestionnaireShown()
    localStorage.setItem("watchwise-preferences", JSON.stringify(prefs))
    void (async () => {
      try {
        await postQuestionnairePreferences(prefs)
      } catch (error) {
        console.error("Failed to save questionnaire preferences", error)
      }
    })()
  }

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false)
    markQuestionnaireShown()
  }

  if (!mounted) {
    return (
      <main className="min-h-screen bg-zinc-950 pb-28">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="h-96 w-full animate-pulse rounded-3xl bg-white/5" />
        </div>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      <Header />

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-10 mt-2 flex flex-col gap-4">
          <Badge
            variant="outline"
            className="w-fit border-white/10 bg-white/5 text-zinc-400 uppercase tracking-widest text-[10px] gap-2 pl-2"
          >
            <Film className="h-3 w-3" />
            Discover
          </Badge>

          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center gap-3">
              <CategoryIcon className={cn("h-10 w-10", category.color)} />
              {category.label}
            </h1>
            <p className="text-zinc-400 mt-2 text-lg">{category.description}</p>
          </div>
        </div>

        {/* Content Flow */}
        <div className="space-y-16">
          {/* Hero Section */}
          <section>
            <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm p-1">
              <HeroRecommendation movie={heroMovie} />
            </div>
          </section>

          {/* Podium Section */}
          {podiumItems.length > 0 && (
            <section className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-amber-500/5 blur-3xl pointer-events-none" />
              <PodiumRow title={`Top 10 ${category.label}`} items={podiumItems} />
            </section>
          )}

          {/* Grid Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-gradient-to-b from-violet-500 to-transparent rounded-full" />
              <h2 className="text-2xl font-bold text-white">More to Explore</h2>
            </div>

            <AlternativeMovies movies={alternatives} />

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" aria-hidden />
            {loadingMore && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && allMovies.length > 0 && (
              <div className="flex flex-col items-center gap-2 text-zinc-500 py-10">
                <div className="h-1 w-12 bg-zinc-800 rounded-full" />
                <p className="text-sm">You've seen it all</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <BottomNav />

      {showQuestionnaire && (
        <MoodQuestionnaire onComplete={handleQuestionnaireComplete} onSkip={handleQuestionnaireSkip} />
      )}
    </main>
  )
}

export default function MoviePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 pb-28" />}>
      <MoviePageInner />
    </Suspense>
  )
}
