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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@radix-ui/react-accordion"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Sparkles, Users, Zap, Star, Menu, SlidersHorizontal, Film, ArrowRight, CheckCircle2 } from "lucide-react"
import {LogoMagicStroke} from "@/components/LogoMagicStroke"
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

// --- Mock Data & Components ---
// (Dati invariati per coerenza)
type StaticMovie = { id: string; title: string; poster: string; rating: number }
const trendingMovies: StaticMovie[] = [
  { id: "1", title: "Oppenheimer", poster: "https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg", rating: 8.3 },
  { id: "2", title: "Barbie", poster: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg", rating: 7.2 },
  { id: "3", title: "Anyone but you", poster: "https://image.tmdb.org/t/p/w500/5qHoazZiaLe7oFBok7XlUhg96f2.jpg", rating: 8.1 },
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
  { q: "What is WatchWise?", a: "WatchWise is a premium movie and TV recommendation platform that blends your taste, mood, and group preferences." },
  { q: "How does group movie night work?", a: "Create or join a group by a code, and WatchWise calculates the perfect match instantly based on everyone's preferences." },
  { q: "Do I need to sign up?", a: "Yes, to get AI-powered recommendations and create groups (it's free)." },
  { q: "Is it really free?", a: "Currently yes. We may introduce a Pro tier for advanced analytics later." },
]

// --- UI Primitives Refined ---

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
    <div className={cn(
      "relative overflow-hidden rounded-3xl border border-white/10 shadow-xl backdrop-blur-md transition-all duration-300",
      gradient ? "bg-gradient-to-br from-white/5 to-white/0" : "bg-card/40",
      className
    )}>
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
    return scrollY.onChange((latest) => setScrolled(latest > 20))
  }, [scrollY])

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadFromStorage = () => {
      const raw = localStorage.getItem("watchwise-user")
      const hasToken = Boolean(localStorage.getItem("watchwise-token"))
      setIsLoggedIn(Boolean(raw) || hasToken)
      if (raw) {
        try { setUser(JSON.parse(raw)) } catch { setUser(null) }
      } else {
        setUser(null)
      }
    }

    loadFromStorage()

    const onStorage = () => loadFromStorage()
    window.addEventListener("watchwise-auth-changed", onStorage)

    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setTimeout(loadFromStorage, 200)
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false)
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("watchwise-auth-changed", onStorage)
    }
  }, [])

  const avatarSrc = user?.avatar
    ? (AVATAR_OPTIONS.find(opt => opt.id === user.avatar)?.src ?? "/friendly-avatar-illustration.jpg")
    : "/friendly-avatar-illustration.jpg"

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full transition-all duration-300 border-b",
      scrolled ? "bg-background/80 backdrop-blur-xl border-border/40 py-2" : "bg-transparent border-transparent py-4"
    )}>
      <div className="flex items-center justify-between px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="p-1.5 rounded-lg">
            <LogoMagicStroke className="h-10 w-auto" />
          </div>
          <span className="text-xl font-bold tracking-tight">WatchWise</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Movie Night", "FAQ"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
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
                onClick={() => router.push('/home')}
              >
                Go to app
              </Button>
              <button
                className="focus:outline-none"
                onClick={() => router.push("/profile")}
                aria-label="Go to profile"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/60 transition-all">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user?.username ? user.username.slice(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="hidden md:inline-flex hover:bg-white/5" size="sm" onClick={() => router.push('/login')}>
                Sign in
              </Button>
              <Button className="glow-accent font-semibold rounded-full px-6" size="sm" onClick={() => router.push('/register')}>
                Get Started
              </Button>
            </>
          )}
          <button className="md:hidden p-2 text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu />
          </button>
        </div>
      </div>
      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-background border-b border-border/40"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {["Features", "Movie Night", "FAQ"].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-lg font-medium" onClick={() => setMenuOpen(false)}>{item}</a>
              ))}
              <div className="h-px bg-border/50 my-2" />
              {isLoggedIn ? (
                <>
                  <Button className="w-full justify-start glow-accent rounded-full" onClick={() => { router.push('/home'); setMenuOpen(false) }}>
                    Go to app
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => { router.push('/profile'); setMenuOpen(false) }}>
                    Profile
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full justify-start" onClick={() => { router.push('/login'); setMenuOpen(false) }}>
                    Sign in
                  </Button>
                  <Button className="w-full justify-start glow-accent rounded-full" onClick={() => { router.push('/register'); setMenuOpen(false) }}>
                    Get Started
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
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[800px] h-[600px] bg-accent/10 blur-[100px] rounded-full opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-6 tracking-wide uppercase">
            <Sparkles className="w-3 h-3" />
            AI Powered Recommendations
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Stop searching. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-mint to-accent animate-gradient">
              Start watching.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
            The intelligent platform that blends your unique taste, current mood, and group dynamics to find the perfect movie instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="rounded-full px-8 text-base glow-accent h-12">
              <Link href="/register">Create free account</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 text-base border-white/10 hover:bg-white/5 h-12 group">
              <Link href="/home" className="flex items-center">
                <span className="mr-2">View Demo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px]">
                  <Users className="w-4 h-4 opacity-50" />
                </div>
              ))}
            </div>
            <p>Trusted by 10,000+ movie lovers</p>
          </div>
        </motion.div>

        {/* Hero Visual - Floating Posters */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative h-[500px] w-full hidden lg:block perspective-1000"
        >
           <motion.div
             animate={{ y: [0, -15, 0] }}
             transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
             className="relative w-full h-full"
           >
              {/* Decorative elements */}
              <div className="absolute top-10 right-10 w-20 h-20 bg-mint/30 blur-2xl rounded-full" />
              {/* Back Poster */}
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
              {/* Main Poster */}
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
              {/* Front Small Poster */}
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
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <SectionBadge>Features</SectionBadge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to <br/> decide what to watch.</h2>
          <p className="text-muted-foreground text-lg">We don't just show you movies. We help you choose.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          {/* Large Card */}
          <GlassCard className="md:col-span-2 row-span-1 md:row-span-2 p-8 flex flex-col justify-between group overflow-hidden" gradient>
            <div className="relative z-10">
              <div className="bg-accent/20 w-fit p-3 rounded-xl mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-3xl font-bold mb-2">Hyper-Personalized</h3>
              <p className="text-muted-foreground max-w-md">Our AI analyzes over 50 data points including your past ratings, current mood, and hidden genres to find your next favorite.</p>
            </div>
            {/* Visual Abstract */}
            <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
            <div className="absolute -right-10 -bottom-20 opacity-50 group-hover:opacity-80 group-hover:-translate-y-2 transition-all duration-700">
               <div className="grid grid-cols-2 gap-2 transform -rotate-12">
                  {[...trendingMovies, ...topRatedMovies].slice(0,4).map(m => (
                    <img key={m.id} src={m.poster} className="w-32 h-48 rounded-lg object-cover shadow-lg opacity-80" />
                  ))}
               </div>
            </div>
          </GlassCard>

          {/* Side Card 1 */}
          <GlassCard className="p-8 flex flex-col justify-center group hover:border-mint/50 transition-colors">
            <div className="bg-mint/20 w-fit p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-mint" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quick Actions</h3>
            <p className="text-muted-foreground text-sm">Save to watchlist, mark as seen, or watch trailer in one tap.</p>
          </GlassCard>

           {/* Side Card 2 (Movie Night Teaser) */}
           <GlassCard className="p-8 flex flex-col justify-center group hover:border-primary/50 transition-colors">
            <div className="bg-primary/20 w-fit p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Group Sync</h3>
            <p className="text-muted-foreground text-sm">Sync with friends. We find the one movie everyone agrees on.</p>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { num: "01", title: "Set your Mood", desc: "Chill, Intense, or Sad? Tell us how you feel.", icon: <SlidersHorizontal className="w-5 h-5" /> },
    { num: "02", title: "AI Magic", desc: "We cross-reference 50k+ titles with your taste.", icon: <Sparkles className="w-5 h-5" /> },
    { num: "03", title: "Watch", desc: "Get a ranked shortlist. No more scrolling.", icon: <Film className="w-5 h-5" /> },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-background via-white/[0.02] to-background border-y border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <SectionBadge>Process</SectionBadge>
          <h2 className="text-3xl font-bold">From "Idk" to "Play" in seconds</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent border-t border-dashed border-white/20" />
          
          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center group">
              <div className="w-12 h-12 rounded-full bg-background border border-border/50 shadow-lg flex items-center justify-center mb-6 relative z-10 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                 {step.icon}
              </div>
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-6 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <span className="text-6xl font-bold text-primary/5 select-none">{step.num}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm px-4">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MovieNight() {
  return (
    <section id="movie-night" className="py-32 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8 z-10">
          <SectionBadge>Movie Night Mode</SectionBadge>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            End the <span className="text-primary">infinite scroll</span> <br />
            arguments.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Create a room, invite friends, and swipe. WatchWise aggregates everyone's preferences to calculate a mathematical "Consensus Score" for every movie.
          </p>
          <ul className="space-y-4 text-muted-foreground">
            {["Real-time voting sync", "Veto power for premium users", "Filter by streaming service"].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-mint/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-mint" />
                </div>
                {item}
              </li>
            ))}
          </ul>
          <Button size="lg" className="glow-primary rounded-full px-8 mt-4">Start a Group Session</Button>
        </div>

        {/* Interactive Visual */}
        <div className="flex-1 relative w-full flex justify-center">
           <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-40" />
           
           <GlassCard className="w-[380px] p-6 relative z-10 animate-float">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <div>
                   <h4 className="font-bold text-lg">Friday Night Squad</h4>
                   <p className="text-xs text-muted-foreground">4 members active</p>
                </div>
                <div className="flex -space-x-2">
                   {[1,2,3,4].map(n => <div key={n} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-card" />)}
                </div>
              </div>
              
              {/* Result */}
              <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex gap-4">
                 <img src={trendingMovies[2].poster} className="w-20 rounded-lg shadow-sm" />
                 <div className="flex-1">
                    <div className="flex justify-between items-start">
                       <h5 className="font-bold text-sm">{trendingMovies[2].title}</h5>
                       <Badge className="bg-mint/20 text-mint border-0 hover:bg-mint/20">Winner</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Action • Sci-Fi</p>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                       <motion.div 
                          initial={{ width: 0 }} 
                          whileInView={{ width: "91%" }} 
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="bg-mint h-full" 
                       />
                    </div>
                    <div className="flex justify-between mt-1">
                       <span className="text-[10px] text-muted-foreground">Consensus</span>
                       <span className="text-[10px] font-bold text-mint">91%</span>
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
      <div className="flex items-center justify-between mb-6 px-6 md:px-0">
        <h3 className="text-2xl font-bold">{title}</h3>
        <Link href={"/search?cat=" + category} className="text-accent text-sm font-medium hover:underline">See all</Link>
      </div>
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-4 px-6 md:px-0">
          {movies.map((movie) => (
            <CarouselItem key={movie.movieId} className="pl-4 basis-[160px] md:basis-[200px] lg:basis-[240px]">
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
    </div>
  )
}

function Showcase() {
  return (
    <section className="max-w-7xl mx-auto py-20">
      <ShowcaseRow title="Trending Now" category="trending" />
      <ShowcaseRow title="All-Time Favorites" category="top_rated" />
    </section>
  )
}

function FAQ() {
  return (
    <section id="faq" className="py-24 max-w-3xl mx-auto px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground">Everything you need to know about the product.</p>
      </div>
      <Accordion type="single" collapsible className="space-y-4">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border border-white/5 bg-white/[0.02] rounded-xl px-4 data-[state=open]:bg-white/[0.05] transition-colors">
            <AccordionTrigger className="hover:no-underline py-4 text-left font-medium text-lg [&[data-state=open]>svg]:rotate-180">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-muted-foreground text-base leading-relaxed">
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
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-b from-zinc-900 to-black border border-white/10 p-12 md:p-24 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
         <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
         
         <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Ready to watch something <br/> actually good?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl">Join thousands of users who stopped scrolling and started watching.</p>
            <div className="flex gap-4">
              <Button size="lg" className="rounded-full px-10 h-14 text-lg font-semibold glow-accent" onClick={() => {router.push('/register')}} >Get Started Free</Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground/60">No credit card required • Cancel anytime</p>
         </div>
      </div>
    </section>
  )
}

export default function MarketingLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
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
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <LogoMagicStroke className="h-7 w-auto opacity-70" />
            <span className="text-sm font-semibold text-zinc-500 tracking-tight">WatchWise</span>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-1">
            {[
              { label: "X / Twitter", href: "https://x.com/watchwise", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg> },
              { label: "Instagram", href: "https://instagram.com/watchwise", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
              { label: "GitHub", href: "https://github.com/watchwise", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
              { label: "Discord", href: "https://discord.gg/watchwise", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="p-2.5 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200">
                {s.icon}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div className="flex items-center gap-5 text-xs text-zinc-600">
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-zinc-400 transition-colors">Terms</a>
            <span>© {new Date().getFullYear()} WatchWise</span>
          </div>
        </div>
      </footer>
    </div>
  )
}