import { BottomNav } from "@/components/bottom-nav"
import {
  HomePageClient,
  type HomeCategory,
  type HomeHeroItem,
  type HomeMovieItem,
} from "@/components/home-page"
import { Header } from "@/components/header"
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
  reason: entry.reasons?.[0],
  isDiscovery: index === total - 1,
})

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

function pickLastHighRated(history: WatchHistoryEntry[]) {
  if (!history.length) return undefined

  const sorted = [...history].sort((a, b) => {
    const aTime = a.watchedAt ? new Date(a.watchedAt).getTime() : 0
    const bTime = b.watchedAt ? new Date(b.watchedAt).getTime() : 0
    return bTime - aTime
  })

  return sorted.find((entry) => (entry.rating ?? 0) >= 8)?.movieId
}

async function safeHeroSource(limit: number) {
  const history = await safeWatchHistory()
  const lastHighRatedId = pickLastHighRated(history)
  if (lastHighRatedId) {
    try {
      const recs = await getRecommendedMovies(lastHighRatedId, limit)
      if (recs.length) return { list: recs, badge: "Consigliati per te" }
    } catch {
      // fallback below
    }
  }

  const [trending, popular] = await Promise.all([
    safeCategory("trending"),
    safeCategory("popular"),
  ])
  return {
    list: trending.length ? trending : popular,
    badge: trending.length ? "Trending" : "Popolari",
  }
}

function pickBackdrop(images?: { backdrops?: { file_path: string; width: number }[] }) {
  if (!images?.backdrops?.length) return undefined
  const sorted = [...images.backdrops].sort((a, b) => b.width - a.width)
  const best = sorted[0]
  if (!best?.file_path) return undefined
  return `https://image.tmdb.org/t/p/w1280${best.file_path}`
}

export default async function HomePage() {
  const [popular, trending, topRated, nowPlaying, upcoming, recommended, heroSource] =
    await Promise.all([
      safeCategory("popular"),
      safeCategory("trending"),
      safeCategory("top_rated"),
      safeCategory("now_playing"),
      safeCategory("upcoming"),
      safeRecommendations(),
      safeHeroSource(10),
    ])

  const heroBase = heroSource.list.slice(0, 10)
  const heroBadge = heroSource.badge
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
        overview = undefined
      }

      return {
        id: normalizeMovieId(item.movieId),
        title: item.title,
        backdrop,
        poster: item.posterPath,
        year: item.year,
        rating: Number.isFinite(item.voteAverage) ? item.voteAverage : undefined,
        overview,
        badge: index === 0 ? "In evidenza" : heroBadge,
      }
    })
  )

  const recommendedItems = recommended.length
    ? recommended.map((entry, index, list) =>
        mapRecommendation(entry, index, list.length)
      )
    : popular.map(mapListItem)

  const categories: HomeCategory[] = [
    {
      key: "suggested",
      title: "Suggeriti per te",
      subtitle: "Scelti su misura",
      items: recommendedItems,
      href: "/suggestions",
    },
    {
      key: "trending",
      title: "Trending",
      subtitle: "In tendenza ora",
      items: trending.map(mapListItem),
      href: "/movie?category=trending",
    },
    {
      key: "popular",
      title: "Popolari",
      subtitle: "I più visti",
      items: popular.map(mapListItem),
      href: "/movie?category=popular",
    },
    {
      key: "top-rated",
      title: "Top Rated",
      subtitle: "Valutazioni altissime",
      items: topRated.map(mapListItem),
      href: "/movie?category=top_rated",
    },
    {
      key: "now-playing",
      title: "Al cinema adesso",
      subtitle: "Appena usciti",
      items: nowPlaying.map(mapListItem),
      href: "/movie?category=now_playing",
    },
    {
      key: "upcoming",
      title: "In arrivo",
      subtitle: "Coming soon",
      items: upcoming.map(mapListItem),
      href: "/movie?category=upcoming",
    },
  ]

  return (
    <main className="min-h-screen pb-28">
      <Header />
      <HomePageClient heroItems={heroItems} categories={categories} />
      <BottomNav />
    </main>
  )
}
