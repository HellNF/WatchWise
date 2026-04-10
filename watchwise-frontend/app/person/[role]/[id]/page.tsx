"use client"

import { useEffect, useRef, useState, type MouseEvent } from "react"
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
} from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]

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

function GalleryLightbox({
  images,
  initialIndex,
  personName,
  onClose,
}: {
  images: PersonFullDetails["images"]
  initialIndex: number
  personName: string
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canGoPrev = idx > 0
  const canGoNext = idx < images.length - 1

  const showPrev = () => {
    setIdx((current) => (current > 0 ? current - 1 : current))
  }

  const showNext = () => {
    setIdx((current) => (current < images.length - 1 ? current + 1 : current))
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        showPrev()
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        showNext()
      }
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (dialog.open) dialog.close()
    }
  }, [onClose])

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fixed inset-0 m-0 h-full w-full max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-[rgba(7,13,28,0.88)]"
    >
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-6 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(58,91,158,0.35),transparent_38%),radial-gradient(circle_at_bottom,rgba(10,26,64,0.78),rgba(5,7,14,0.96))]" />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrev}
              disabled={!canGoPrev}
              className="absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-35 sm:left-6 sm:h-12 sm:w-12"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              disabled={!canGoNext}
              className="absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-35 sm:right-6 sm:h-12 sm:w-12"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
          aria-label="Close photo viewer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between px-1 text-xs uppercase tracking-[0.2em] text-zinc-300 sm:text-sm">
            <span>{personName}</span>
            <span>{idx + 1} / {images.length}</span>
          </div>

          <div className="relative flex max-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/25 shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-sm">
            <img
              src={images[idx].filePath}
              alt={`${personName} photo ${idx + 1}`}
              className="max-h-[78vh] w-auto max-w-full object-contain"
            />
          </div>

          {images.length > 1 && (
            <div className="flex max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, i) => (
                <button
                  key={image.filePath}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-2xl border transition-all sm:h-20 sm:w-14 ${
                    i === idx
                      ? "border-white/70 opacity-100"
                      : "border-white/10 opacity-55 hover:border-white/30 hover:opacity-85"
                  }`}
                  aria-label={`Open photo ${i + 1}`}
                >
                  <img
                    src={image.filePath}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}

function TvShowCard({ item }: { item: PersonCreditItem }) {
  return (
    <div className="group relative flex cursor-default select-none flex-col gap-2 text-left">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800">
        {item.posterPath ? (
          <img
            src={item.posterPath}
            alt={item.title}
            className="h-full w-full object-cover opacity-70"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-600">
            <Tv className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <Badge className="gap-1 border-0 bg-violet-600/80 px-1.5 py-0.5 text-[10px] text-white">
            <Tv className="h-2.5 w-2.5" />
            TV
          </Badge>
        </div>
      </div>
      <div className="px-0.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-zinc-300">{item.title}</p>
        {item.year && <p className="mt-0.5 text-[11px] text-zinc-500">{item.year}</p>}
      </div>
    </div>
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
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
        await postPreference({
          type: role,
          value: resolvedPersonName,
          weight: 0.9,
          source: "person-page",
        })
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
  const knownFor = sortCredits(details?.movieCredits ?? [], "popularity").slice(0, 6)
  const displayedCredits = currentCredits.slice(0, visibleCount)

  const formatDate = (iso?: string) => {
    if (!iso) return undefined
    return new Date(iso).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatYear = (iso?: string) => {
    if (!iso) return undefined
    const year = new Date(iso).getFullYear()
    return Number.isFinite(year) ? String(year) : undefined
  }

  const heroSubtitle = [
    details?.knownForDepartment,
    formatYear(details?.birthday) ? `Born ${formatYear(details?.birthday)}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ")

  const profileFacts = [
    details?.knownForDepartment ? { label: "Known for", value: details.knownForDepartment } : null,
    details?.birthday ? { label: "Birthday", value: formatDate(details.birthday) as string } : null,
    details?.deathday ? { label: "Died", value: formatDate(details.deathday) as string } : null,
    details?.placeOfBirth ? { label: "Place of birth", value: details.placeOfBirth } : null,
    details?.gender ? { label: "Gender", value: details.gender } : null,
    details?.alsoKnownAs.length
      ? { label: "Also known as", value: details.alsoKnownAs.join(", ") }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <main className="relative min-h-dvh bg-zinc-950 pb-28 text-foreground selection:bg-violet-500/30">
      <Header />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      <div className="pointer-events-none fixed right-[-22%] top-[-12%] z-0 h-[360px] w-[360px] rounded-full bg-violet-600/10 blur-[110px] opacity-35 sm:right-[-10%] sm:top-[-10%] sm:h-[600px] sm:w-[600px] sm:blur-[150px] sm:opacity-40" />
      <div className="pointer-events-none fixed bottom-[-6%] left-[-18%] z-0 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-[100px] opacity-25 sm:bottom-0 sm:left-0 sm:h-[500px] sm:w-[500px] sm:blur-[150px] sm:opacity-30" />

      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <div className="rounded-full border border-white/10 bg-white/5 p-1.5 group-hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </div>
          Back
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="mb-4 h-8 w-8 animate-spin" />
            <p>Loading person details...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && details && (
          <>
            <motion.section
              className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
            >
              {heroImage && (
                <img
                  src={heroImage}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute inset-0 h-full w-full scale-[1.18] object-cover blur-2xl opacity-25"
                />
              )}
              {heroImage && (
                <>
                  <img
                    src={heroImage}
                    alt={details.name}
                    className="pointer-events-none absolute bottom-0 right-6 hidden h-[92%] w-auto object-cover object-top opacity-95 lg:block"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-gradient-to-l from-zinc-950/10 via-zinc-950/30 to-zinc-950/92 lg:block" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/82 to-zinc-950/38" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-transparent to-transparent" />

              <div className="relative grid min-h-[24rem] gap-8 p-5 sm:p-6 md:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)] lg:p-10">
                <div className="flex min-w-0 flex-col justify-between gap-8">
                  <div className="flex items-start justify-between gap-4 lg:block">
                    <div className="flex min-w-0 flex-col gap-3">
                      <Badge
                        variant="outline"
                        className="w-fit gap-1.5 border-white/10 bg-white/5 pl-2 text-[10px] uppercase tracking-[0.22em] text-zinc-300"
                      >
                        {isDirector ? <Clapperboard className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {isDirector ? "Director" : "Actor"}
                      </Badge>
                      <h1 className="max-w-2xl text-4xl font-semibold leading-[0.94] tracking-[-0.055em] text-white sm:text-5xl xl:text-6xl">
                        {details.name}
                      </h1>
                      {heroSubtitle && (
                        <p className="text-sm text-zinc-400">{heroSubtitle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                        {details.imdbId && (
                          <a
                            href={`https://www.imdb.com/name/${details.imdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-amber-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                            IMDB
                          </a>
                        )}
                        {details.instagramId && (
                          <a
                            href={`https://www.instagram.com/${details.instagramId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-pink-400"
                          >
                            <Instagram className="h-3 w-3" />
                            Instagram
                          </a>
                        )}
                      </div>
                    </div>

                    {heroImage && (
                      <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/5 shadow-[0_14px_34px_rgba(0,0,0,0.25)] lg:hidden">
                        <img
                          src={heroImage}
                          alt={details.name}
                          className="h-full w-full object-cover object-top"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFavorite}
                      disabled={favoriteLoading}
                      className={
                        isFavorited
                          ? "h-11 w-full border-primary/40 bg-primary/10 px-5 text-primary hover:border-primary/60 hover:bg-primary/20 sm:w-auto"
                          : "h-11 w-full border-white/10 bg-white/5 px-5 text-zinc-200 hover:bg-white/10 hover:text-white sm:w-auto"
                      }
                    >
                      <Heart
                        className={`mr-1.5 h-4 w-4 transition-all ${isFavorited ? "fill-primary text-primary" : ""}`}
                      />
                      {isFavorited ? "Favorited" : "Add to favorites"}
                    </Button>
                  </div>
                </div>

                <div className="hidden lg:block" />
              </div>
            </motion.section>

            <motion.div
              className="mb-10 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.1}
            >
              <div className="space-y-8">
                {details.biography && (
                  <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:p-7">
                    <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-zinc-500">Biography</p>
                    <p
                      className={`whitespace-pre-line text-[15px] leading-7 text-zinc-300 ${
                        bioExpanded ? "" : "line-clamp-[10]"
                      }`}
                    >
                      {details.biography}
                    </p>
                    <button
                      type="button"
                      onClick={() => setBioExpanded((value) => !value)}
                      className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {bioExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Read more
                        </>
                      )}
                    </button>
                  </section>
                )}

                {knownFor.length > 0 && (
                  <section>
                    <p className="mb-5 text-[11px] uppercase tracking-[0.22em] text-zinc-500">Known for</p>
                    <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {knownFor.map((movie) => (
                        <div key={movie.id} className="w-36 shrink-0">
                          <MovieCard
                            id={String(movie.id)}
                            title={movie.title}
                            poster={movie.posterPath}
                            year={movie.year}
                            rating={movie.voteAverage}
                          >
                            <MovieQuickActions movieId={String(movie.id)} />
                          </MovieCard>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                {profileFacts.length > 0 && (
                  <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">At a glance</p>
                    <div className="mt-5 space-y-4">
                      {profileFacts.map((fact) => (
                        <div key={fact.label} className="border-b border-white/6 pb-4 last:border-b-0 last:pb-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{fact.label}</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-200">{fact.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Filmography</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
                        {details.movieCredits.length + details.tvCredits.length}
                      </p>
                      <p className="text-xs text-zinc-400">combined titles across movies and TV</p>
                    </div>
                  </section>
                )}

                {details.images.length > 0 && (
                  <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
                    <div className="mb-5 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Photos</p>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Gallery</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(0)}
                        className="text-xs text-zinc-400 transition-colors hover:text-white"
                      >
                        View all
                      </button>
                    </div>
                    <div className="grid auto-rows-[92px] grid-cols-3 gap-2 sm:auto-rows-[110px] xl:auto-rows-[92px]">
                      {details.images.slice(0, 5).map((image, index) => (
                        <button
                          key={`${image.filePath}-${index}`}
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          className={`overflow-hidden rounded-[1.1rem] border border-white/10 transition-all hover:scale-[1.02] hover:border-white/30 ${
                            index === 0 ? "col-span-2 row-span-2" : ""
                          }`}
                        >
                          <img
                            src={image.filePath}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </aside>
            </motion.div>

            {lightboxIndex !== null && (
              <GalleryLightbox
                images={details.images}
                initialIndex={lightboxIndex}
                personName={details.name}
                onClose={() => setLightboxIndex(null)}
              />
            )}

            <motion.section
              className="mb-6 flex flex-col gap-5 border-t border-white/8 pt-6 sm:pt-8"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.2}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Filmography</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Movies and TV work</h2>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start lg:justify-end">
                  <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:overflow-visible sm:pb-0">
                    <div className="flex min-w-max gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("movies")}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                          activeTab === "movies" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Movies
                        {details.movieCredits.length > 0 && (
                          <span className="ml-1.5 text-[11px] text-zinc-500">{details.movieCredits.length}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("tv")}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                          activeTab === "tv" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        TV Shows
                        {details.tvCredits.length > 0 && (
                          <span className="ml-1.5 text-[11px] text-zinc-500">{details.tvCredits.length}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:overflow-visible sm:pb-0">
                    <div className="flex min-w-max gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                      {(["popularity", "year", "rating"] as SortKey[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSortKey(key)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                            sortKey === key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {key === "popularity" ? "Popular" : key === "year" ? "Recent" : "Rating"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {currentCredits.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
                <p className="text-zinc-500">No titles found for this person.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
                  {displayedCredits.map((item) =>
                    activeTab === "tv" ? (
                      <TvShowCard key={`${item.mediaType}-${item.id}`} item={item} />
                    ) : (
                      <MovieCard
                        key={`${item.mediaType}-${item.id}`}
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
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {visibleCount >= currentCredits.length && currentCredits.length > 24 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-zinc-500">
                    <div className="h-1 w-12 rounded-full bg-zinc-800" />
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
