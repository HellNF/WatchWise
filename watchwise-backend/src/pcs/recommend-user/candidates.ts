import { fetchTrendingMovies, MovieCandidate } from "../../adapters/tmdb";
import { getRecentlyWatchedMovies } from "../../data/watch-history/repository";
import { ObjectId } from "mongodb";

export async function buildCandidatePool(
  userId: string,
  region: string,
  limit: number,
  excludeDays = 200 // 200 giorni: evita re-recommend
): Promise<MovieCandidate[]> {

  const [candidates, watched] = await Promise.all([
    fetchTrendingMovies(region, limit),
    getRecentlyWatchedMovies(new ObjectId(userId), excludeDays)
  ]);

  const watchedSet = new Set(watched);

  // HARD FILTER: rimuovi già visti
  return candidates.filter((c: MovieCandidate) => !watchedSet.has(c.movieId));
}
