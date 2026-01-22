type ApiErrorDetails = {
  status: number
  statusText: string
  message?: string
  body?: unknown
}

export type ApiError = Error & ApiErrorDetails

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  headers?: HeadersInit
}

const DEV_AUTH_HEADER = "Bearer dev"

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
}

function getApiRoot() {
  const baseUrl = getBaseUrl()
  if (!baseUrl) return ""
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return ""
  const entries = Object.entries(params).filter(([, value]) => value !== undefined)
  if (!entries.length) return ""
  const searchParams = new URLSearchParams()
  for (const [key, value] of entries) {
    searchParams.set(key, String(value))
  }
  return `?${searchParams.toString()}`
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const apiRoot = getApiRoot()
  if (!apiRoot) {
    const error = new Error("Missing NEXT_PUBLIC_API_BASE_URL") as ApiError
    error.status = 0
    error.statusText = "CONFIG"
    throw error
  }

  const url = `${apiRoot}${path.startsWith("/") ? "" : "/"}${path}`
  const headers = new Headers({ Authorization: DEV_AUTH_HEADER })

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => headers.set(key, value))
    } else if (Array.isArray(options.headers)) {
      for (const [key, value] of options.headers) {
        headers.set(key, value)
      }
    } else {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value as string)
      }
    }
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const error = new Error("API request failed") as ApiError
    error.status = response.status
    error.statusText = response.statusText
    error.body = data
    if (typeof data === "object" && data && "message" in (data as any)) {
      error.message = String((data as any).message)
    }
    throw error
  }

  return data as T
}

export type RecommendationRequest = {
  context?: Record<string, unknown>
  limit?: number
  offset?: number
}

export type RecommendationMovieCandidate = {
  movieId: string
  title: string
  year?: number
  popularity: number
  voteAverage: number
  voteCount: number
  posterPath?: string
}

export type RecommendationScoredMovie = {
  movie: RecommendationMovieCandidate
  score: number
  reasons: string[]
  serendipity?: boolean
}

export type RecommendationResponse = {
  recommended: RecommendationScoredMovie
  topK: RecommendationScoredMovie[]
}

export type GroupSummary = {
  id: string
  name: string
  members: string[]
  hostId?: string
  joinCode?: string
  joinCodeExpiresAt?: string
  status?: "open" | "locked" | "closed"
}

export type GroupQuestionnaireMember = {
  userId: string
  completed: boolean
  lastCompletedAt?: string | null
}

export type GroupQuestionnaireStatus = {
  groupId: string
  dayStart: string
  total: number
  completed: number
  allComplete: boolean
  members: GroupQuestionnaireMember[]
}

export type GroupSession = {
  id: string
  groupId: string
  context?: Record<string, unknown>
  createdAt: string
  selectedMovieId?: string
  status?: "pending" | "started"
  softStartAt?: string
  softStartTimeoutMinutes?: number
  startedAt?: string
}

export type GroupSoftstartStatus = {
  groupId: string
  sessionId: string
  ready: boolean
  reason: "all_complete" | "timeout" | "pending"
  softStartAt: string
  timeoutAt: string
  questionnaire: GroupQuestionnaireStatus
}

export type GroupRecommendationMovie = RecommendationScoredMovie & {
  compatibility: number
  outsider?: boolean
}

export type GroupRecommendationResponse = {
  recommended: GroupRecommendationMovie
  topK: GroupRecommendationMovie[]
  buckets: {
    high: GroupRecommendationMovie[]
    medium: GroupRecommendationMovie[]
    explore: GroupRecommendationMovie[]
  }
  outsiders: GroupRecommendationMovie[]
}

export type PreferenceEvent = {
  type: string
  value: string
  weight?: number
  source?: string
}

export type QuestionnairePreferences = {
  mood: string
  energy: string
  company: string
  duration: string
  genres: string[]
  novelty: string
}

export type PreferenceEventRecord = PreferenceEvent & {
  id?: string
  createdAt?: string
}

export type WatchHistoryItem = {
  movieId: string
  watchedAt?: string
  rating?: number
}

export type WatchHistoryEntry = {
  id?: string
  movieId: string
  watchedAt?: string
  rating?: number
  completed?: boolean
}

export type Profile = {
  id: string
  email: string
  username: string
  avatar: string
  authProvider?: string
}

export type PatchProfileInput = Partial<Pick<Profile, "username" | "avatar">>

export type MovieListItem = {
  movieId: string
  title: string
  year?: number
  voteAverage: number
  posterPath?: string
}

export type MovieDetails = {
  movieId: string
  title: string
  year?: number
  rating?: number
  posterPath?: string
  overview?: string
  duration?: number
  genres?: string[]
  director?: string
  directorId?: number
  directorImage?: string
  actorsDetailed?: { id: number; name: string; image?: string }[]
}

