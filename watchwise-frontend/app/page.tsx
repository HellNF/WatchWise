"use client"

import React, { useState, useEffect } from "react"
import { motion, useScroll, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { getMoviesByCategory, type MovieListItem, type MoviesCategory } from "@/lib/api"
import { MovieCard } from "@/components/movie-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Sparkles, Users, Zap, Star, Menu, SlidersHorizontal, Film, ArrowRight, CheckCircle2 } from "lucide-react"
import { LogoMagicStroke } from "@/components/LogoMagicStroke"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/auth"

const AVATAR_OPTIONS = [
  { id: "avatar_01", src: "/Avatar_1.png" },
  { id: "avatar_02", src: "/Avatar_2.png" },
  { id: "avatar_03", src: "/Avatar_3.png" },
  { id: "avatar_04", src: "/Avatar_4.png" },
  { id: "avatar_05", src: "/Avatar_5.png" },
  { id: "avatar_06", src: "/Avatar_6.png" },
  { id: "avatar_07", src: "/Avatar_7.png" },
  { id: "avatar_08", src: "/Avatar_8.png" },
  { id: "avatar_09", src: "/Avatar_9.png" },
  { id: "avatar_10", src: "/Avatar_10.png" },
  { id: "avatar_11", src: "/Avatar_11.png" },
  { id: "avatar_12", src: "/Avatar_12.png" },
]

// Social proof avatars shown in hero
const SOCIAL_PROOF_AVATARS = [
  AVATAR_OPTIONS[0],
  AVATAR_OPTIONS[3],
  AVATAR_OPTIONS[6],
  AVATAR_OPTIONS[9],
]

// Avatars shown in the group session mock card
const GROUP_AVATARS = [
  AVATAR_OPTIONS[1],
  AVATAR_OPTIONS[4],
  AVATAR_OPTIONS[7],
  AVATAR_OPTIONS[10],
]

// --- Animation Variants ---
const heroItemV = {
  hidden: { opacity: 0, transform: "translateY(20px)" },
  visible: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
}
const staggerV = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const cardItemV = {
  hidden: { opacity: 0, transform: "translateY(20px)" },
  visible: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
}

// --- Static Data ---
type StaticMovie = { id: string; title: string; poster: string; rating: number }
const trendingMovies: StaticMovie[] = [
  { id: "1", title: "Oppenheimer", poster: "https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg", rating: 8.3 },
  { id: "2", title: "Barbie", poster: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg", rating: 7.2 },
  { id: "3", title: "Anyone but You", poster: "https://image.tmdb.org/t/p/w500/5qHoazZiaLe7oFBok7XlUhg96f2.jpg", rating: 8.1 },
  { id: "4", title: "The Holdovers", poster: "https://image.tmdb.org/t/p/w500/6yFnjRmtzG6vU5P6gQ6l2lOe1QG.jpg", rating: 7.6 },
  { id: "5", title: "Killers of the Flower Moon", poster: "https://image.tmdb.org/t/p/w500/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg", rating: 7.5 },
  { id: "6", title: "The Marvels", poster: "https://image.tmdb.org/t/p/w500/Ag3D9jYcv0L8gJ2vQpzo2o5A0dA.jpg", rating: 6.2 },
]
const topRatedMovies: StaticMovie[] = [
  { id: "7", title: "The Godfather", poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", rating: 9.2 },
  { id: "8", title: "The Shawshank Redemption", poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", rating: 9.3 },
  { id: "9", title: "Spirited Away", poster: "https://image.tmdb.org/t/p/w500/oRvMaJOmapypFUcQqpgHMZA6qL9.jpg", rating: 8.5 },
  { id: "10", title: "Pulp Fiction", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", rating: 8.9 },
  { id: "11", title: "The Dark Knight", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", rating: 9.0 },
  { id: "12", title: "Parasite", poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", rating: 8.5 },
]
const faqs = [
  {
    q: "What is WatchWise?",
    a: "WatchWise is a smart movie recommendation platform that blends your taste, mood, and group preferences to find the perfect film — no more endless scrolling.",
  },
  {
    q: "How does group movie night work?",
    a: "Create a room, share a code with friends, and WatchWise calculates a Consensus Score across everyone's preferences instantly.",
  },
  {
    q: "Do I need to sign up?",
    a: "Yes — a free account unlocks AI-powered recommendations and group sessions.",
  },
  {
    q: "Is it really free?",
    a: "Yes. We may introduce a Pro tier with advanced analytics later, but the core experience stays free.",
  },
]

// --- UI Primitives ---

function GlassCard({
  children,
  className = "",
  gradient = false,
}: {
  children: React.ReactNode
  className?: string
  gradient?: boolean
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 shadow-xl backdrop-blur-md transition-[border-color,box-shadow] duration-200",
        gradient ? "bg-gradient-to-br from-white/5 to-white/0" : "bg-card/40",
        className
      )}
    >
      {children}
    </div>
  )
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
      {children}
    </span>
  )
}

// --- Sections ---

function StickyHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ username?: string; avatar?: string } | null>(null)
  const router = useRouter()

  React.useEffect(() => {
    return scrollY.on("change", (latest) => setScrolled(latest > 20))
  }, [scrollY])

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadFromStorage = () => {
      const raw = localStorage.getItem("watchwise-user")
      const hasToken = Boolean(localStorage.getItem("watchwise-token"))
      setIsLoggedIn(Boolean(raw) || hasToken)
      if (raw) {
        try {
          setUser(JSON.parse(raw))
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    loadFromStorage()
    window.addEventListener("watchwise-auth-changed", loadFromStorage)

    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setTimeout(loadFromStorage, 200)
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false)
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("watchwise-auth-changed", loadFromStorage)
    }
  }, [])

  const avatarSrc = user?.avatar
    ? (AVATAR_OPTIONS.find((opt) => opt.id === user.avatar)?.src ?? AVATAR_OPTIONS[0].src)
    : AVATAR_OPTIONS[0].src

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-[background-color,border-color,padding] duration-300 border-b",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-border/40 py-2"
          : "bg-transparent border-transparent py-4"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="p-1.5 rounded-lg">
            <LogoMagicStroke className="h-10 w-auto" />
          </div>
          <span className="text-xl font-bold tracking-tight">WatchWise</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Movie Night", "FAQ"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Button
                className="hidden md:inline-flex glow-accent font-semibold rounded-full px-6"
                size="sm"
                onClick={() => router.push("/home")}
              >
                Go to app
              </Button>
              <button
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
                onClick={() => router.push("/profile")}
                aria-label="Go to profile"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/60 transition-[box-shadow] duration-200">
                  <AvatarImage src={avatarSrc} alt={user?.username ?? "Profile"} loading="eager" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user?.username ? user.username.slice(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="hidden md:inline-flex hover:bg-white/5"
                size="sm"
                onClick={() => router.push("/login")}
              >
                Sign in
              </Button>
              <Button
                className="glow-accent font-semibold rounded-full px-6"
                size="sm"
                onClick={() => router.push("/register")}
              >
                Get started
              </Button>
            </>
          )}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <Menu />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(-8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-8px)" }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="md:hidden bg-background border-b border-border/40"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {["Features", "Movie Night", "FAQ"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  className="text-lg font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              <div className="h-px bg-border/50 my-2" />
              {isLoggedIn ? (
                <>
                  <Button
                    className="w-full justify-start glow-accent rounded-full"
                    onClick={() => { router.push("/home"); setMenuOpen(false) }}
                  >
                    Go to app
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => { router.push("/profile"); setMenuOpen(false) }}
                  >
                    Profile
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => { router.push("/login"); setMenuOpen(false) }}
                  >
                    Sign in
                  </Button>
                  <Button
                    className="w-full justify-start glow-accent rounded-full"
                    onClick={() => { router.push("/register"); setMenuOpen(false) }}
                  >
                    Get started
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function Hero() {
  const [movies, setMovies] = useState<MovieListItem[]>([])
  const router = useRouter()

  useEffect(() => {
    getMoviesByCategory("trending", { limit: 3 }).then(setMovies)
  }, [])

  return (
    <section className="relative overflow-hidden pb-20 pt-28 md:pb-32 md:pt-48">
      {/* Background ambience */}
      <div className="absolute left-1/2 top-0 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-primary/20 blur-[90px] opacity-30 pointer-events-none sm:h-[520px] sm:w-[680px] sm:blur-[110px] lg:h-[600px] lg:w-[1000px] lg:blur-[120px]" />
      <div className="absolute right-[-18%] top-[42%] h-[280px] w-[280px] rounded-full bg-accent/10 blur-[80px] opacity-20 pointer-events-none sm:right-0 sm:h-[420px] sm:w-[420px] sm:blur-[90px] lg:h-[600px] lg:w-[800px] lg:blur-[100px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <motion.div variants={staggerV} initial="hidden" animate="visible">
          <motion.div
            variants={heroItemV}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-6 tracking-wide uppercase"
          >
            <Sparkles className="w-3 h-3" />
            AI-powered recommendations
          </motion.div>

          <motion.h1
            variants={heroItemV}
            className="mb-6 text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Stop searching.{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent animate-gradient">
              Start watching.
            </span>
          </motion.h1>

          <motion.p
            variants={heroItemV}
            className="mb-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            The intelligent platform that blends your unique taste, current mood, and group dynamics to find the perfect movie — instantly.
          </motion.p>

          <motion.div variants={heroItemV} className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 text-base glow-accent h-12 active:scale-[0.97] transition-transform duration-[160ms]"
            >
              <Link href="/register">Create free account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base border-white/10 hover:bg-white/5 h-12 group active:scale-[0.97] transition-transform duration-[160ms]"
            >
              <Link href="/home" className="flex items-center">
                <span className="mr-2">View demo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>

          <motion.div variants={heroItemV} className="mt-8 flex flex-col items-start gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <div className="flex -space-x-2">
              {SOCIAL_PROOF_AVATARS.map((av) => (
                <Avatar key={av.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={av.src} alt="WatchWise user" />
                  <AvatarFallback className="bg-zinc-800 text-[10px]">W</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <p>
              Trusted by{" "}
              <span className="text-foreground font-medium">12,847+</span> movie lovers
            </p>
          </motion.div>
        </motion.div>

        {/* Hero Visual — floating posters */}
        <motion.div
          initial={{ opacity: 0, transform: "scale(0.95)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="relative hidden h-[500px] w-full lg:block"
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="relative w-full h-full"
          >
            <div className="absolute top-10 right-10 w-20 h-20 bg-primary/30 blur-2xl rounded-full" />
            {movies[1] && (
              <div className="absolute top-0 right-[20%] w-[240px] rotate-12 opacity-60 blur-[1px]">
                <MovieCard
                  id={movies[1].movieId}
                  title={movies[1].title}
                  poster={movies[1].posterPath}
                  rating={movies[1].voteAverage}
                  year={movies[1].year}
                  alwaysShowActions={false}
                />
              </div>
            )}
            {movies[2] && (
              <div className="absolute top-12 right-[35%] w-[280px] -rotate-6 z-20">
                <MovieCard
                  id={movies[2].movieId}
                  title={movies[2].title}
                  poster={movies[2].posterPath}
                  rating={movies[2].voteAverage}
                  year={movies[2].year}
                  alwaysShowActions={false}
                />
              </div>
            )}
            {movies[0] && (
              <div className="absolute bottom-10 right-[15%] w-[180px] rotate-6 z-10 opacity-80">
                <MovieCard
                  id={movies[0].movieId}
                  title={movies[0].title}
                  poster={movies[0].posterPath}
                  rating={movies[0].voteAverage}
                  year={movies[0].year}
                  alwaysShowActions={false}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function BentoFeatures() {
  return (
    <section id="features" className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <SectionBadge>Features</SectionBadge>
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Everything you need to decide what to watch.
          </h2>
          <p className="text-muted-foreground text-lg">We don't just show you movies. We help you choose.</p>
        </div>

        <div className="grid auto-rows-[260px] grid-cols-1 gap-4 sm:auto-rows-[280px] sm:gap-6 md:grid-cols-3">
          {/* Large feature card */}
          <GlassCard
            className="group row-span-1 flex flex-col justify-between overflow-hidden p-6 md:col-span-2 md:row-span-2 md:p-8"
            gradient
          >
            <div className="relative z-10">
              <div className="bg-accent/20 w-fit p-3 rounded-xl mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-3xl font-bold mb-2">Hyper-personalized</h3>
              <p className="text-muted-foreground max-w-md leading-relaxed">
                Our AI analyzes over 50 data points — past ratings, current mood, hidden genres — to surface your next favorite film.
              </p>
            </div>

            {/* Decorative poster grid */}
            <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
            <div className="absolute -right-10 -bottom-20 opacity-50 group-hover:opacity-80 group-hover:-translate-y-2 transition-all duration-700">
              <div className="grid grid-cols-2 gap-2 transform -rotate-12">
                {[...trendingMovies, ...topRatedMovies].slice(0, 4).map((m) => (
                  <img
                    key={m.id}
                    src={m.poster}
                    alt={m.title}
                    className="w-32 h-48 rounded-lg object-cover shadow-lg opacity-80"
                  />
                ))}
              </div>
            </div>

            {/* Match score chip */}
            <div className="absolute bottom-8 left-8 z-10 flex items-center gap-2 bg-background/60 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
              <Star className="w-4 h-4 text-discovery fill-discovery" />
              <span className="text-sm font-semibold">97% match</span>
            </div>
          </GlassCard>

          {/* Quick actions */}
          <GlassCard className="group flex flex-col justify-center p-6 transition-colors hover:border-primary/40 md:p-8">
            <div className="bg-primary/20 w-fit p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-200">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quick actions</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Save to watchlist, mark as seen, or watch the trailer in one tap.
            </p>
          </GlassCard>

          {/* Group sync */}
          <GlassCard className="group flex flex-col justify-center p-6 transition-colors hover:border-primary/40 md:p-8">
            <div className="bg-primary/20 w-fit p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-200">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Group sync</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sync with friends. We find the one movie everyone agrees on.
            </p>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Set your mood",
      desc: "Chill, intense, or something in between — tell us how you feel right now.",
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    {
      num: "02",
      title: "AI does the work",
      desc: "We cross-reference 50,000+ titles with your taste profile in milliseconds.",
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      num: "03",
      title: "Press play",
      desc: "Get a ranked shortlist. No more scrolling. No more arguments.",
      icon: <Film className="w-5 h-5" />,
    },
  ]

  return (
    <section className="border-y border-white/5 bg-gradient-to-b from-background via-white/[0.02] to-background py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <SectionBadge>How it works</SectionBadge>
          <h2
            className="text-3xl font-bold"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            From "I don't know" to play in seconds
          </h2>
        </div>

        <motion.div
          className="relative grid gap-10 md:grid-cols-3 md:gap-8"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              className="relative flex flex-col items-center text-center group"
              variants={cardItemV}
            >
              {/* Always-visible large background number */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[88px] font-bold text-primary/[0.06] select-none leading-none pointer-events-none group-hover:text-primary/10 transition-colors duration-300">
                {step.num}
              </div>

              <div className="w-12 h-12 rounded-full bg-background border border-border/50 shadow-lg flex items-center justify-center mb-6 relative z-10 group-hover:border-primary/50 group-hover:text-primary transition-[border-color,color] duration-200">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm px-4 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function MovieNight() {
  return (
    <section id="movie-night" className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 sm:px-6 md:flex-row md:gap-16">
        <div className="flex-1 space-y-8 z-10">
          <SectionBadge>Movie night mode</SectionBadge>
          <h2
            className="text-4xl md:text-5xl font-bold leading-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            End the <span className="text-primary">infinite scroll</span> arguments.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Create a room, invite friends, and let WatchWise aggregate everyone's preferences into a mathematical Consensus Score for every movie.
          </p>
          <ul className="space-y-4 text-muted-foreground">
            {[
              "Real-time voting sync",
              "Filter by streaming service",
              "Instant results, zero negotiation",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          <Button size="lg" className="glow-primary mt-4 w-full rounded-full px-8 sm:w-auto">
            Start a group session
          </Button>
        </div>

        {/* Interactive mock card */}
        <div className="flex-1 relative w-full flex justify-center">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-40 pointer-events-none" />

          <GlassCard className="relative z-10 w-full max-w-[380px] animate-float p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div>
                <h4 className="font-bold text-lg">Friday Night Squad</h4>
                <p className="text-xs text-muted-foreground">4 members active</p>
              </div>
              <div className="flex -space-x-2">
                {GROUP_AVATARS.map((av) => (
                  <Avatar key={av.id} className="h-8 w-8 border-2 border-card">
                    <AvatarImage src={av.src} alt="Group member" />
                    <AvatarFallback className="bg-zinc-800 text-[10px]">W</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>

            {/* Consensus result */}
            <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex gap-4">
              <img
                src={trendingMovies[2].poster}
                alt={trendingMovies[2].title}
                className="w-20 rounded-lg shadow-sm object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="font-bold text-sm leading-snug">{trendingMovies[2].title}</h5>
                  <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/20 shrink-0">
                    Winner
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Action • Sci-Fi</p>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "91%" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-primary h-full rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">Consensus</span>
                  <span className="text-[10px] font-bold text-primary">91%</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}

function ShowcaseRow({ title, category }: { title: string; category: MoviesCategory }) {
  const [movies, setMovies] = useState<MovieListItem[]>([])
  useEffect(() => {
    getMoviesByCategory(category, { limit: 10 }).then(setMovies)
  }, [category])
  return (
    <div className="mb-16">
      <div className="mb-6 flex items-center justify-between gap-4 px-1 md:px-0">
        <h3 className="text-2xl font-bold">{title}</h3>
        <Link
          href={"/search?cat=" + category}
          className="text-accent text-sm font-medium hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="relative">
        <Carousel opts={{ align: "start", loop: false }} className="w-full">
          <CarouselContent className="-ml-4 px-6 md:px-0">
            {movies.map((movie) => (
              <CarouselItem
                key={movie.movieId}
                className="pl-4 basis-[160px] md:basis-[200px] lg:basis-[240px]"
              >
                <MovieCard
                  id={movie.movieId}
                  title={movie.title}
                  poster={movie.posterPath}
                  year={movie.year}
                  rating={movie.voteAverage}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
        {/* Mobile right-edge fade — pointer-events-none preserves swipe */}
        <div className="md:hidden absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-background pointer-events-none z-10" />
      </div>
    </div>
  )
}

function Showcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <ShowcaseRow title="Trending now" category="trending" />
      <ShowcaseRow title="All-time favorites" category="top_rated" />
    </section>
  )
}

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>
        <p className="text-muted-foreground">Everything you need to know about WatchWise.</p>
      </div>
      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((f, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className="border border-white/5 bg-white/[0.02] rounded-xl px-5 data-[state=open]:bg-white/[0.04] transition-colors"
          >
            <AccordionTrigger className="hover:no-underline py-4 text-left font-medium text-base">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

function FinalCTA() {
  const router = useRouter()
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24">
      <motion.div
        className="relative mx-auto overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-8 text-center md:rounded-[3rem] md:p-24"
        initial={{ opacity: 0, transform: "translateY(32px)" }}
        whileInView={{ opacity: 1, transform: "translateY(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.svg')] opacity-20 pointer-events-none" />
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <h2
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Ready to watch something actually good?
          </h2>
          <p
            className="text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            Join thousands of users who stopped scrolling and started watching.
          </p>
          <Button
            size="lg"
            className="rounded-full px-10 h-14 text-lg font-semibold glow-accent active:scale-[0.97] transition-transform duration-[160ms]"
            onClick={() => router.push("/register")}
          >
            Get started — it's free
          </Button>
          <p className="mt-6 text-sm text-muted-foreground/60">No credit card required</p>
        </div>
      </motion.div>
    </section>
  )
}

export default function MarketingLanding() {
  return (
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary/30">
      <StickyHeader />
      <main>
        <Hero />
        <BentoFeatures />
        <HowItWorks />
        <MovieNight />
        <Showcase />
        <FAQ />
        <FinalCTA />
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:px-6 md:flex-row md:text-left">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <LogoMagicStroke className="h-7 w-auto opacity-70" />
            <span className="text-sm font-semibold text-zinc-500 tracking-tight">WatchWise</span>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-1">
            {[
              {
                label: "X / Twitter",
                href: "https://x.com/watchwise",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                ),
              },
              {
                label: "Instagram",
                href: "https://instagram.com/watchwise",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                ),
              },
              {
                label: "GitHub",
                href: "https://github.com/watchwise",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                ),
              },
              {
                label: "Discord",
                href: "https://discord.gg/watchwise",
                icon: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                ),
              },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="p-2.5 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200"
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div className="flex items-center gap-5 text-xs text-zinc-600">
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-zinc-400 transition-colors">
              Terms
            </a>
            <span>© {new Date().getFullYear()} WatchWise</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
