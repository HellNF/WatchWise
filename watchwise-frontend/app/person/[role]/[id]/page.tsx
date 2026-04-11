"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import {
  postPreference,
  getPreferences,
  getPersonDetails,
  type PersonFullDetails,
  type PersonCreditItem,
} from "@/lib/api"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clapperboard,
  User,
  Heart,
  ExternalLink,
  Instagram,
  ChevronDown,
  ChevronUp,
  Tv,
  X,
  Maximize2,
  Star,
  Award,
  Trophy,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]
const deferredSectionStyle = {
  contentVisibility: "auto" as const,
  containIntrinsicSize: "900px",
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay },
  }),
}

type SortKey = "popularity" | "year" | "rating"

function sortCredits(items: PersonCreditItem[], key: SortKey): PersonCreditItem[] {
  const copy = [...items]
  if (key === "popularity") return copy.sort((a, b) => b.popularity - a.popularity)
  if (key === "year") return copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  if (key === "rating") return copy.sort((a, b) => b.voteAverage - a.voteAverage)
  return copy
}

type LightboxItem = {
  imageSrc: string
  thumbSrc?: string
  alt: string
  title: string
  subtitle?: string
  eyebrow?: string
  href?: string
  ctaLabel?: string
}

function ImmersiveLightbox({
  items,
  initialIndex,
  onClose,
}: {
  items: LightboxItem[]
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const activeItem = items[idx]
  
  const canGoPrev = idx > 0
  const canGoNext = idx < items.length - 1

  const showPrev = () => setIdx((c) => Math.max(0, c - 1))
  const showNext = () => setIdx((c) => Math.min(items.length - 1, c + 1))

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err))
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); showPrev() }
      if (event.key === "ArrowRight") { event.preventDefault(); showNext() }
      if (event.key === "Escape") { 
        event.preventDefault()
        if (isFullscreen) {
          document.exitFullscreen()
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, isFullscreen])

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] h-full w-full bg-black/95 text-white backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-6 sm:px-6">
        <div className="pointer-events-none absolute inset-0">
          <img
            src={activeItem.imageSrc}
            alt=""
            aria-hidden
            className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.18),transparent_28%),linear-gradient(180deg,rgba(4,7,17,0.5),rgba(4,7,17,0.88))]" />
          <div className="absolute inset-0 backdrop-blur-2xl" />
          <div className="absolute inset-0 bg-black/45" />
        </div>

        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-medium tracking-widest text-zinc-400">
            <span className="uppercase text-white">{activeItem.eyebrow ?? activeItem.title}</span>
            <span className="h-1 w-1 rounded-full bg-zinc-600" />
            <span>{idx + 1} / {items.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-white/15"
              aria-label="Toggle Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 hover:text-red-400"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrev}
              disabled={!canGoPrev}
              className="absolute left-2 sm:left-6 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-0"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={showNext}
              disabled={!canGoNext}
              className="absolute right-2 sm:right-6 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-0"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div className="relative flex w-full max-w-5xl flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.img
              key={idx}
              initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.04, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              src={activeItem.imageSrc}
              alt={activeItem.alt}
              className="relative z-10 max-h-[72vh] w-auto max-w-full rounded-[1.5rem] object-contain shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
            />
          </AnimatePresence>
        </div>

        <div className="relative z-20 mt-5 w-full max-w-5xl">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-[1.75rem] border border-white/10 bg-black/35 px-5 py-4 text-center backdrop-blur-xl">
            <div className="space-y-1">
              {activeItem.eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  {activeItem.eyebrow}
                </p>
              ) : null}
              <h3 className="text-xl font-semibold text-white sm:text-2xl">{activeItem.title}</h3>
              {activeItem.subtitle ? (
                <p className="text-sm text-zinc-300">{activeItem.subtitle}</p>
              ) : null}
            </div>
            {activeItem.href ? (
              <Link
                href={activeItem.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/14"
              >
                {activeItem.ctaLabel ?? "Open details"}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          {items.length > 1 && (
            <div className="mt-4 flex max-w-[90vw] gap-3 overflow-x-auto rounded-2xl bg-black/40 p-3 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((item, i) => (
                <button
                  key={`${item.imageSrc}-${i}`}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-xl transition-all duration-300 sm:h-20 sm:w-16 ${
                    i === idx
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black opacity-100 scale-105"
                      : "opacity-40 hover:opacity-100 hover:scale-105"
                  }`}
                  aria-label={`Open image ${i + 1}`}
                >
                  <Image
                    src={item.thumbSrc ?? item.imageSrc}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TvShowCard({ item }: { item: PersonCreditItem }) {
  return (
    <div className="group relative flex cursor-pointer select-none flex-col gap-2 text-left transition-transform hover:-translate-y-1">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800 shadow-md ring-1 ring-white/10 transition-all group-hover:ring-white/30 group-hover:shadow-violet-500/20">
        {item.posterPath ? (
          <Image
            src={item.posterPath}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 42vw, (max-width: 1024px) 24vw, 200px"
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
            <Tv className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Badge className="gap-1 border-0 bg-violet-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Tv className="h-3 w-3" />
            TV
          </Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="px-1">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-zinc-200 transition-colors group-hover:text-white">{item.title}</p>
        {item.year && <p className="mt-1 text-xs font-medium text-zinc-500">{item.year}</p>}
      </div>
    </div>
  )
}

function IconicMovieCard({
  movie,
  className = "",
  isFeatured = false,
  href,
}: {
  movie: PersonCreditItem
  className?: string
  isFeatured?: boolean
  href: string
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative ${className}`}
    >
      <div className="relative flex h-full w-full cursor-pointer select-none flex-col overflow-hidden rounded-[1.5rem] bg-zinc-900 text-left shadow-lg ring-1 ring-white/10 transition-all hover:ring-amber-500/50 hover:shadow-[0_0_25px_rgba(229,177,17,0.25)]">
        <Link href={href} className="absolute inset-0 z-10" aria-label={`Open ${movie.title} details`} />
        <Image
          src={movie.posterPath || ""}
          alt={movie.title}
          fill
          sizes={isFeatured ? "(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 420px" : "(max-width: 640px) 44vw, (max-width: 1024px) 24vw, 220px"}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/30 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

        {isFeatured && (
          <div className="absolute top-4 left-4 z-10">
            <Badge className="border-0 bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black backdrop-blur-md shadow-lg">
              <Award className="mr-1 h-3.5 w-3.5" /> Iconic Role
            </Badge>
          </div>
        )}

        <div className={`absolute inset-x-0 bottom-0 ${isFeatured ? 'p-5 lg:p-6' : 'p-4'}`}>
          <h3 className={`font-bold leading-tight text-white transition-colors group-hover:text-amber-400 ${isFeatured ? 'text-2xl lg:text-3xl' : 'text-sm line-clamp-2'}`}>
            {movie.title}
          </h3>
          <div className={`mt-1.5 flex items-center gap-3 font-medium text-zinc-300 ${isFeatured ? 'text-sm' : 'text-xs'}`}>
            {movie.year && <span>{movie.year}</span>}
            <span className="flex items-center gap-1 text-amber-400">
              <Star className={`fill-amber-400 ${isFeatured ? 'h-4 w-4' : 'h-3 w-3'}`} /> {movie.voteAverage.toFixed(1)}
            </span>
          </div>
        </div>
        
        <div
          className="absolute bottom-3 right-3 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <MovieQuickActions movieId={String(movie.id)} />
        </div>
      </div>
    </motion.div>
  )
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

  const [details, setDetails] = useState<PersonFullDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [personImageLightboxIndex, setPersonImageLightboxIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"movies" | "tv">("movies")
  const [sortKey, setSortKey] = useState<SortKey>("popularity")
  const [visibleCount, setVisibleCount] = useState(24)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!personId) return
    setLoading(true)
    setError(null)
    getPersonDetails(personId)
      .then((data) => setDetails(data))
      .catch(() => setError("Unable to load person details. Please try again."))
      .finally(() => setLoading(false))
  }, [personId])

  const resolvedPersonName = details?.name ?? personName

  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        const match = prefs.find(
          (p) => p.type === role && p.value.toLowerCase() === resolvedPersonName.toLowerCase()
        )
        setIsFavorited(Boolean(match))
      })
      .catch(() => {})
  }, [resolvedPersonName, role])

  const currentCredits = sortCredits(
    activeTab === "movies" ? details?.movieCredits ?? [] : details?.tvCredits ?? [],
    sortKey
  )

  useEffect(() => {
    setVisibleCount(24)
  }, [activeTab, sortKey, details?.id])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || visibleCount >= currentCredits.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + 12, currentCredits.length))
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, currentCredits.length])

  const handleFavorite = async () => {
    setFavoriteLoading(true)
    try {
      if (!isFavorited) {
        await postPreference({ type: role, value: resolvedPersonName, weight: 0.9, source: "person-page" })
        setIsFavorited(true)
        toast.success(`${resolvedPersonName} added to your favorites`)
      } else {
        setIsFavorited(false)
        toast(`${resolvedPersonName} removed from favorites`)
      }
    } catch {
      toast.error("Could not update favorites. Try again.")
    } finally {
      setFavoriteLoading(false)
    }
  }

  const heroImage = details?.profilePath ?? details?.images[0]?.filePath
  const knownFor = sortCredits(details?.movieCredits ?? [], "popularity")
    .filter((item) => Boolean(item.posterPath))
    .slice(0, 5)
  const displayedCredits = currentCredits.slice(0, visibleCount)
  const personGalleryItems: LightboxItem[] = (details?.images ?? []).map((image, index) => ({
    imageSrc: image.filePath,
    thumbSrc: image.filePath,
    alt: `${details?.name ?? personName} photo ${index + 1}`,
    title: details?.name ?? personName,
    subtitle: "Portrait gallery",
    eyebrow: "Artist photo",
  }))

  const formatDate = (iso?: string) => {
    if (!iso) return undefined
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }
  const formatYear = (iso?: string) => {
    if (!iso) return undefined
    const year = new Date(iso).getFullYear()
    return Number.isFinite(year) ? String(year) : undefined
  }

  const heroSubtitle = [
    details?.knownForDepartment,
    formatYear(details?.birthday) ? `Born in ${formatYear(details?.birthday)}` : undefined,
  ].filter(Boolean).join(" • ")

  const heroHighlights = details?.heroHighlights ?? []
  const hasAwardHighlights = heroHighlights.some((highlight) => highlight.source === "wikidata_award")

  const profileFacts = [
    details?.knownForDepartment ? { label: "Known For", value: details.knownForDepartment } : null,
    details?.birthday ? { label: "Date of Birth", value: formatDate(details.birthday) as string } : null,
    details?.deathday ? { label: "Date of Death", value: formatDate(details.deathday) as string } : null,
    details?.placeOfBirth ? { label: "Place of Birth", value: details.placeOfBirth } : null,
    details?.gender ? { label: "Gender", value: details.gender } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#07090E] pb-28 text-foreground selection:bg-violet-500/30">
      <Header />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/noise.svg')] opacity-[0.15] mix-blend-overlay" />
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] z-0 h-[600px] w-[600px] animate-pulse rounded-full bg-violet-600/15 blur-[150px] mix-blend-screen duration-[8000ms]" />
      <div className="pointer-events-none fixed top-[20%] right-[-5%] z-0 h-[500px] w-[500px] animate-pulse rounded-full bg-[#e5b111]/10 blur-[120px] mix-blend-screen duration-[6000ms]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[20%] z-0 h-[400px] w-[400px] rounded-full bg-pink-500/10 blur-[130px] mix-blend-screen" />
      
      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Back
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm tracking-wide">Loading...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-sm text-red-400 backdrop-blur-sm">
            {error}
          </div>
        )}

        {!loading && !error && details && (
          <>
            {/* HERO SECTION */}
            <motion.section
              className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl ring-1 ring-white/5"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
            >
              {heroImage && (
                <div className="pointer-events-none absolute inset-0 hidden lg:block">
                  <Image
                    src={heroImage}
                    alt=""
                    aria-hidden
                    fill
                    priority
                    sizes="100vw"
                    className="scale-110 object-cover blur-3xl opacity-30 mix-blend-screen"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/85 to-transparent lg:to-[#07090E]/30" />

              <div className="relative grid min-h-[22rem] gap-8 p-6 sm:p-8 md:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-12 lg:p-12 xl:gap-20">
                <div className="flex min-w-0 flex-col justify-center gap-8">
                  <div className="flex flex-col gap-4">
                    <Badge className="w-fit gap-1.5 border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-200 backdrop-blur-md">
                      {isDirector ? <Clapperboard className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      {isDirector ? "Director" : "Actor"}
                    </Badge>
                    
                    <div className="flex items-start justify-between gap-4 lg:block">
                      <div className="min-w-0">
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-tight">
                          {details.name}
                        </h1>
                        {heroSubtitle && (
                          <p className="mt-2 text-base font-medium text-zinc-400">{heroSubtitle}</p>
                        )}
                      </div>

                      {heroImage && (
                        <button
                          type="button"
                          onClick={() => setPersonImageLightboxIndex(0)}
                          className="relative h-24 w-20 shrink-0 overflow-hidden lg:hidden"
                          aria-label={`Open ${details.name} photo`}
                        >
                          <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-t-full rounded-b-2xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl" />
                          <div className="absolute inset-0 bg-violet-600/25 blur-[16px]" />
                          <Image
                            src={heroImage}
                            alt={details.name}
                            fill
                            priority
                            sizes="80px"
                            className="relative rounded-t-full rounded-b-2xl object-cover object-top shadow-xl ring-1 ring-white/20 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 rounded-t-full rounded-b-2xl bg-black/0 transition-colors duration-300 hover:bg-black/10" />
                        </button>
                      )}
                    </div>

                    {/* MIGLIORAMENTO AWARDS & RECOGNITIONS */}
                    {heroHighlights.length > 0 && (
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            {hasAwardHighlights ? "Notable Awards & Highlights" : "Career Highlights"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {heroHighlights.map((highlight, index) => {
                            const isAward = highlight.source === "wikidata_award"
                            return (
                              <motion.div
                                key={highlight.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1, duration: 0.4, type: "spring" }}
                                whileHover={{ y: -2, scale: 1.02 }}
                                className={`group relative flex cursor-default items-center gap-3 overflow-hidden rounded-2xl border p-1.5 pr-4 transition-all backdrop-blur-md ${
                                  isAward
                                    ? "border-amber-500/20 bg-amber-500/10 hover:border-amber-500/40 hover:bg-amber-500/20 hover:shadow-[0_4px_20px_-5px_rgba(245,158,11,0.3)]"
                                    : "border-violet-500/20 bg-violet-500/10 hover:border-violet-500/40 hover:bg-violet-500/20 hover:shadow-[0_4px_20px_-5px_rgba(139,92,246,0.3)]"
                                }`}
                              >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-inner ${
                                  isAward ? "bg-amber-500/20 text-amber-400" : "bg-violet-500/20 text-violet-300"
                                }`}>
                                  {isAward ? <Trophy className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                                </div>
                                <span className="text-xs font-semibold tracking-wide text-zinc-200 transition-colors group-hover:text-white">
                                  {highlight.label}
                                </span>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      {details.imdbId && (
                        <a href={`https://www.imdb.com/name/${details.imdbId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#e5b111]/10 px-3 py-1.5 text-xs font-semibold text-[#e5b111] transition-colors hover:bg-[#e5b111]/20">
                          <ExternalLink className="h-3.5 w-3.5" /> IMDb
                        </a>
                      )}
                      {details.instagramId && (
                        <a href={`https://www.instagram.com/${details.instagramId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-400 transition-colors hover:bg-pink-500/20">
                          <Instagram className="h-3.5 w-3.5" /> Instagram
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <Button
                      size="lg"
                      onClick={handleFavorite}
                      disabled={favoriteLoading}
                      className={`h-12 w-full gap-2 rounded-xl text-base font-medium transition-all sm:w-auto sm:px-8 ${
                        isFavorited
                          ? "border border-violet-500/30 bg-violet-600/20 text-violet-300 hover:bg-violet-600/30"
                          : "bg-white text-black hover:bg-zinc-200"
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${isFavorited ? "fill-violet-400 text-violet-400" : ""}`} />
                      {isFavorited ? "Saved to Favorites" : "Add to Favorites"}
                    </Button>
                  </div>
                </div>

                {/* Foto Desktop a forma di Arco */}
                {heroImage && (
                  <button
                    type="button"
                    onClick={() => setPersonImageLightboxIndex(0)}
                    className="relative hidden w-full min-w-[220px] max-w-[280px] shrink-0 justify-self-center lg:block lg:h-[360px] xl:h-[400px]"
                    aria-label={`Open ${details.name} photo`}
                  >
                    <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-t-full rounded-b-[3rem] border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl" />
                    <div className="absolute inset-0 bg-violet-600/20 blur-[50px]" />
                    <Image
                      src={heroImage}
                      alt={details.name}
                      fill
                      priority
                      sizes="(max-width: 1280px) 280px, 320px"
                      className="relative rounded-t-full rounded-b-[3rem] object-cover shadow-2xl ring-1 ring-white/20 transition-transform duration-500 hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 rounded-t-full rounded-b-[3rem] bg-black/0 transition-colors duration-300 hover:bg-black/10" />
                  </button>
                )}
              </div>
            </motion.section>

            {/* MAIN CONTENT GRID */}
            <motion.div
              className="mb-12 grid gap-8 xl:grid-cols-[1fr_340px]"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.1}
              style={deferredSectionStyle}
            >
              <div className="space-y-8">
                {/* BIOGRAPHY */}
                {details.biography && (
                  <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 sm:p-8">
                    <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Full Biography</h2>
                    <div 
                      className={`relative overflow-hidden transition-all duration-500 ${bioExpanded ? 'max-h-[2000px]' : 'max-h-[120px]'}`}
                      style={{ 
                        WebkitMaskImage: bioExpanded ? 'none' : 'linear-gradient(to bottom, black 40%, transparent 100%)',
                        maskImage: bioExpanded ? 'none' : 'linear-gradient(to bottom, black 40%, transparent 100%)'
                      }}
                    >
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-zinc-300">
                        {details.biography}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setBioExpanded(!bioExpanded)}
                      className="relative z-10 mt-3 flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300"
                    >
                      {bioExpanded ? (
                        <><ChevronUp className="h-4 w-4" /> Show less</>
                      ) : (
                        <><ChevronDown className="h-4 w-4" /> Read more</>
                      )}
                    </button>
                  </section>
                )}

                {/* KNOWN FOR GRID - Bento Box Asimmetrico allineato con la sidebar */}
                {knownFor.length > 0 && (
                  <section style={deferredSectionStyle}>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Curated Showcase</h2>
                      <p className="text-xs text-zinc-500">Tap a poster to open the film details</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:auto-rows-[165px] lg:gap-4">
                      {knownFor.map((movie, index) => {
                        const isFeatured = index === 0
                        return (
                          <IconicMovieCard 
                            key={movie.id} 
                            movie={movie} 
                            isFeatured={isFeatured}
                            href={`/movie/${encodeURIComponent(String(movie.id))}`}
                            className={
                              isFeatured
                                ? "col-span-2 aspect-[2/3] md:col-span-2 md:row-span-2 md:aspect-auto"
                                : "aspect-[2/3] md:aspect-auto"
                            }
                          />
                        )
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* SIDEBAR */}
              <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                {/* GALLERY THUMBNAILS */}
                {details.images.length > 0 && (
                  <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6" style={deferredSectionStyle}>
                    <div className="mb-5 flex items-end justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Gallery</h2>
                      <button onClick={() => setPersonImageLightboxIndex(0)} className="text-xs font-medium text-violet-400 hover:text-violet-300">
                        See all
                      </button>
                    </div>
                    <div className="grid auto-rows-[90px] grid-cols-3 gap-2">
                      {details.images.slice(0, 5).map((image, index) => (
                        <button
                          key={`${image.filePath}-${index}`}
                          onClick={() => setPersonImageLightboxIndex(index)}
                          className={`group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-all hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] ${
                            index === 0 ? "col-span-2 row-span-2" : ""
                          }`}
                        >
                          <Image
                            src={image.filePath}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 28vw, 120px"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* FACTS */}
                {profileFacts.length > 0 && (
                  <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6" style={deferredSectionStyle}>
                    <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">At a glance</h2>
                    <div className="space-y-4">
                      {profileFacts.map((fact) => (
                        <div key={fact.label} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{fact.label}</p>
                          <p className="mt-1 text-sm font-medium text-zinc-200">{fact.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total credits</p>
                        <p className="mt-0.5 text-xs font-medium text-zinc-400">Movies & TV</p>
                      </div>
                      <p className="text-3xl font-bold text-white">
                        {details.movieCredits.length + details.tvCredits.length}
                      </p>
                    </div>
                  </section>
                )}
              </aside>
            </motion.div>

            {/* LIGHTBOX PORTAL */}
            {personImageLightboxIndex !== null && personGalleryItems.length > 0 && (
              <ImmersiveLightbox
                items={personGalleryItems}
                initialIndex={personImageLightboxIndex}
                onClose={() => setPersonImageLightboxIndex(null)}
              />
            )}

            {/* FILMOGRAPHY SECTION */}
            <motion.section
              className="border-t border-white/5 pt-10"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.2}
              style={deferredSectionStyle}
            >
              <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Filmography</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Works & Appearances</h2>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
                    <button
                      onClick={() => setActiveTab("movies")}
                      className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                        activeTab === "movies" ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Movies <span className="ml-1 opacity-50">({details.movieCredits.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("tv")}
                      className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                        activeTab === "tv" ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      TV Series <span className="ml-1 opacity-50">({details.tvCredits.length})</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
                    {(["popularity", "year", "rating"] as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSortKey(key)}
                        className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                          sortKey === key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        {key === "popularity" ? "Popular" : key === "year" ? "Recent" : "Rating"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {currentCredits.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
                  <Clapperboard className="mb-4 h-12 w-12 text-zinc-700" />
                  <p className="text-lg font-medium text-zinc-400">No titles found.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {displayedCredits.map((item) =>
                      activeTab === "tv" ? (
                        <TvShowCard key={`tv-${item.id}`} item={item} />
                      ) : (
                        <MovieCard
                          key={`movie-${item.id}`}
                          id={String(item.id)}
                          title={item.title}
                          poster={item.posterPath}
                          year={item.year}
                          rating={item.voteAverage}
                        >
                          <MovieQuickActions movieId={String(item.id)} />
                        </MovieCard>
                      )
                    )}
                  </div>

                  <div ref={sentinelRef} className="h-1" aria-hidden />
                  {visibleCount < currentCredits.length && (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                    </div>
                  )}
                  {visibleCount >= currentCredits.length && currentCredits.length > 24 && (
                    <div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
                      <div className="h-1 w-16 rounded-full bg-white/10" />
                      <p className="text-xs font-semibold uppercase tracking-widest">End of filmography</p>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
