import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import {
  HomePageClient,
  type HomeCategory,
  type HomeHeroItem,
  type HomeMovieItem,
} from "@/components/home-page"
import { Header } from "@/components/header"
import { DailyMoodOverlay } from "@/components/daily-mood-overlay"
import {
  getMovieDetails,
  getMoviesByCategory,
  getMovieImages,
  getRecommendedMovies,
  getRecommendations,
  getWatchHistory,
  type MovieListItem,
  type MoviesCategory,
  type RecommendationScoredMovie,
  type WatchHistoryEntry,
} from "@/lib/api"

// --- HELPERS ---

const normalizeMovieId = (value: string) =>
  value.includes(":") ? value.split(":").pop() ?? value : value

const mapListItem = (item: MovieListItem): HomeMovieItem => ({
  id: normalizeMovieId(item.movieId),
  title: item.title,
  poster: item.posterPath,
  year: item.year,
  rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
})

const mapRecommendation = (
  entry: RecommendationScoredMovie,
  index: number,
  total: number
): HomeMovieItem => ({
  id: normalizeMovieId(entry.movie.movieId),
  title: entry.movie.title,
  poster: entry.movie.posterPath,
  year: entry.movie.year,
  rating: Number.isFinite(entry.movie.voteAverage) ? entry.movie.voteAverage : undefined,
  reason: entry.reasons?.[0], // e.g., "Because you watched..."
  isDiscovery: index === total - 1, // Last item acts as a "Discovery" card
})

function pickBackdrop(images?: { backdrops?: { file_path: string; width: number }[] }) {
  if (!images?.backdrops?.length) return undefined
  // Prefer the widest high-res image
  const sorted = [...images.backdrops].sort((a, b) => b.width - a.width)
  const best = sorted[0]
  if (!best?.file_path) return undefined
  return `https://image.tmdb.org/t/p/w1280${best.file_path}`
}

// --- SAFE FETCHERS ---

async function safeCategory(category: MoviesCategory) {
  try {
    return await getMoviesByCategory(category, { limit: 15 })
  } catch {
    return []
  }
}

async function safeRecommendations() {
  try {
    const data = await getRecommendations({ limit: 15 })
    return data.topK ?? []
  } catch {
    return []
  }
}

async function safeWatchHistory() {
  try {
    return await getWatchHistory()
  } catch {
    return [] as WatchHistoryEntry[]
  }
}

// --- HERO LOGIC ---

function pickLastHighRated(history: WatchHistoryEntry[]) {
  if (!history.length) return undefined

  // Sort by most recently watched
  const sorted = [...history].sort((a, b) => {
    const aTime = a.watchedAt ? new Date(a.watchedAt).getTime() : 0
    const bTime = b.watchedAt ? new Date(b.watchedAt).getTime() : 0
    return bTime - aTime
  })

  // Find the most recent movie rated >= 8
  return sorted.find((entry) => (entry.rating ?? 0) >= 8)?.movieId
}

async function safeHeroSource(limit: number) {
  // 1. Try to build a hero section based on user's last favorite movie
  const history = await safeWatchHistory()
  const lastHighRatedId = pickLastHighRated(history)
  
  if (lastHighRatedId) {
    try {
      const recs = await getRecommendedMovies(lastHighRatedId, limit)
      if (recs.length) return { list: recs, badge: "Based on your history" }
    } catch {
      // fallback
    }
  }

  // 2. Fallback to Trending or Popular
  const [trending, popular] = await Promise.all([
    safeCategory("trending"),
    safeCategory("popular"),
  ])
  
  return {
    list: trending.length ? trending : popular,
    badge: trending.length ? "Trending Now" : "Popular Hits",
  }
}

// --- MAIN PAGE COMPONENT ---

export default async function HomePage() {
  // Parallel Data Fetching
  const [popular, trending, topRated, nowPlaying, upcoming, recommended, heroSource] =
    await Promise.all([
      safeCategory("popular"),
      safeCategory("trending"),
      safeCategory("top_rated"),
      safeCategory("now_playing"),
      safeCategory("upcoming"),
      safeRecommendations(),
      safeHeroSource(10), // Fetch top 10 for Hero Carousel
    ])

  // Process Hero Items (Fetch Backdrops & Details)
  const heroBase = heroSource.list.slice(0, 10)
  const heroItems: HomeHeroItem[] = await Promise.all(
    heroBase.map(async (item, index) => {
      let overview: string | undefined
      let backdrop: string | undefined

      try {
        const [detailsResult, imagesResult] = await Promise.allSettled([
          getMovieDetails(item.movieId),
          getMovieImages(item.movieId),
        ])

        if (detailsResult.status === "fulfilled") {
          overview = detailsResult.value.overview
        }

        if (imagesResult.status === "fulfilled") {
          backdrop = pickBackdrop(imagesResult.value)
        }
      } catch {
        // Silent fail for UI continuity
      }

      return {
        id: normalizeMovieId(item.movieId),
        title: item.title,
        backdrop, // High-res image for the big hero card
        poster: item.posterPath,
        year: item.year,
        rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
        overview,
        badge: index === 0 ? "Featured" : heroSource.badge,
      }
    })
  )

  // Map Categories
  const recommendedItems = recommended.length
    ? recommended.map((entry, index, list) =>
        mapRecommendation(entry, index, list.length)
      )
    : popular.map(mapListItem)

  const categories: HomeCategory[] = [
    {
      key: "suggested",
      title: "Top Picks for You",
      subtitle: "Curated based on your taste",
      items: recommendedItems,
      href: "/suggestions",
    },
    {
      key: "trending",
      title: "Trending Now",
      subtitle: "What everyone is watching",
      items: trending.map(mapListItem),
      href: "/movie?category=trending",
    },
    {
      key: "popular",
      title: "Popular Hits",
      subtitle: "All-time favorites",
      items: popular.map(mapListItem),
      href: "/movie?category=popular",
    },
    {
      key: "top-rated",
      title: "Critically Acclaimed",
      subtitle: "Highest rated movies",
      items: topRated.map(mapListItem),
      href: "/movie?category=top_rated",
    },
    {
      key: "now-playing",
      title: "In Theaters",
      subtitle: "Watch it on the big screen",
      items: nowPlaying.map(mapListItem),
      href: "/movie?category=now_playing",
    },
    {
      key: "upcoming",
      title: "Coming Soon",
      subtitle: "Add to your watchlist",
      items: upcoming.map(mapListItem),
      href: "/movie?category=upcoming",
    },
  ]

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      
      {/* --- BACKGROUND AMBIENCE (Consistent with Auth Pages) --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      
      {/* Subtle ambient orbs for depth */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- CONTENT --- */}
      <div className="relative z-10">
        <Header />
        <DailyMoodOverlay />
        
        {/* Pass data to Client Component for rendering Carousel & Rows */}
        <HomePageClient heroItems={heroItems} categories={categories} />
        
        <Footer />
        <BottomNav />
      </div>
    </main>
  )
}