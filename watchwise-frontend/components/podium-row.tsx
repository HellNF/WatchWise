"use client"

import * as React from "react"
import Link from "next/link"
import type { CarouselApi } from "@/components/ui/carousel"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { MovieQuickActions } from "@/components/movie-quick-actions"

import { Star,Calendar } from "lucide-react"

export interface PodiumItem {
  id: string
  title: string
  poster?: string
  rank: number
  year?: number | string
  rating?: number
}

export function PodiumRow({
  title,
  items,
}: {
  title: string
  items: PodiumItem[]
}) {
  const [api, setApi] = React.useState<CarouselApi | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)

  // Wheel / trackpad support
  const wheelAreaRef = React.useRef<HTMLDivElement | null>(null)
  const wheelLockRef = React.useRef(false)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!api) return

    const onSelect = () => setActiveIndex(api.selectedScrollSnap())
    onSelect()

    api.on("select", onSelect)
    api.on("reInit", onSelect)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api])

  React.useEffect(() => {
    const el = wheelAreaRef.current
    if (!el || !api) return

    const onEnter = () => (wheelLockRef.current = true)
    const onLeave = () => (wheelLockRef.current = false)

    const onWheel = (e: WheelEvent) => {
      if (!wheelLockRef.current) return

      // Prefer capturing vertical wheel (classic mouse wheel),
      // let horizontal delta pass through naturally.
      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)
      const dominantY = absY > absX

      if (!dominantY) return

      e.preventDefault()

      // Throttle with rAF so we don't spam Embla
      if (rafRef.current) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null

        const intensity = Math.min(4, Math.max(1, Math.round(absY / 60)))
        const forward = e.deltaY > 0

        for (let i = 0; i < intensity; i++) {
          if (forward) api.scrollNext()
          else api.scrollPrev()
        }
      })
    }

    el.addEventListener("mouseenter", onEnter)
    el.addEventListener("mouseleave", onLeave)
    el.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      el.removeEventListener("mouseenter", onEnter)
      el.removeEventListener("mouseleave", onLeave)
      el.removeEventListener("wheel", onWheel as any)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [api])

  if (!items.length) return null

  return (
    <section className="px-4 md:px-6 lg:px-8 mx-auto mt-10 max-w-11/12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>

      {/* Wheel/trackpad capture area */}
      <div ref={wheelAreaRef} className="relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false, // ✅ ring logic
          }}
          className="relative"
        >
          {/* Bigger gutter + overflow-visible so numbers are not clipped */}
          <CarouselContent className="ml-28 md:ml-34 overflow-visible">
            {items.map((item, index) => {
              const isActive = index === activeIndex

              return (
                <CarouselItem
                  key={item.id}
                  className="
                    ml-24 md:ml-30 lg:ml-36
                    shrink-0
                    basis-[230px] sm:basis-[260px] md:basis-[290px] lg:basis-[320px]
                    overflow-visible
                  "
                >
                  <div className="group relative">
                    <Link
                      href={`/movie/${encodeURIComponent(item.id)}`}
                      className="block"
                    >
                      <div className="relative overflow-visible">
                      {/* Rank number: visible outline + slight fill */}
                      <div
                        className="
                          pointer-events-none select-none absolute
                          -left-12 md:-left-16
                          bottom-0
                          z-0
                          font-black leading-none
                          text-[150px] md:text-[180px] lg:text-[200px]
                          -translate-x-1/3
                        "
                        style={{
                          color: "rgba(255,255,255,0.10)",
                          WebkitTextStroke: "3px rgba(255,255,255,0.35)",
                          textShadow: "0 18px 40px rgba(0,0,0,0.55)",
                        }}
                      >
                        {item.rank}
                      </div>

                      {/* Poster card */}
                      <div
                        className={[
                          "relative z-10 aspect-[2/3] rounded-2xl overflow-hidden bg-card/40",
                          "transition-all duration-300 will-change-transform",
                          "ring-1 ring-border/40 opacity-95",
                          "group-hover:scale-[1.04] group-hover:opacity-100",
                        ].join(" ")}
                      >
                        {/* Netflix-like overlay */}
                        <div className="absolute inset-0 z-10 bg-linear-to-t from-black/30 via-black/0 to-black/0" />

                        <img
                          src={item.poster || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />

                        <div className="absolute bottom-2 right-2 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                          <MovieQuickActions movieId={item.id} />
                        </div>
                      </div>

                      {/* Optional title on hover */}
                      <p className="mt-2 text-md font-bold items-center justify-center text-center">
                        {item.title}
                      </p>
                      <div className="flex justify-center mt-1">
                        <div className="flex ml-0">
                          <Calendar className="inline-block h-3.5 w-3.5 mr-1 mb-0.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {item.year ?? ""}
                          </p>
                        </div>

                        <div className="flex ml-3">
                          <Star className="inline-block h-3.5 w-3.5 mr-1 mb-0.5 text-muted-foreground " />
                          <p className="text-xs text-muted-foreground">
                            {typeof item.rating === "number" ? ` · ${item.rating.toFixed(1)}` : ""}
                          </p>
                        </div>
                      </div>
                      </div>
                    </Link>
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>

          <CarouselPrevious className="left-2 md:left-0 bg-background/40 backdrop-blur border-border/50 hover:bg-background/60" />
          <CarouselNext className="right-2 md:right-0 bg-background/40 backdrop-blur border-border/50 hover:bg-background/60" />
        </Carousel>
      </div>
    </section>
  )
}
