"use client"

import { useMemo, useState, useEffect } from "react"
import { Header } from "@/components/header"
import { HeroRecommendation, type HeroMovie } from "@/components/hero-recommendation"
import { AlternativeMovies, type AlternativeMovieItem } from "@/components/alternative-movies"
import { BottomNav } from "@/components/bottom-nav"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"

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

export default function HomePage() {
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [mounted, setMounted] = useState(false)
  const [heroMovie, setHeroMovie] = useState<HeroMovie | null>(null)
  const [alternatives, setAlternatives] = useState<AlternativeMovieItem[]>([])
  const [loadingMovies, setLoadingMovies] = useState(false)

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    []
  )
  const apiRoot = useMemo(
    () => (apiBase.endsWith("/api") ? apiBase : `${apiBase}/api`),
    [apiBase]
  )

  useEffect(() => {
    setMounted(true)
    // Check if we should show the questionnaire
    if (shouldShowQuestionnaire()) {
      // Small delay for smoother UX
      const timer = setTimeout(() => {
        setShowQuestionnaire(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const formatRuntime = (minutes?: number) => {
      if (!minutes) return undefined
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return h ? `${h}h ${m}m` : `${m}m`
    }

    const fetchMovies = async () => {
      setLoadingMovies(true)
      try {
        const normalizeMovieId = (value: string) =>
          value.includes(":") ? value.split(":").pop() ?? value : value
        const listResponse = await fetch(`${apiRoot}/movies/popular?limit=16`)
        if (!listResponse.ok) throw new Error("Failed to fetch movies")

        const list = (await listResponse.json()) as Array<{
          movieId: string
          title: string
          year?: number
          voteAverage: number
          posterPath?: string
        }>

        if (!list.length) return

        const [first, ...rest] = list
        const detailsResponse = await fetch(`${apiRoot}/movies/${first.movieId}`)
        if (!detailsResponse.ok) throw new Error("Failed to fetch movie details")

        const details = (await detailsResponse.json()) as {
          overview?: string
          duration?: number
          genres?: string[]
          director?: string
          directorId?: number
          directorImage?: string
          actorsDetailed?: { id?: number; name: string; image?: string }[]
        }

        setHeroMovie({
          id: normalizeMovieId(first.movieId),
          title: first.title,
          year: first.year,
          poster: first.posterPath,
          rating: Number.isFinite(first.voteAverage) ? first.voteAverage : undefined,
          runtime: formatRuntime(details.duration),
          genres: details.genres ?? [],
          description: details.overview,
          reasons: ["Popular right now"],
          director: details.director
            ? { id: details.directorId, name: details.director, image: details.directorImage }
            : undefined,
          cast: details.actorsDetailed ?? [],
        })

        const altItems: AlternativeMovieItem[] = rest.map((item, index) => ({
          id: normalizeMovieId(item.movieId),
          title: item.title,
          year: item.year,
          poster: item.posterPath,
          rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
          isDiscovery: index === rest.length - 1,
          reason: "Popular right now",
        }))

        setAlternatives(altItems)
      } catch (error) {
        console.error("Failed to load movies", error)
      } finally {
        setLoadingMovies(false)
      }
    }

    fetchMovies()
  }, [apiBase])

  const handleQuestionnaireComplete = (prefs: UserPreferences) => {
    setPreferences(prefs)
    setShowQuestionnaire(false)
    markQuestionnaireShown()
    // Store preferences for the session
    localStorage.setItem("watchwise-preferences", JSON.stringify(prefs))
  }

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false)
    markQuestionnaireShown()
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <main className="min-h-screen pb-28">
        <Header />
        <div className=" ">
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
      <div className="">
        <HeroRecommendation movie={heroMovie} />
        <AlternativeMovies movies={alternatives} />
      </div>
      <BottomNav />

      {/* Daily mood questionnaire */}
      {showQuestionnaire && (
        <MoodQuestionnaire onComplete={handleQuestionnaireComplete} onSkip={handleQuestionnaireSkip} />
      )}
    </main>
  )
}