export type StreamingAvailability = {
  region: string
  platforms: { platform: string; type: "subscription" | "rent" | "buy" }[]
}

export type MovieImages = {
  backdrops: { file_path: string; width: number; height: number }[]
  posters: { file_path: string; width: number; height: number }[]
  logos: { file_path: string; width: number; height: number }[]
}

export type MovieVideos = {
  results: { id: string; key: string; name: string; site: string; type: string }[]
}

export type WatchProviders = {
  results: {
    [region: string]: {
      flatrate?: { provider_name: string; logo_path?: string }[]
      rent?: { provider_name: string; logo_path?: string }[]
      buy?: { provider_name: string; logo_path?: string }[]
    }
  }
}

export type MovieGenre = { id: number; name: string }

export type UserList = {
  id: string
  name: string
  slug: string
  isDefault: boolean
}

export type UserListItem = {
  id: string
  movieId: string
  addedAt: string
}

export type PersonSearchResult = {
  id: number
  name: string
  known_for_department?: string
  profile_path?: string
}

export type MoviesCategory =
  | "popular"
  | "now_playing"
  | "top_rated"
  | "trending"
  | "upcoming"

export async function getRecommendations(body: RecommendationRequest = {}) {
  return requestJson<RecommendationResponse>("/pcs/recommend/user", {
    method: "POST",
    body,
  })
}

export async function getPreferences() {
  return requestJson<PreferenceEventRecord[]>("/preferences")
}

export async function postPreference(data: PreferenceEvent) {
  return requestJson<unknown>("/preferences", {
    method: "POST",
    body: data,
  })
}

export async function deletePreference(id: string) {
  return requestJson<{ ok: boolean }>(`/preferences/${id}`, {
    method: "DELETE",
  })
}

export async function deletePreferencesBySource(source: string) {
  return requestJson<{ ok: boolean }>(`/preferences/source/${source}`, {
    method: "DELETE",
  })
}

export async function postPreferenceEvents(events: PreferenceEvent[]) {
  return requestJson<{ ok: boolean; count?: number }>("/preferences/bulk", {
    method: "POST",
    body: { events },
  })
}

export async function postQuestionnairePreferences(prefs: QuestionnairePreferences) {
  const events: PreferenceEvent[] = []

  if (prefs.mood) {
    events.push({
      type: "mood",
      value: prefs.mood,
      weight: 0.9,
      source: "questionnaire",
    })
  }

  if (prefs.energy) {
    events.push({
      type: "energy",
      value: prefs.energy,
      weight: 0.6,
      source: "questionnaire",
    })
  }

  if (prefs.company) {
    events.push({
      type: "company",
      value: prefs.company,
      weight: 0.5,
      source: "questionnaire",
    })
  }

  if (prefs.duration) {
    events.push({
      type: "duration",
      value: prefs.duration,
      weight: 0.5,
      source: "questionnaire",
    })
  }

  if (prefs.genres?.length) {
    const perGenre = 0.8 / prefs.genres.length
    for (const genre of prefs.genres) {
      events.push({
        type: "genre",
        value: genre,
        weight: perGenre,
        source: "questionnaire",
      })
    }
  }

  if (prefs.novelty) {
    events.push({
      type: "novelty",
      value: prefs.novelty,
      weight: 0.5,
      source: "questionnaire",
    })
  }

  if (!events.length) return
  await postPreferenceEvents(events)
}

export async function getWatchHistory() {
  return requestJson<WatchHistoryEntry[]>("/watch-history")
}

export async function postWatchHistory(data: WatchHistoryItem) {
  return requestJson<unknown>("/watch-history", {
    method: "POST",
    body: data,
  })
}

export async function deleteWatchHistory(id: string) {
  return requestJson<{ ok: boolean }>(`/watch-history/${id}`, {
    method: "DELETE",
  })
}

export async function getProfile() {
  return requestJson<Profile>("/users/me")
}

export async function getUserById(userId: string) {
  return requestJson<Profile>(`/users/${userId}`)
}

export async function patchProfile(data: PatchProfileInput) {
  return requestJson<{ ok: boolean }>("/users/me", {
    method: "PATCH",
    body: data,
  })
}

export async function getMovieGenres() {
  return requestJson<MovieGenre[]>("/movies/genres")
}

export async function getGroups() {
  return requestJson<GroupSummary[]>("/groups")
}

export async function createGroup(data: { name: string; memberIds?: string[] }) {
  return requestJson<GroupSummary>("/groups", {
    method: "POST",
    body: data,
  })
}

export async function joinGroup(code: string) {
  return requestJson<{ ok: boolean; groupId: string }>("/groups/join", {
    method: "POST",
    body: { code },
  })
}

export async function getGroup(groupId: string) {
  return requestJson<GroupSummary>(`/groups/${groupId}`)
}

export async function leaveGroup(groupId: string) {
  return requestJson<{ ok: boolean }>(`/groups/${groupId}/members/me`, {
    method: "DELETE",
  })
}

