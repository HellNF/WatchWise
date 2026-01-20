"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import { getMoviesByPerson } from "@/lib/api"
import { ChevronLeft } from "lucide-react"

interface MovieCardItem {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
}

export default function PersonMoviesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roleParam = String(params.role ?? "").toLowerCase()
  const personId = String(params.id ?? "")
  const personName = searchParams.get("name") ?? ""

  const role = roleParam === "director" ? "director" : "actor"

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
        setError("Impossibile caricare i film. Riprova.")
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
    <main className="min-h-screen pb-28">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-2xl font-semibold">
            {personName || "Film"} · {role === "director" ? "Regista" : "Attore"}
          </h1>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Caricamento film...</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayed.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  poster={movie.poster}
                  year={movie.year}
                  rating={movie.rating}
                />
              ))}
            </div>

            {visibleCount < movies.length && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((count) => count + 12)}
                >
                  Carica altri
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
