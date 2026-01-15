"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { ChevronLeft, Star, Clock, Play } from "lucide-react"

interface MovieDetailsResponse {
  movieId: string
  title: string
  year?: number
  rating?: number
  posterPath?: string
  overview?: string
  duration?: number
  genres?: string[]
  director?: string
  directorId?: number
  directorImage?: string
  actorsDetailed?: { id: number; name: string; image?: string }[]
}

interface StreamingAvailability {
  region: string
  platforms: { platform: string; type: "subscription" | "rent" | "buy" }[]
}

interface MovieImagesResponse {
  backdrops: { file_path: string; width: number; height: number }[]
  posters: { file_path: string; width: number; height: number }[]
  logos: { file_path: string; width: number; height: number }[]
}

interface MovieVideosResponse {
  results: {
    id: string
    key: string
    name: string
    site: string
    type: string
  }[]
}

interface WatchProvidersResponse {
  results: {
    [region: string]: {
      flatrate?: { provider_name: string; logo_path?: string }[]
      rent?: { provider_name: string; logo_path?: string }[]
      buy?: { provider_name: string; logo_path?: string }[]
    }
  }
}

interface MovieCandidateResponse {
  movieId: string
  title: string
  year?: number
  voteAverage: number
  posterPath?: string
}

export default function MovieDetailsPage() {
  const params = useParams()
  const movieId = String(params.id ?? "")

  const [details, setDetails] = useState<MovieDetailsResponse | null>(null)
  const [streaming, setStreaming] = useState<StreamingAvailability | null>(null)
  const [images, setImages] = useState<MovieImagesResponse | null>(null)
  const [videos, setVideos] = useState<MovieVideosResponse | null>(null)
  const [providers, setProviders] = useState<WatchProvidersResponse | null>(null)
  const [similar, setSimilar] = useState<MovieCandidateResponse[]>([])
  const [recommended, setRecommended] = useState<MovieCandidateResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
    []
  )
  const apiRoot = useMemo(
    () => (apiBase.endsWith("/api") ? apiBase : `${apiBase}/api`),
    [apiBase]
  )

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${apiRoot}/movies/${movieId}`)
        if (!response.ok) throw new Error("Failed to fetch details")
        const data = (await response.json()) as MovieDetailsResponse
        setDetails(data)

        const [streamingResponse, imagesResponse, videosResponse, providersResponse, similarResponse, recommendedResponse] =
          await Promise.all([
            fetch(`${apiRoot}/movies/${movieId}/streaming?region=IT`),
            fetch(`${apiRoot}/movies/${movieId}/images`),
            fetch(`${apiRoot}/movies/${movieId}/videos?language=it-IT`),
            fetch(`${apiRoot}/movies/${movieId}/watch-providers`),
            fetch(`${apiRoot}/movies/${movieId}/similar?limit=12`),
            fetch(`${apiRoot}/movies/${movieId}/recommendations?limit=12`),
          ])

        if (streamingResponse.ok) {
          const streamingData = (await streamingResponse.json()) as StreamingAvailability | null
          setStreaming(streamingData)
        }
        if (imagesResponse.ok) {
          const imagesData = (await imagesResponse.json()) as MovieImagesResponse
          setImages(imagesData)
        }
        if (videosResponse.ok) {
          const videosData = (await videosResponse.json()) as MovieVideosResponse
          setVideos(videosData)
        }
        if (providersResponse.ok) {
          const providersData = (await providersResponse.json()) as WatchProvidersResponse
          setProviders(providersData)
        }
        if (similarResponse.ok) {
          const similarData = (await similarResponse.json()) as MovieCandidateResponse[]
          setSimilar(similarData)
        }
        if (recommendedResponse.ok) {
          const recommendedData = (await recommendedResponse.json()) as MovieCandidateResponse[]
          setRecommended(recommendedData)
        }
      } catch {
        setError("Unable to load movie details.")
      } finally {
        setLoading(false)
      }
    }

    if (movieId) fetchDetails()
  }, [apiRoot, movieId])

  const runtime = details?.duration
    ? `${Math.floor(details.duration / 60)}h ${details.duration % 60}m`
    : undefined

  const formattedRating = typeof details?.rating === "number"
    ? details.rating.toFixed(1)
    : undefined

  const imageItems = useMemo(() => {
    const TMDB_IMAGE_BASE_BACKDROP = "https://image.tmdb.org/t/p/w1280"
    const TMDB_IMAGE_BASE_POSTER = "https://image.tmdb.org/t/p/w500"

    const backdrops = (images?.backdrops ?? []).map((item) => ({
      url: `${TMDB_IMAGE_BASE_BACKDROP}${item.file_path}`,
      type: "backdrop" as const,
    }))

    if (backdrops.length) return backdrops

    return (images?.posters ?? []).map((item) => ({
      url: `${TMDB_IMAGE_BASE_POSTER}${item.file_path}`,
      type: "poster" as const,
    }))
  }, [images])

  const providersEntry = providers?.results?.IT

  return (
    <main className="min-h-screen pb-28">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        {loading && (
          <p className="text-sm text-muted-foreground mt-4">Loading...</p>
        )}
        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}

        {details && !loading && !error && (
          <>
            <div className="relative mt-6">
              <div className="pointer-events-none absolute -top-12 right-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 left-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

              <div className="relative z-10 grid gap-8 lg:grid-cols-[320px_1fr]">
                <div className="space-y-6">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-border/30">
                    <img
                      src={details.posterPath || "/placeholder.svg"}
                      alt={details.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  

                  
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold">
                      {details.title}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {details.year && <span>{details.year}</span>}
                      {formattedRating && (
                        <span className="inline-flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          {formattedRating}
                        </span>
                      )}
                      {runtime && (
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {runtime}
                        </span>
                      )}
                    </div>
                    {details.genres?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {details.genres.map((genre) => (
                          <Badge key={genre} variant="secondary" className="rounded-full px-3 py-1">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {details.overview && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {details.overview}
                    </p>
                  )}

                  {providersEntry && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Watch providers</p>
                      <div className="space-y-3">
                        {providersEntry.flatrate?.length ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscription</p>
                            <div className="flex flex-wrap gap-2">
                              {providersEntry.flatrate.map((p) => (
                                <div
                                  key={`sub-${p.provider_name}`}
                                  className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs"
                                >
                                  {p.logo_path && (
                                    <img
                                      src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                      alt={p.provider_name}
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  )}
                                  <span>{p.provider_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {providersEntry.rent?.length ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rent</p>
                            <div className="flex flex-wrap gap-2">
                              {providersEntry.rent.map((p) => (
                                <div
                                  key={`rent-${p.provider_name}`}
                                  className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs"
                                >
                                  {p.logo_path && (
                                    <img
                                      src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                      alt={p.provider_name}
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  )}
                                  <span>{p.provider_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {providersEntry.buy?.length ? (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Buy</p>
                            <div className="flex flex-wrap gap-2">
                              {providersEntry.buy.map((p) => (
                                <div
                                  key={`buy-${p.provider_name}`}
                                  className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs"
                                >
                                  {p.logo_path && (
                                    <img
                                      src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                                      alt={p.provider_name}
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  )}
                                  <span>{p.provider_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {streaming?.platforms?.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Available on</p>
                      <div className="flex flex-wrap gap-2">
                        {streaming.platforms.map((item) => (
                          <Badge key={`${item.platform}-${item.type}`} variant="secondary">
                            {item.platform} · {item.type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="gap-2">
                      <Star className="h-4 w-4" />
                      Already seen
                    </Button>
                    <Button className="gap-2">
                      <Play className="h-4 w-4" />
                      I&apos;ll watch this
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {details.director && (
                    <div className="space-y-3 my-3">
                      <p className="text-xl font-semibold">Director</p>
                      {details.directorId ? (
                        <Link
                          href={`/person/director/${details.directorId}?name=${encodeURIComponent(details.director)}`}
                          className="flex items-center gap-5 rounded-2xl bg-card/40 p-4 hover:bg-card/60 transition"
                        >
                          <img
                            src={details.directorImage || "/placeholder.svg"}
                            alt={details.director}
                            className="h-20 w-20 rounded-full object-cover"
                          />
                          <span className="text-lg font-semibold">{details.director}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-5 rounded-2xl bg-card/40 p-4">
                          <img
                            src={details.directorImage || "/placeholder.svg"}
                            alt={details.director}
                            className="h-20 w-20 rounded-full object-cover"
                          />
                          <span className="text-lg font-semibold">{details.director}</span>
                        </div>
                      )}
                    </div>
                  )}

            {details.actorsDetailed?.length ? (
                    <div className="space-y-3">
                      <p className="text-xl font-semibold">Main cast</p>
                      <Carousel opts={{ align: "start" }} className="w-full">
                        <CarouselContent>
                          {details.actorsDetailed.map((actor) => (
                            <CarouselItem
                              key={actor.id}
                              className="basis-4/5 sm:basis-1/2 lg:basis-1/3"
                            >
                              <Link
                                href={`/person/actor/${actor.id}?name=${encodeURIComponent(actor.name)}`}
                                className="flex items-center gap-5 rounded-2xl bg-card/40 p-4 hover:bg-card/60 transition"
                              >
                                <img
                                  src={actor.image || "/placeholder.svg"}
                                  alt={actor.name}
                                  className="h-18 w-18 rounded-full object-cover"
                                />
                                <span className="text-base font-medium whitespace-normal break-words">
                                  {actor.name}
                                </span>
                              </Link>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                      </Carousel>
                    </div>
                  ) : null}

            {imageItems.length ? (
              <div className="mt-10 space-y-4">
                <h2 className="text-xl font-semibold">Gallery</h2>
                <Carousel opts={{ align: "start", loop: true }}>
                  <CarouselContent>
                    {imageItems.map((item, index) => (
                      <CarouselItem
                        key={`${item.type}-${index}`}
                        className="basis-full md:basis-1/2 lg:basis-1/3"
                      >
                        <div
                          className={
                            item.type === "backdrop"
                              ? "relative aspect-[16/9] rounded-xl overflow-hidden"
                              : "relative aspect-[2/3] rounded-xl overflow-hidden"
                          }
                        >
                          <img
                            src={item.url}
                            alt={details.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            ) : null}

            {videos?.results?.length ? (
              <div className="mt-10 space-y-4">
                <h2 className="text-xl font-semibold">Videos</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {videos.results.map((video) => (
                    <div key={video.id} className="space-y-2">
                      <p className="text-sm font-medium">{video.name}</p>
                      {video.site.toLowerCase() === "youtube" ? (
                        <div className="relative aspect-[16/9] rounded-xl overflow-hidden">
                          <iframe
                            src={`https://www.youtube.com/embed/${video.key}`}
                            title={video.name}
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <a
                          href={video.key}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Watch on {video.site}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(recommended.length || similar.length) ? (
              <div className="mt-12 space-y-8">
                {recommended.length ? (
                  <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Recommended</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {recommended.map((movie) => (
                        <MovieCard
                          key={movie.movieId}
                          id={movie.movieId}
                          title={movie.title}
                          poster={movie.posterPath}
                          year={movie.year}
                          rating={Number.isFinite(movie.voteAverage) ? movie.voteAverage : undefined}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {similar.length ? (
                  <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Similar titles</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {similar.map((movie) => (
                        <MovieCard
                          key={movie.movieId}
                          id={movie.movieId}
                          title={movie.title}
                          poster={movie.posterPath}
                          year={movie.year}
                          rating={Number.isFinite(movie.voteAverage) ? movie.voteAverage : undefined}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