export async function getGroupQuestionnaireStatus(groupId: string) {
  return requestJson<GroupQuestionnaireStatus>(
    `/groups/${groupId}/questionnaire-status`
  )
}

export async function createGroupSession(groupId: string, context?: Record<string, unknown>) {
  return requestJson<GroupSession>(`/groups/${groupId}/sessions`, {
    method: "POST",
    body: { context },
  })
}

export async function getGroupSoftstartStatus(groupId: string, sessionId: string) {
  return requestJson<GroupSoftstartStatus>(
    `/groups/${groupId}/sessions/${sessionId}/softstart/status`
  )
}

export async function startGroupSession(groupId: string, sessionId: string) {
  return requestJson<{ ok: boolean; startedAt: string }>(
    `/groups/${groupId}/sessions/${sessionId}/start`,
    { method: "POST" }
  )
}

export async function getGroupRecommendations(
  groupId: string,
  sessionId: string,
  data?: RecommendationRequest
) {
  return requestJson<GroupRecommendationResponse>("/pcs/recommend/group", {
    method: "POST",
    body: {
      groupId,
      sessionId,
      ...data,
    },
  })
}

export async function getMoviesByCategory(
  category: MoviesCategory,
  params?: { region?: string; limit?: number; page?: number }
) {
  const endpointMap: Record<MoviesCategory, string> = {
    popular: "/movies/popular",
    now_playing: "/movies/now-playing",
    top_rated: "/movies/top-rated",
    trending: "/movies/trending",
    upcoming: "/movies/upcoming",
  }
  const query = buildQuery(params)
  return requestJson<MovieListItem[]>(`${endpointMap[category]}${query}`)
}

export async function getMovieDetails(movieId: string) {
  return requestJson<MovieDetails>(`/movies/${movieId}`)
}

export async function getMovieStreaming(movieId: string, region = "IT") {
  const query = buildQuery({ region })
  return requestJson<StreamingAvailability | null>(
    `/movies/${movieId}/streaming${query}`
  )
}

export async function getMovieImages(movieId: string) {
  return requestJson<MovieImages>(`/movies/${movieId}/images`)
}

export async function getMovieVideos(movieId: string, language = "it-IT") {
  const query = buildQuery({ language })
  return requestJson<MovieVideos>(`/movies/${movieId}/videos${query}`)
}

export async function getMovieWatchProviders(movieId: string) {
  return requestJson<WatchProviders>(`/movies/${movieId}/watch-providers`)
}

export async function getSimilarMovies(movieId: string, limit = 12) {
  const query = buildQuery({ limit })
  return requestJson<MovieListItem[]>(`/movies/${movieId}/similar${query}`)
}

export async function getRecommendedMovies(movieId: string, limit = 12) {
  const query = buildQuery({ limit })
  return requestJson<MovieListItem[]>(
    `/movies/${movieId}/recommendations${query}`
  )
}

export async function getMoviesByPerson(
  role: "actor" | "director",
  personId: string,
  params?: { region?: string; limit?: number }
) {
  const query = buildQuery(params)
  return requestJson<MovieListItem[]>(
    `/movies/by-${role}/${personId}${query}`
  )
}

export async function getMoviesByGenre(
  genreId: number | string,
  params?: { region?: string; limit?: number }
) {
  const query = buildQuery(params)
  return requestJson<MovieListItem[]>(`/movies/by-genre/${genreId}${query}`)
}

export async function getLists() {
  return requestJson<
    Array<{ id: string; name: string; slug: string; isDefault: boolean }>
  >("/lists")
}

export async function createList(name: string) {
  return requestJson<{ id: string; name: string; slug: string; isDefault: boolean }>(
    "/lists",
    {
      method: "POST",
      body: { name },
    }
  )
}

export async function addListItem(listId: string, movieId: string) {
  return requestJson<{ ok: boolean; created: boolean }>(
    `/lists/${listId}/items`,
    {
      method: "POST",
      body: { movieId },
    }
  )
}

export async function deleteList(listId: string) {
  return requestJson<{ ok: boolean }>(`/lists/${listId}`, {
    method: "DELETE",
  })
}

export async function getListItems(listId: string) {
  return requestJson<UserListItem[]>(`/lists/${listId}/items`)
}

export async function removeListItem(listId: string, movieId: string) {
  return requestJson<{ ok: boolean }>(`/lists/${listId}/items/${movieId}`, {
    method: "DELETE",
  })
}

export async function searchPeople(query: string, limit = 5) {
  const params = buildQuery({ q: query, limit })
  return requestJson<PersonSearchResult[]>(`/people/search${params}`)
}

export async function searchMovies(query: string, limit = 10) {
  const params = buildQuery({ q: query, limit })
  return requestJson<MovieListItem[]>(`/movies/search${params}`)
}
