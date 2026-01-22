"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Film, Sparkles, Users } from "lucide-react"

export type HomeHeroItem = {
  id: string
  title: string
  backdrop?: string
  poster?: string
  year?: number
  rating?: number
  overview?: string
  badge?: string
}

export type HomeMovieItem = {
  id: string
  title: string
  poster?: string
  year?: number
  rating?: number
  isDiscovery?: boolean
  reason?: string
}

export type HomeCategory = {
  key: string
  title: string
  subtitle?: string
  items: HomeMovieItem[]
  href?: string
}

function CategoryRow({
  title,
  subtitle,
  items,
  href,
}: {
  title: string
  subtitle?: string
  items: HomeMovieItem[]
  href?: string
}) {
  const list = useMemo(() => items.slice(0, 15), [items])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  if (!list.length) return null

  const handleScroll = (direction: "left" | "right") => {
    const node = scrollRef.current
    if (!node) return
    const delta = Math.round(node.clientWidth * 0.8)
    node.scrollBy({ left: direction === "left" ? -delta : delta, behavior: "smooth" })
  }

  return (
    <section className="py-8 border-t border-border/40">
      <div className="flex flex-col gap-4 px-4 md:px-6 lg:px-8 max-w-10/12 mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            {subtitle ? (
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold">{title}</h2>
          </div>
          {href ? (
            <Button asChild variant="ghost" className="text-sm">
              <Link href={href}>Vedi tutti</Link>
            </Button>
          ) : null}
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth hide-scrollbar"
          >
            {list.map((movie) => (
              <div key={movie.id} className="w-36 sm:w-40 md:w-44 shrink-0">
                <MovieCard
                  id={movie.id}
                  title={movie.title}
                  poster={movie.poster}
                  year={movie.year}
                  rating={movie.rating}
                  isDiscovery={movie.isDiscovery}
                  reason={movie.reason}
                  children={<MovieQuickActions movieId={movie.id} />}
                />
              </div>
            ))}
          </div>

          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => handleScroll("left")}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => handleScroll("right")}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export function HomePageClient({
  heroItems,
  categories,
}: {
  heroItems: HomeHeroItem[]
  categories: HomeCategory[]
}) {
  const items = useMemo(() => heroItems.filter(Boolean), [heroItems])
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      setActiveIndex(api.selectedScrollSnap())
    }

    onSelect()
    api.on("select", onSelect)

    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  useEffect(() => {
    if (!api) return

    const interval = setInterval(() => {
      api.scrollNext()
    }, 8000)

    return () => clearInterval(interval)
  }, [api])

  const activeHero = items[activeIndex] ?? items[0]
  const heroBackdrop = activeHero?.backdrop || activeHero?.poster || "/placeholder.svg"

  return (
    <div>
      <section className="relative min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBackdrop}
            alt={activeHero?.title ?? "Hero"}
            className="h-full w-full object-cover object-top scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
        </div>

        <div className="relative z-10 px-4 md:px-6 lg:px-8 max-w-10/12 mx-auto py-16 lg:py-24">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
              <Badge className="gap-1 bg-primary/90 text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                {activeHero?.badge ?? "In evidenza"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Film className="h-3 w-3" />
                Streaming picks
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
                {activeHero?.title ?? "Scopri il tuo prossimo film"}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground line-clamp-3">
                {activeHero?.overview ??
                  "Una selezione dinamica di film pensata per te, con nuove scoperte ogni giorno."}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {typeof activeHero?.year === "number" ? (
                  <span>{activeHero.year}</span>
                ) : null}
                {typeof activeHero?.rating === "number" ? (
                  <span>· {activeHero.rating.toFixed(1)} / 10</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {activeHero?.id ? (
                <Button asChild size="lg">
                  <Link href={`/movie/${encodeURIComponent(activeHero.id)}`}>Dettagli</Link>
                </Button>
              ) : null}
              <Button variant="outline" size="lg" asChild>
                <Link href="/suggestions">Suggeriti per te</Link>
              </Button>
            </div>
          </div>

          {items.length ? (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Cambia atmosfera
                </p>
                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{activeIndex + 1}</span>
                  <span className="opacity-50">/</span>
                  <span>{items.length}</span>
                </div>
              </div>
              <Carousel
                opts={{ align: "start", loop: true }}
                setApi={setApi}
                className="relative"
              >
                <CarouselContent className="-ml-3">
                  {items.map((movie, index) => (
                    <CarouselItem key={movie.id} className="basis-1/2 sm:basis-1/3 lg:basis-1/5 pl-3">
                      <button
                        onClick={() => api?.scrollTo(index)}
                        className={cn(
                          "group w-full text-left transition",
                          index === activeIndex ? "opacity-100" : "opacity-70 hover:opacity-100"
                        )}
                      >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-border/30">
                          <img
                            src={movie.poster || "/placeholder.svg"}
                            alt={movie.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                        </div>
                        <p className="mt-2 text-sm font-medium line-clamp-1">
                          {movie.title}
                        </p>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden lg:flex -left-6" />
                <CarouselNext className="hidden lg:flex -right-6" />
              </Carousel>
            </div>
          ) : null}
        </div>
      </section>

      <section className="py-10">
        <div className="px-4 md:px-6 lg:px-8 max-w-10/12 mx-auto">
          <Card className="bg-gradient-to-br from-card via-card to-primary/10 border-border/40">
            <CardHeader className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Gruppi per scegliere insieme</CardTitle>
                  <CardDescription>
                    Prepara serate film con gli amici: crea un gruppo, vota e trova il film perfetto.
                  </CardDescription>
                </div>
                <Badge className="ml-auto" variant="outline">
                  Coming soon
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Invita amici, condividi le preferenze e lascia che WatchWise scelga il titolo migliore per tutti.
            </CardContent>
            <CardFooter>
              <Button disabled className="w-full sm:w-auto">
                Crea un gruppo
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {categories.map((category) => (
        <CategoryRow
          key={category.key}
          title={category.title}
          subtitle={category.subtitle}
          items={category.items}
          href={category.href}
        />
      ))}
    </div>
  )
}
