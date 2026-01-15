"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, ThumbsUp, ThumbsDown, Check, ChevronDown, Clock, Star, Calendar, Play, Eye } from "lucide-react"
import { extractColorsFromImage, type ExtractedColors } from "@/lib/color-extractor"

export interface HeroMovie {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
  runtime?: string
  genres?: string[]
  isDiscovery?: boolean
  description?: string
  trailerUrl?: string
  reasons?: string[]
  director?: {
    id?: number
    name: string
    image?: string
  }
  cast?: { id?: number; name: string; image?: string }[]
}

interface DynamicColorProps {
  colors: ExtractedColors | null
}

function AmbientOrbs({ colors }: DynamicColorProps) {
  const primaryColor = colors?.primary || "var(--primary)"
  const accentColor = colors?.accent || "var(--accent)"

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl animate-pulse opacity-20"
        style={{ backgroundColor: primaryColor }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000 opacity-15"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full blur-2xl animate-pulse delay-500 opacity-25"
        style={{ backgroundColor: primaryColor }}
      />
    </div>
  )
}

function LeftPanel({
  genres,
  year,
  rating,
  runtime,
  description,
  trailerUrl,
  colors,
}: {
  genres: string[]
  year?: number
  rating?: number
  runtime?: string
  description?: string
  trailerUrl?: string
  colors: ExtractedColors | null
}) {
  const [expanded, setExpanded] = useState(true)
  const primaryColor = colors?.primary || "var(--primary)"

  return (
    <div className="hidden lg:flex  flex-col gap-5 w-72 xl:w-80 justify-center ">
      <div className="flex flex-wrap gap-2 justify-center ">
        {genres.map((genre) => (
          <span
            key={genre}
            className="px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm text-sm text-foreground transition-colors duration-500"
            style={{ borderWidth: 1, borderColor: `color-mix(in oklch, ${primaryColor} 40%, transparent)` }}
          >
            {genre}
          </span>
        ))}
      </div>

      <div className="flex  gap-3 justify-center">
        {typeof year === "number" && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="h-4 w-4 transition-colors duration-500" style={{ color: primaryColor }} />
          <span className="text-sm">{year}</span>
        </div>
        )}
        {typeof rating === "number" && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Star
            className="h-4 w-4 transition-colors duration-500"
            style={{ color: primaryColor, fill: primaryColor }}
          />
          <span className="text-sm">{rating} / 10</span>
        </div>
        )}
        {runtime && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="h-4 w-4 transition-colors duration-500" style={{ color: primaryColor }} />
          <span className="text-sm">{runtime}</span>
        </div>
        )}
      </div>

      {/* Expandable description */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          Synopsis
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </button>
        {description && (
          <div
            className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        )}
      </div>

      {trailerUrl && (
        <a
          href={trailerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/30 backdrop-blur-sm transition-all group"
          style={{
            borderWidth: 1,
            borderColor: `color-mix(in oklch, ${primaryColor} 30%, transparent)`,
          }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
            style={{ backgroundColor: `color-mix(in oklch, ${primaryColor} 20%, transparent)` }}
          >
            <Play
              className="h-4 w-4 transition-colors duration-500"
              style={{ color: primaryColor, fill: primaryColor }}
            />
          </div>
          <span className="text-sm font-medium">Watch Trailer</span>
        </a>
      )}
    </div>
  )
}

function RightPanel({
  director,
  cast,
  colors,
}: {
  director?: { id?: number; name: string; image?: string }
  cast?: { id?: number; name: string; image?: string }[]
  colors: ExtractedColors | null
}) {
  const primaryColor = colors?.primary || "var(--primary)"

  if (!director && !cast?.length) return null

  return (
    <div className="hidden lg:flex flex-col gap-6 w-72 xl:w-80">
      {director && (
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Director</p>
          {director.id ? (
            <Link
              href={`/person/director/${director.id}?name=${encodeURIComponent(director.name)}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-card/30 backdrop-blur-sm transition-colors duration-500 hover:bg-card/50"
              style={{ borderWidth: 1, borderColor: `color-mix(in oklch, ${primaryColor} 30%, transparent)` }}
            >
              <img
                src={director.image || "/placeholder.svg"}
                alt={director.name}
                className="w-20 h-20 rounded-full object-cover transition-colors duration-500"
                style={{ borderWidth: 2, borderColor: `color-mix(in oklch, ${primaryColor} 40%, transparent)` }}
              />
              <span className="text-sm font-medium">{director.name}</span>
            </Link>
          ) : (
            <div
              className="flex items-center gap-4 p-3 rounded-xl bg-card/30 backdrop-blur-sm transition-colors duration-500"
              style={{ borderWidth: 1, borderColor: `color-mix(in oklch, ${primaryColor} 30%, transparent)` }}
            >
              <img
                src={director.image || "/placeholder.svg"}
                alt={director.name}
                className="w-20 h-20 rounded-full object-cover transition-colors duration-500"
                style={{ borderWidth: 2, borderColor: `color-mix(in oklch, ${primaryColor} 40%, transparent)` }}
              />
              <span className="text-sm font-medium">{director.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Main actors */}
      {cast?.length ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Main Cast</p>
          <div className="grid grid-cols-2 gap-3">
            {cast.map((actor) => (
              actor.id ? (
                <Link
                  key={actor.name}
                  href={`/person/actor/${actor.id}?name=${encodeURIComponent(actor.name)}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 hover:bg-card/50 transition-colors"
                >
                  <img
                    src={actor.image || "/placeholder.svg"}
                    alt={actor.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border/50"
                  />
                  <span className="text-xs text-center text-muted-foreground line-clamp-1">{actor.name}</span>
                </Link>
              ) : (
                <div
                  key={actor.name}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30"
                >
                  <img
                    src={actor.image || "/placeholder.svg"}
                    alt={actor.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border/50"
                  />
                  <span className="text-xs text-center text-muted-foreground line-clamp-1">{actor.name}</span>
                </div>
              )
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function BottomSection({
  title,
  reasons,
  isDiscovery,
  genres,
  year,
  rating,
  runtime,
  trailerUrl,
  colors,
}: {
  title: string
  reasons: string[]
  isDiscovery: boolean
  genres: string[]
  year?: number
  rating?: number
  runtime?: string
  trailerUrl?: string
  colors: ExtractedColors | null
}) {
  const [reasonsExpanded, setReasonsExpanded] = useState(false)
  const primaryColor = colors?.primary || "var(--primary)"
  const accentColor = colors?.accent || "var(--accent)"

  return (
    <div className="flex flex-col items-center gap-6 mt-8 lg:mt-10">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-semibold transition-colors duration-500"
            style={{ color: primaryColor }}
          >
            {title}
          </h2>
          {isDiscovery && (
            <Badge className="bg-discovery text-discovery-foreground gap-1">
              <Sparkles className="h-3 w-3" />
              Discovery
            </Badge>
          )}
        </div>
      </div>

      {/* Why this film */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setReasonsExpanded(!reasonsExpanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Why this film?
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${reasonsExpanded ? "rotate-180" : ""}`} />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${reasonsExpanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="flex flex-col items-center gap-2 px-4">
            {reasons.map((reason, i) => (
              <p key={i} className="text-sm text-muted-foreground text-center">
                &quot;{reason}&quot;
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-border/40 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 bg-transparent transition-all duration-300"
        >
          <ThumbsDown className="h-5 w-5" />
          <span className="sr-only">Not interested</span>
        </Button>

        <Button
          variant="outline"
          className="h-12 px-5 rounded-full  hover:scale-110 border-border/40 bg-transparent gap-2  transition-all duration-300"
          style={{
            borderColor: `color-mix(in oklch, ${primaryColor} 30%, transparent)`,
            color: primaryColor,
            backgroundColor: `color-mix(in oklch, ${primaryColor} 10%, transparent)`,
          }}
        >
          <Eye className="h-4 w-4" />
          Already seen
        </Button>

        <Button
          className="h-14 px-8 rounded-full text-white font-medium text-base transition-all duration-500 hover:scale-105 active:scale-95 "
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            boxShadow: `0 0 15px -5px ${primaryColor}, 0 0 30px -10px ${accentColor}`,
            border: `1px solid color-mix(in oklch, ${primaryColor} 70%, white)`,
          }}
        >
          <Check className="h-5 w-5 m-1" />
          I&apos;ll watch this
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full  hover:scale-110 border-border/40 hover:border-primary/50 hover:bg-primary/5 hover:text-primary bg-transparent gap-2 transition-all duration-300"
          
        >
          <ThumbsUp className="h-5 w-5" style={{ fill: `color-mix(in oklch, ${primaryColor} 20%, transparent)` }} />
          <span className="sr-only">Like</span>
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4 lg:hidden mt-4">
        <div className="flex flex-wrap justify-center gap-2">
          {genres.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1.5 rounded-full bg-card/50 text-xs text-muted-foreground"
              style={{ borderWidth: 1, borderColor: `color-mix(in oklch, ${primaryColor} 30%, transparent)` }}
            >
              {genre}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {typeof year === "number" && <span>{year}</span>}
          {typeof rating === "number" && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" style={{ fill: primaryColor, color: primaryColor }} />
                {rating}
              </span>
            </>
          )}
          {runtime && (
            <>
              <span>·</span>
              <span>{runtime}</span>
            </>
          )}
        </div>
        {trailerUrl && (
          <a
            href={trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm transition-colors duration-500"
            style={{ color: primaryColor }}
          >
            <Play className="h-4 w-4" style={{ fill: primaryColor }} />
            Watch Trailer
          </a>
        )}
      </div>
    </div>
  )
}

export function HeroRecommendation({ movie }: { movie?: HeroMovie | null }) {
  const [colors, setColors] = useState<ExtractedColors | null>(null)
  const activeMovie = movie
  const reasons = activeMovie?.reasons?.length
    ? activeMovie.reasons
    : ["Popular right now"]
  const genres = activeMovie?.genres ?? []
  const cast = activeMovie?.cast ?? []
  const director = activeMovie?.director
  const runtime = activeMovie?.runtime

  const poster = activeMovie?.poster || "/placeholder.svg"

  useEffect(() => {
    // Extract colors from the movie poster
    extractColorsFromImage(poster).then(setColors)
  }, [poster])

  if (!activeMovie) {
    return null
  }

  return (
    <section className="relative py-8 md:py-12 ">
      <AmbientOrbs colors={colors} />

      {/* Section header */}
      <div className="relative z-10 text-center mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Tonight&apos;s Pick</p>
        <h1 className="text-3xl md:text-4xl font-light text-balance">We think you&apos;ll love</h1>
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 md:px-6 lg:px-8 max-w-10/12 mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-8 xl:gap-12">
          {/* Left panel - metadata */}
          <LeftPanel
            genres={genres}
            year={activeMovie.year}
            rating={activeMovie.rating}
            runtime={runtime}
            description={activeMovie.description}
            trailerUrl={activeMovie.trailerUrl}
            colors={colors}
          />

          {/* Center - Movie poster */}
          <div className="relative flex flex-col items-center">
            <div
              className="absolute top-8 w-64 h-96 blur-3xl rounded-full opacity-30 transition-colors duration-700"
              style={{ backgroundColor: colors?.primary || "var(--primary)" }}
            />

            {/* Movie poster */}
            <div
              className="relative z-10 w-56 md:w-64 lg:w-72 xl:w-85 2xl:w-96 aspect-[2/3] rounded-2xl overflow-hidden transition-shadow duration-500"
              style={{
                boxShadow: colors
                  ? `0 0 60px color-mix(in oklch, ${colors.primary} 40%, transparent), 0 0 120px color-mix(in oklch, ${colors.primary} 20%, transparent)`
                  : undefined,
              }}
            >
              <Link href={`/movie/${encodeURIComponent(activeMovie.id)}`}>
                <img
                  src={poster}
                  alt={activeMovie.title}
                  className="w-full h-full object-cover"
                />
              </Link>
            </div>
          </div>

          {/* Right panel - cast & director */}
          <RightPanel director={director} cast={cast} colors={colors} />
        </div>

        <BottomSection
          title={activeMovie.title}
          reasons={reasons}
          isDiscovery={activeMovie.isDiscovery ?? false}
          genres={genres}
          year={activeMovie.year}
          rating={activeMovie.rating}
          runtime={runtime}
          trailerUrl={activeMovie.trailerUrl}
          colors={colors}
        />
      </div>
    </section>
  )
}
