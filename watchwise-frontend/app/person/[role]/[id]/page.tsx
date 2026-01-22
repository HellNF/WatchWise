"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { getMoviesByPerson } from "@/lib/api"
import { ChevronLeft, Loader2, Clapperboard, User } from "lucide-react"

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

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getMoviesByPerson(role, personId, { limit: 80 })

        const mapped = data.map((item) => ({
          id: item.movieId,
          title: item.title,
          year: item.year,
          poster: item.posterPath,
          rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
        }))

        setMovies(mapped)
      } catch (err) {
        setError("Unable to load movies. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (personId) {
      fetchMovies()
    }
  }, [personId, role])

  const displayed = movies.slice(0, visibleCount)

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      <Header />

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Back Button */}
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

        {/* Page Header */}
        <div className="mb-10 flex flex-col gap-3">
          <Badge 
            variant="outline" 
            className="w-fit border-white/10 bg-white/5 text-zinc-400 uppercase tracking-widest text-[10px] gap-2 pl-2"
          >
            {isDirector ? <Clapperboard className="h-3 w-3" /> : <User className="h-3 w-3" />}
            Filmography
          </Badge>
          
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
              {personName}
            </h1>
            <p className="text-zinc-400 text-lg flex items-center gap-2">
              Movies {isDirector ? "Directed" : "Starring"} 
              <span className="text-zinc-600">•</span> 
              <span className="text-sm">{movies.length} titles found</span>
            </p>
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

            {visibleCount < movies.length && (
              <div className="flex justify-center mt-12">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 border-white/10 bg-zinc-900/60 hover:bg-white/10 hover:text-white transition-all shadow-lg"
                  onClick={() => setVisibleCount((count) => count + 12)}
                >
                  Load More Titles
                </Button>
              </div>
            )}
            
            {movies.length === 0 && (
              <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                <p className="text-zinc-500">No movies found for this person.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}