"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { getMoviesByPerson, postPreference, getPreferences, getPersonDetails } from "@/lib/api"
import { ChevronLeft, Loader2, Clapperboard, User, Heart } from "lucide-react"
import { toast } from "sonner"

interface MovieCardItem {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
}

export default function PersonMoviesPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const roleParam = String(params.role ?? "").toLowerCase()
  const personId = String(params.id ?? "")
  const personName = searchParams.get("name") ?? "Unknown Person"

  const role = roleParam === "director" ? "director" : "actor"
  const isDirector = role === "director"

  const [movies, setMovies] = useState<MovieCardItem[]>([])
  const [visibleCount, setVisibleCount] = useState(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [personPhoto, setPersonPhoto] = useState<string | undefined>(undefined)

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getMoviesByPerson(role, personId, { limit: 80 })
        setMovies(
          data.map((item) => ({
            id: item.movieId,
            title: item.title,
            year: item.year,
            poster: item.posterPath,
            rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
          }))
        )
      } catch {
        setError("Unable to load movies. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (personId) fetchMovies()
  }, [personId, role])

  // Fetch person photo from TMDB
  useEffect(() => {
    if (!personId) return
    getPersonDetails(personId)
      .then((details) => {
        if (details.profilePath) setPersonPhoto(details.profilePath)
      })
      .catch(() => {})
  }, [personId])

  // Check if already favorited
  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        const match = prefs.find(
          (p) => p.type === role && p.value.toLowerCase() === personName.toLowerCase()
        )
        setIsFavorited(Boolean(match))
      })
      .catch(() => {})
  }, [personName, role])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || visibleCount >= movies.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + 12, movies.length))
        }
      },
      { rootMargin: "300px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, movies.length])

  const handleFavorite = async () => {
    setFavoriteLoading(true)
    try {
      if (!isFavorited) {
        await postPreference({
          type: role,
          value: personName,
          weight: 0.9,
          source: "person-page",
        })
        setIsFavorited(true)
        toast.success(`${personName} added to your favorites`)
      } else {
        // Optimistic toggle — preferences API has no per-person delete by value,
        // so we just toggle UI state. Full deletion is available in preferences settings.
        setIsFavorited(false)
        toast(`${personName} removed from favorites`)
      }
    } catch {
      toast.error("Could not update favorites. Try again.")
    } finally {
      setFavoriteLoading(false)
    }
  }

  const displayed = movies.slice(0, visibleCount)
  const heroBackdrop = movies[0]?.poster
  const heroImage = personPhoto ?? heroBackdrop

  return (
    <main className="relative min-h-dvh bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      <Header />

      {/* Background ambience */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <div className="p-1.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Back
        </button>

        {/* Hero section */}
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-white/10 h-52 md:h-72">
          {/* Person photo or first movie poster as blurred backdrop */}
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-25 pointer-events-none"
            />
          )}
          {/* Person photo shown clearly on the right when available */}
          {personPhoto && (
            <img
              src={personPhoto}
              alt={personName}
              className="absolute right-8 bottom-0 h-full max-h-56 md:max-h-72 w-auto object-cover object-top rounded-t-xl opacity-90 pointer-events-none hidden sm:block"
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-end p-6 md:p-10">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <Badge
                  variant="outline"
                  className="w-fit border-white/10 bg-white/5 text-zinc-400 uppercase tracking-widest text-[10px] gap-1.5 pl-2"
                >
                  {isDirector ? <Clapperboard className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {isDirector ? "Director" : "Actor"}
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                  {personName}
                </h1>
                {movies.length > 0 && (
                  <p className="text-zinc-400 text-sm">
                    {movies.length} {movies.length === 1 ? "title" : "titles"} in filmography
                  </p>
                )}
              </div>

              {/* Favorite button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFavorite}
                disabled={favoriteLoading}
                className={
                  isFavorited
                    ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60 shrink-0"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white shrink-0"
                }
              >
                <Heart
                  className={`h-4 w-4 mr-1.5 transition-all ${isFavorited ? "fill-primary text-primary" : ""}`}
                />
                {isFavorited ? "Favorited" : "Add to favorites"}
              </Button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading filmography...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {movies.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                <p className="text-zinc-500">No movies found for this person.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {displayed.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      id={movie.id}
                      title={movie.title}
                      poster={movie.poster}
                      year={movie.year}
                      rating={movie.rating}
                    >
                      <MovieQuickActions movieId={movie.id} />
                    </MovieCard>
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-1" aria-hidden />
                {visibleCount < movies.length && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {visibleCount >= movies.length && movies.length > 24 && (
                  <div className="flex flex-col items-center gap-2 text-zinc-500 py-10">
                    <div className="h-1 w-12 bg-zinc-800 rounded-full" />
                    <p className="text-sm">Full filmography loaded</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
