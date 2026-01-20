"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { HeroRecommendation, type HeroMovie } from "@/components/hero-recommendation"
import { AlternativeMovies, type AlternativeMovieItem } from "@/components/alternative-movies"
import { BottomNav } from "@/components/bottom-nav"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"
import { PodiumRow, type PodiumItem } from "@/components/podium-row"
import { Button } from "@/components/ui/button"
import {
  getMovieDetails,
  getMoviesByCategory,
  type MovieDetails,
  type MovieListItem,
  type MoviesCategory,
} from "@/lib/api"

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

const categoryConfig: Record<
  MoviesCategory,
  { label: string; reason: string }
> = {
  popular: {
    label: "Popular Movies",
    reason: "Popular right now",
  },
  now_playing: {
    label: "Now Playing",
    reason: "In theaters now",
  },
  top_rated: {
    label: "Top Rated",
    reason: "Highest rated",
  },
  trending: {
    label: "Trending",
    reason: "Trending now",
  },
  upcoming: {
    label: "Upcoming",
    reason: "Coming soon",
  },
}

export default function MoviePage() {
  const searchParams = useSearchParams()
  const rawCategory = searchParams.get("category")?.toLowerCase() ?? "popular"
  const categoryKey =
    rawCategory in categoryConfig
      ? (rawCategory as MoviesCategory)
      : "popular"
  const category = categoryConfig[categoryKey]

  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [heroMovie, setHeroMovie] = useState<HeroMovie | null>(null)
  const [alternatives, setAlternatives] = useState<AlternativeMovieItem[]>([])
  const [podiumItems, setPodiumItems] = useState<PodiumItem[]>([])
  const [allMovies, setAllMovies] = useState<MovieListItem[]>([])
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setMounted(true)
    if (shouldShowQuestionnaire()) {
      const timer = setTimeout(() => {
        setShowQuestionnaire(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    setAllMovies([])
    setPage(1)
    setHasMore(true)
  }, [categoryKey])

  useEffect(() => {
    const fetchMovies = async (pageToLoad: number, replace = false) => {
      try {
        if (pageToLoad > 1) setLoadingMore(true)

        const list = await getMoviesByCategory(categoryKey, {
          limit: 20,
          page: pageToLoad,
        })
        setHasMore(list.length >= 20)
        setPage(pageToLoad)

        setAllMovies((prev) => {
          const base = replace ? [] : prev
          const merged = [...base, ...list]
          const seen = new Set<string>()
          return merged.filter((item) => {
            const id = item.movieId
            if (seen.has(id)) return false
            seen.add(id)
            return true
          })
        })
      } catch (error) {
        console.error("Failed to load movies", error)
      } finally {
        setLoadingMore(false)
      }
    }

    fetchMovies(1, true)
  }, [categoryKey])

  useEffect(() => {
    const normalizeMovieId = (value: string) =>
      value.includes(":") ? value.split(":").pop() ?? value : value

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
  }

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false)
    markQuestionnaireShown()
  }

  if (!mounted) {
    return (
      <main className="min-h-screen pb-28">
        <Header />
        <div>
          <HeroRecommendation movie={heroMovie} />
          <AlternativeMovies movies={alternatives} />
        </div>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-28">
      <Header />
      <div>
        <HeroRecommendation movie={heroMovie} />
        <PodiumRow title={`${category.label} Podium`} items={podiumItems} />
        <AlternativeMovies movies={alternatives} />
        <div className="flex justify-center py-6">
          {hasMore ? (
            <Button
              onClick={() => {
                if (!loadingMore) {
                  const nextPage = page + 1
                  setPage(nextPage)
                  void (async () => {
                    try {
                      const list = await getMoviesByCategory(categoryKey, {
                        limit: 20,
                        page: nextPage,
                      })
                      setHasMore(list.length >= 20)
                      setAllMovies((prev) => {
                        const merged = [...prev, ...list]
                        const seen = new Set<string>()
                        return merged.filter((item) => {
                          const id = item.movieId
                          if (seen.has(id)) return false
                          seen.add(id)
                          return true
                        })
                      })
                    } catch (error) {
                      console.error("Failed to load more movies", error)
                    }
                  })()
                }
              }}
              disabled={loadingMore}
              variant="outline"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">No more results</p>
          )}
        </div>
      </div>
      <BottomNav />

      {showQuestionnaire && (
        <MoodQuestionnaire onComplete={handleQuestionnaireComplete} onSkip={handleQuestionnaireSkip} />
      )}
    </main>
  )
}
