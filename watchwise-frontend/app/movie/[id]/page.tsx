"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { extractColorsFromImage, type ExtractedColors } from "@/lib/color-extractor"
import {
  addListItem,
  getLists,
  getMovieDetails,
  getMovieImages,
  getMovieStreaming,
  getMovieVideos,
  getMovieWatchProviders,
  getRecommendedMovies,
  getSimilarMovies,
  getWatchHistory,
  postWatchHistory,
  type MovieDetails,
  type MovieImages,
  type MovieListItem,
  type MovieVideos,
  type StreamingAvailability,
  type UserList,
  type WatchHistoryEntry,
  type WatchProviders,
} from "@/lib/api"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { ChevronLeft, Clock, Plus, CircleCheckBig, Star } from "lucide-react"

export default function MovieDetailsPage() {
  const params = useParams()
  const movieId = String(params.id ?? "")
  const router = useRouter()

  const [details, setDetails] = useState<MovieDetails | null>(null)
  const [streaming, setStreaming] = useState<StreamingAvailability | null>(null)
  const [images, setImages] = useState<MovieImages | null>(null)
  const [videos, setVideos] = useState<MovieVideos | null>(null)
  const [providers, setProviders] = useState<WatchProviders | null>(null)
  const [similar, setSimilar] = useState<MovieListItem[]>([])
  const [recommended, setRecommended] = useState<MovieListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colors, setColors] = useState<ExtractedColors | null>(null)
  const [lists, setLists] = useState<UserList[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [savingList, setSavingList] = useState<string | null>(null)
  const [savingHistory, setSavingHistory] = useState(false)
  const [watchEntry, setWatchEntry] = useState<WatchHistoryEntry | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getMovieDetails(movieId)
        setDetails(data)

        const [streamingResult, imagesResult, videosResult, providersResult, similarResult, recommendedResult] =
          await Promise.allSettled([
            getMovieStreaming(movieId, "IT"),
            getMovieImages(movieId),
            getMovieVideos(movieId, "it-IT"),
            getMovieWatchProviders(movieId),
            getSimilarMovies(movieId, 12),
            getRecommendedMovies(movieId, 12),
          ])

        if (streamingResult.status === "fulfilled") {
          setStreaming(streamingResult.value)
        }
        if (imagesResult.status === "fulfilled") {
          setImages(imagesResult.value)
        }
        if (videosResult.status === "fulfilled") {
          setVideos(videosResult.value)
        }
        if (providersResult.status === "fulfilled") {
          setProviders(providersResult.value)
        }
        if (similarResult.status === "fulfilled") {
          setSimilar(similarResult.value)
        }
        if (recommendedResult.status === "fulfilled") {
          setRecommended(recommendedResult.value)
        }
      } catch {
        setError("Unable to load movie details.")
      } finally {
        setLoading(false)
      }
    }

    if (movieId) fetchDetails()
  }, [movieId])

  useEffect(() => {
    const loadLists = async () => {
      setListLoading(true)
      setListError(null)
      try {
        const data = await getLists()
        setLists(data)
      } catch {
        setListError("Unable to load lists.")
      } finally {
        setListLoading(false)
      }
    }

    if (movieId) {
      loadLists()
    }
  }, [movieId])

  useEffect(() => {
    const loadWatchHistory = async () => {
      if (!movieId) return
      try {
        const history = await getWatchHistory()
        const entry = history.find((item) => item.movieId === movieId) ?? null
        setWatchEntry(entry)
      } catch {
        setWatchEntry(null)
      }
    }

    loadWatchHistory()
  }, [movieId])

  const runtime = details?.duration
    ? `${Math.floor(details.duration / 60)}h ${details.duration % 60}m`
    : undefined

  const formattedRating = typeof details?.rating === "number"
    ? details.rating.toFixed(1)
    : undefined

  const poster = details?.posterPath || "/placeholder.svg"
  const primaryColor = colors?.primary || "var(--primary)"
  const accentColor = colors?.accent || "var(--accent)"

  useEffect(() => {
    extractColorsFromImage(poster).then(setColors)
  }, [poster])

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

  const handleAlreadySeen = async (rating: number) => {
    if (!movieId) return
    setSavingHistory(true)
    try {
      await postWatchHistory({ movieId, rating })
      setWatchEntry({ movieId, rating, completed: true })
      toast.success("Aggiunto alla watch history")
    } finally {
      setSavingHistory(false)
    }
  }

  const ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const handleAddToList = async (listId?: string) => {
    if (!movieId || !listId) {
      setListError("Invalid list. Please try again.")
      return
    }
    setSavingList(listId)
    try {
      await addListItem(listId, movieId)
      const listName = lists.find((list) => list.id === listId)?.name
      toast.success(
        listName
          ? `Aggiunto a ${listName}`
          : "Film aggiunto alla lista"
      )
    } finally {
      setSavingList(null)
    }
  }

  return (
    <main className="min-h-screen pb-28">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {loading && (
          <p className="text-sm text-muted-foreground mt-4">Loading...</p>
        )}
        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}

        {details && !loading && !error && (
          <>
            <div className="relative mt-6">
              <div
                className="pointer-events-none absolute -top-12 right-0 h-64 w-64 rounded-full blur-3xl"
                style={{ backgroundColor: `color-mix(in oklch, ${primaryColor} 30%, transparent)` }}
              />
              <div
                className="pointer-events-none absolute -bottom-10 left-0 h-72 w-72 rounded-full blur-3xl"
                style={{ backgroundColor: `color-mix(in oklch, ${accentColor} 30%, transparent)` }}
              />

              <div className="relative z-10 grid gap-8 lg:grid-cols-[320px_1fr]">
                <div className="space-y-6">
                  <div className="relative aspect-2/3 rounded-2xl overflow-hidden ring-1 ring-border/30">
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
                            <Star className="h-4 w-4" style={{ color: primaryColor }} />
                          {formattedRating}
                        </span>
                      )}
                      {runtime && (
                        <span className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4" style={{ color: primaryColor }} />
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="gap-2"
                          style={{ borderColor: `color-mix(in oklch, ${primaryColor} 40%, transparent)` }}
                          disabled={savingHistory}
                        >
                          <CircleCheckBig className="h-4 w-4" style={{ color: primaryColor }} />
                          {savingHistory
                            ? "Saving..."
                            : watchEntry
                              ? "Already in history"
                              : "Already seen"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuLabel>Rate this movie</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ratingOptions.map((value) => (
                          <DropdownMenuItem
                            key={`rating-${value}`}
                            onClick={() => handleAlreadySeen(value)}
                          >
                            <span className="flex items-center gap-2">
                              <Star className="h-4 w-4 fill-primary text-primary" />
                              {value} / 10
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          aria-label="Add to list"
                          style={{
                            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                            border: `1px solid color-mix(in oklch, ${primaryColor} 60%, transparent)`
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuLabel>Choose a list</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {listLoading ? (
                          <DropdownMenuItem disabled>Loading lists...</DropdownMenuItem>
                        ) : listError ? (
                          <DropdownMenuItem disabled>{listError}</DropdownMenuItem>
                        ) : lists.length ? (
                          lists.map((list, index) => (
                            <DropdownMenuItem
                              key={`${list.id ?? list.slug ?? list.name ?? "list"}-${index}`}
                              onClick={() => handleAddToList(list.id)}
                              disabled={!list.id || savingList === list.id}
                            >
                              {list.name}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No lists available</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                                <span className="text-base font-medium whitespace-normal wrap-break-word">
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
                              ? "relative aspect-video rounded-xl overflow-hidden"
                              : "relative aspect-2/3 rounded-xl overflow-hidden"
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
                        <div className="relative aspect-video rounded-xl overflow-hidden">
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
                          children={<MovieQuickActions movieId={movie.movieId} />}
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
                          children={<MovieQuickActions movieId={movie.movieId} />}
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

