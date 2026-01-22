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
import { 
  ChevronLeft, 
  Clock, 
  Plus, 
  CircleCheckBig, 
  Star, 
  PlayCircle, 
  Tv, 
  ShoppingBag, 
  CreditCard,
  Image as ImageIcon,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"

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

        if (streamingResult.status === "fulfilled") setStreaming(streamingResult.value)
        if (imagesResult.status === "fulfilled") setImages(imagesResult.value)
        if (videosResult.status === "fulfilled") setVideos(videosResult.value)
        if (providersResult.status === "fulfilled") setProviders(providersResult.value)
        if (similarResult.status === "fulfilled") setSimilar(similarResult.value)
        if (recommendedResult.status === "fulfilled") setRecommended(recommendedResult.value)
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
  // Default fallbacks if color extraction hasn't finished or failed
  const primaryColor = colors?.primary || "#7c3aed" // Violet default
  const accentColor = colors?.accent || "#2dd4bf" // Teal default

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

  const providersEntry = providers?.results?.IT // Or dynamic country code

  const handleAlreadySeen = async (rating: number) => {
    if (!movieId) return
    setSavingHistory(true)
    try {
      await postWatchHistory({ movieId, rating })
      setWatchEntry({ movieId, rating, completed: true })
      toast.success("Added to history")
    } finally {
      setSavingHistory(false)
    }
  }

  const ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const handleAddToList = async (listId?: string) => {
    if (!movieId || !listId) {
      setListError("Invalid list.")
      return
    }
    setSavingList(listId)
    try {
      await addListItem(listId, movieId)
      const listName = lists.find((list) => list.id === listId)?.name
      toast.success(listName ? `Added to ${listName}` : "Movie added to list")
    } finally {
      setSavingList(null)
    }
  }

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground pb-28 overflow-x-hidden selection:bg-white/20">
      <Header />

      {/* --- DYNAMIC BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      
      {/* Primary Glow (from poster) */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] opacity-20 pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: primaryColor }}
      />
      {/* Accent Glow */}
      <div 
        className="absolute top-[20%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[150px] opacity-10 pointer-events-none z-0 transition-colors duration-1000"
        style={{ backgroundColor: accentColor }}
      />

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

        {loading && <div className="text-zinc-500">Loading details...</div>}
        {error && <div className="text-red-400">{error}</div>}

        {details && !loading && !error && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* HERO SECTION */}
            <div className="grid gap-8 lg:grid-cols-[350px_1fr] mb-16">
              
              {/* Left Column: Poster */}
              <div className="space-y-6">
                <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                  <img
                    src={details.posterPath || "/placeholder.svg"}
                    alt={details.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Poster inner glow */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />
                </div>
              </div>

              {/* Right Column: Info & Actions */}
              <div className="flex flex-col justify-end pb-2">
                <div className="space-y-6">
                  
                  {/* Title & Tagline */}
                  <div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-2">
                      {details.title}
                    </h1>
                    {/* Generi */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {details.genres?.map((genre) => (
                        <Badge 
                          key={genre} 
                          variant="secondary" 
                          className="bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 rounded-md px-2 py-0.5"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Pills */}
                  <div className="flex flex-wrap gap-3">
                    {details.year && (
                      <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-zinc-200">
                        {details.year}
                      </div>
                    )}
                    {formattedRating && (
                      <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-amber-300 flex items-center gap-2">
                        <Star className="h-4 w-4 fill-amber-300" />
                        {formattedRating}
                      </div>
                    )}
                    {runtime && (
                      <div className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {runtime}
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  {details.overview && (
                    <div className="max-w-2xl">
                      <p className="text-base md:text-lg text-zinc-300 leading-relaxed font-medium">
                        {details.overview}
                      </p>
                    </div>
                  )}

                  {/* ACTION BAR */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    {/* Rate / Seen Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white text-zinc-200 gap-3 text-base"
                          disabled={savingHistory}
                        >
                          <CircleCheckBig className={cn("h-5 w-5", watchEntry ? "text-emerald-400" : "")} />
                          {savingHistory ? "Saving..." : watchEntry ? "Seen" : "Mark as Seen"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-white/10">
                        <DropdownMenuLabel className="text-zinc-400">Rate this movie</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {ratingOptions.map((value) => (
                            <DropdownMenuItem
                              key={`rating-${value}`}
                              onClick={() => handleAlreadySeen(value)}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <span className="flex items-center gap-2 w-full">
                                <span className="font-mono text-zinc-500 w-5">{value}</span>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: value }).map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                                  ))}
                                </div>
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Add to List Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="lg"
                          className="h-14 px-8 rounded-2xl text-white font-bold text-base shadow-lg shadow-primary/20 transition-transform hover:scale-105"
                          style={{
                            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                          }}
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add to List
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 bg-zinc-900 border-white/10 p-2">
                        <DropdownMenuLabel className="text-zinc-400 px-2">Choose a list</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10 mb-2" />
                        {listLoading ? (
                          <div className="px-2 py-2 text-sm text-zinc-500">Loading...</div>
                        ) : listError ? (
                          <div className="px-2 py-2 text-sm text-red-400">{listError}</div>
                        ) : lists.length ? (
                          <div className="space-y-1">
                            {lists.map((list) => (
                              <DropdownMenuItem
                                key={list.id}
                                onClick={() => handleAddToList(list.id)}
                                disabled={!list.id || savingList === list.id}
                                className="rounded-lg focus:bg-white/10 focus:text-white cursor-pointer py-3"
                              >
                                {list.name}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        ) : (
                          <div className="px-2 py-2 text-sm text-zinc-500">No lists available</div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* WATCH PROVIDERS (Chunky Glass) */}
                  {(providersEntry || streaming?.platforms?.length) && (
                    <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
                      <div className="space-y-4">
                        
                        {/* Stream / Flatrate */}
                        {(providersEntry?.flatrate?.length || streaming?.platforms?.length) && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                              <Tv className="h-3 w-3" /> Stream
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {providersEntry?.flatrate?.map((p) => (
                                <div key={p.provider_name} className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/20 transition-colors cursor-default">
                                  {p.logo_path && <img src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} className="h-5 w-5 rounded-full" alt="" />}
                                  {p.provider_name}
                                </div>
                              ))}
                              {streaming?.platforms?.map((item) => (
                                <Badge key={`${item.platform}-${item.type}`} variant="secondary" className="bg-emerald-500/10 text-emerald-100 border-emerald-500/20">
                                  {item.platform}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rent/Buy Group */}
                        {(providersEntry?.rent?.length || providersEntry?.buy?.length) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                            {providersEntry?.rent?.length ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                                  <CreditCard className="h-3 w-3" /> Rent
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {providersEntry.rent.map((p) => (
                                    <div key={`rent-${p.provider_name}`} className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2 py-1 text-[10px] text-blue-100">
                                      {p.provider_name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            
                            {providersEntry?.buy?.length ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
                                  <ShoppingBag className="h-3 w-3" /> Buy
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {providersEntry.buy.map((p) => (
                                    <div key={`buy-${p.provider_name}`} className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2 py-1 text-[10px] text-violet-100">
                                      {p.provider_name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* SECTIONS: Cast, Director, Media, Recs */}
            <div className="space-y-16">
              
              {/* 1. CAST & DIRECTOR CAROUSEL */}
              {(details.director || details.actorsDetailed?.length) && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="h-6 w-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold text-white">Cast & Crew</h2>
                  </div>
                  
                  <Carousel opts={{ align: "start" }} className="w-full">
                    <CarouselContent className="-ml-4">
                      {/* Director Card */}
                      {details.director && (
                        <CarouselItem className="pl-4 basis-[200px] md:basis-[240px]">
                          <Link href={`/person/director/${details.directorId}?name=${encodeURIComponent(details.director)}`} className="group block h-full">
                            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1">
                              <div className="mb-4 aspect-square rounded-full overflow-hidden border-2 border-white/5 group-hover:border-amber-500/50 transition-colors w-24 h-24 mx-auto">
                                <img
                                  src={details.directorImage || "/placeholder.svg"}
                                  alt={details.director}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="text-center">
                                <p className="font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">{details.director}</p>
                                <p className="text-xs text-amber-500/80 font-medium uppercase tracking-wider mt-1">Director</p>
                              </div>
                            </div>
                          </Link>
                        </CarouselItem>
                      )}

                      {/* Cast Cards */}
                      {details.actorsDetailed?.map((actor) => (
                        <CarouselItem key={actor.id} className="pl-4 basis-[160px] md:basis-[190px]">
                          <Link href={`/person/actor/${actor.id}?name=${encodeURIComponent(actor.name)}`} className="group block h-full">
                            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10 hover:-translate-y-1">
                              <div className="mb-4 aspect-square rounded-full overflow-hidden border-2 border-white/5 group-hover:border-white/20 transition-colors w-20 h-20 mx-auto grayscale group-hover:grayscale-0">
                                <img
                                  src={actor.image || "/placeholder.svg"}
                                  alt={actor.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="text-center">
                                <p className="font-medium text-zinc-200 group-hover:text-white transition-colors text-sm line-clamp-2">{actor.name}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">Actor</p>
                              </div>
                            </div>
                          </Link>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex -left-4 border-white/10 bg-black/50" />
                    <CarouselNext className="hidden md:flex -right-4 border-white/10 bg-black/50" />
                  </Carousel>
                </section>
              )}

              {/* 2. MEDIA GALLERY (Images & Videos) */}
              {(imageItems.length > 0 || videos?.results?.length) && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <ImageIcon className="h-6 w-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold text-white">Media</h2>
                  </div>

                  <div className="space-y-8">
                    {/* Images Carousel */}
                    {imageItems.length > 0 && (
                      <Carousel opts={{ align: "start", loop: true }}>
                        <CarouselContent className="-ml-4">
                          {imageItems.map((item, index) => (
                            <CarouselItem
                              key={`${item.type}-${index}`}
                              className={cn(
                                "pl-4",
                                item.type === "backdrop" ? "basis-[85%] md:basis-[60%]" : "basis-[40%] md:basis-[25%]"
                              )}
                            >
                              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-lg group">
                                <img
                                  src={item.url}
                                  alt="Gallery item"
                                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex -left-4 border-white/10 bg-black/50" />
                        <CarouselNext className="hidden md:flex -right-4 border-white/10 bg-black/50" />
                      </Carousel>
                    )}

                    {/* Videos Grid */}
                    {videos?.results?.length ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {videos.results.slice(0, 3).map((video) => (
                          <div key={video.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                            {video.site.toLowerCase() === "youtube" ? (
                              <div className="aspect-video relative">
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
                                className="flex h-32 items-center justify-center bg-zinc-900 text-zinc-400 hover:text-white"
                              >
                                <PlayCircle className="h-10 w-10 mb-2" />
                                Watch on {video.site}
                              </a>
                            )}
                            <div className="p-3 bg-zinc-900/80 backdrop-blur">
                              <p className="text-sm font-medium text-zinc-200 line-clamp-1">{video.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              )}

              {/* 3. RECOMMENDATIONS GRID */}
              {(recommended.length || similar.length) ? (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <Tv className="h-6 w-6 text-zinc-400" />
                    <h2 className="text-2xl font-bold text-white">More like this</h2>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[...recommended, ...similar]
                      .filter((v, i, a) => a.findIndex(t => (t.movieId === v.movieId)) === i) // Unique
                      .slice(0, 10)
                      .map((movie) => (
                      <MovieCard
                        key={movie.movieId}
                        id={movie.movieId}
                        title={movie.title}
                        poster={movie.posterPath}
                        year={movie.year}
                        rating={Number.isFinite(movie.voteAverage) ? movie.voteAverage : undefined}
                      >
                        <MovieQuickActions movieId={movie.movieId} />
                      </MovieCard>
                    ))}
                  </div>
                </section>
              ) : null}

            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}