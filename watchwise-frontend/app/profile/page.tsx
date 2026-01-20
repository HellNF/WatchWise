"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  getLists,
  getMovieGenres,
  getPreferences,
  getProfile,
  postPreference,
  searchPeople,
  type PreferenceEventRecord,
  type Profile,
  type UserList,
} from "@/lib/api"
import {
  Settings,
  LogOut,
  BarChart3,
  X,
  Users,
  Sparkles,
  Laugh,
  Film,
  Heart,
  SlidersHorizontal
} from "lucide-react"
import { toast } from "sonner"

const moodOptions = [
  "Chill",
  "Mind-bending",
  "Cozy",
  "Adrenaline",
  "Feel-good",
  "Dark",
  "Romantic",
]

const AVATAR_MAP: Record<string, string> = {
  avatar_01: "/friendly-avatar-illustration.jpg",
  avatar_02: "/placeholder-user.jpg",
  avatar_03: "/placeholder.jpg",
}

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185"

type PersonCard = {
  id?: number
  name: string
  image?: string
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function ChoicePill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs sm:text-sm",
        "transition-all duration-200 select-none",
        "border shadow-sm",
        active
          ? "bg-primary/20 border-primary/40 text-foreground shadow-primary/10"
          : "bg-background/50 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/35 hover:border-primary/20",
        "hover:-translate-y-px active:translate-y-0"
      )}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full opacity-0 blur-xl transition-opacity duration-300",
          active ? "opacity-100 bg-primary/15" : "group-hover:opacity-60 bg-primary/10"
        )}
      />
      <span className="relative">{children}</span>
    </button>
  )
}

function SuggestionDropdown({
  visible,
  loading,
  items,
  onPick,
}: {
  visible: boolean
  loading: boolean
  items: PersonCard[]
  onPick: (name: string) => void
}) {
  if (!visible) return null

  return (
    <div className="mt-2 rounded-2xl border border-border/60 bg-background/80 p-2 shadow-lg backdrop-blur">
      {loading ? (
        <p className="text-xs text-muted-foreground px-2 py-2">Loading...</p>
      ) : items.length ? (
        <div className="grid gap-1">
          {items.map((s) => (
            <button
              key={`s-${s.id ?? s.name}`}
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-xl px-2 py-2 text-left",
                "transition hover:bg-secondary/40"
              )}
              onClick={() => onPick(s.name)}
            >
              <img
                src={s.image || "/placeholder-user.jpg"}
                alt={s.name}
                className="h-8 w-8 rounded-full object-cover border border-border/60"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-4 truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground leading-4">Select</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-2 py-2">No results.</p>
      )}
    </div>
  )
}

function PersonGrid({
  items,
  onRemove,
}: {
  items: PersonCard[]
  onRemove: (name: string) => void
}) {
  if (!items.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((p) => (
        <div
          key={p.name}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/60",
            "bg-background/60 p-3 shadow-sm transition",
            "hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <img
              src={p.image || "/placeholder-user.jpg"}
              alt={p.name}
              className="h-14 w-14 rounded-full object-cover border border-border/60"
            />
            <span className="text-xs text-center text-muted-foreground line-clamp-1">
              {p.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onRemove(p.name)}
            className={cn(
              "absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground",
              "opacity-0 transition group-hover:opacity-100 hover:text-foreground"
            )}
            aria-label={`Remove ${p.name}`}
          >
            <X className="h-3 w-3" />
          </button>

          <div className="pointer-events-none absolute -inset-6 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 bg-primary/10" />
        </div>
      ))}
    </div>
  )
}

function ListCard({ list }: { list: UserList }) {
  const icon = list.name.toLowerCase().includes("fav") ? Heart : Film
  const Icon = icon

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60",
        "bg-background/60 px-4 py-4 shadow-sm transition",
        "hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-border/60 bg-background/60 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{list.name}</p>
          <p className="text-xs text-muted-foreground">
            {list.isDefault ? "Default list" : "Custom list"}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute -inset-6 opacity-0 blur-2xl transition-opacity duration-300 hover:opacity-100 bg-primary/10" />
    </div>
  )
}

export default function ProfilePage() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [actorInput, setActorInput] = useState("")
  const [directorInput, setDirectorInput] = useState("")
  const [actors, setActors] = useState<PersonCard[]>([])
  const [directors, setDirectors] = useState<PersonCard[]>([])
  const [weight, setWeight] = useState(0.8)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lists, setLists] = useState<UserList[]>([])
  const [listsError, setListsError] = useState<string | null>(null)
  const [actorSuggestions, setActorSuggestions] = useState<PersonCard[]>([])
  const [directorSuggestions, setDirectorSuggestions] = useState<PersonCard[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [initialPrefs, setInitialPrefs] = useState<{
    genres: string[]
    moods: string[]
    actors: string[]
    directors: string[]
    weight: number
  } | null>(null)

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await getMovieGenres()
        setGenres(data)
      } catch (error) {
        console.error("Error fetching genres:", error)
      }
    }
    fetchGenres()
  }, [])

  useEffect(() => {
    const fetchProfileAndLists = async () => {
      try {
        const [profileResult, listResult, prefResult] = await Promise.allSettled([
          getProfile(),
          getLists(),
          getPreferences(),
        ])

        if (profileResult.status === "fulfilled") setProfile(profileResult.value)

        if (listResult.status === "fulfilled") {
          setLists(listResult.value)
        } else {
          setListsError("Unable to load lists.")
        }

        if (prefResult.status === "fulfilled") {
          const prefs = prefResult.value
          const genres = prefs.filter((p) => p.type === "genre").map((p) => p.value)
          const moods = prefs.filter((p) => p.type === "mood").map((p) => p.value)
          const actorNames = prefs.filter((p) => p.type === "actor").map((p) => p.value)
          const directorNames = prefs.filter((p) => p.type === "director").map((p) => p.value)
          const weight = prefs.find((p) => typeof p.weight === "number")?.weight ?? 0.8

          setSelectedGenres([...new Set(genres)])
          setSelectedMoods([...new Set(moods)])

          const resolvedActors = await Promise.all(
            [...new Set(actorNames)].map((name) => resolvePerson(name, "acting"))
          )
          setActors(resolvedActors)

          const resolvedDirectors = await Promise.all(
            [...new Set(directorNames)].map((name) => resolvePerson(name, "directing"))
          )
          setDirectors(resolvedDirectors)

          setWeight(weight)

          setInitialPrefs({
            genres: [...new Set(genres)],
            moods: [...new Set(moods)],
            actors: [...new Set(actorNames)],
            directors: [...new Set(directorNames)],
            weight,
          })
        }
      } catch {
        setListsError("Unable to load lists.")
      }
    }

    fetchProfileAndLists()
  }, [])

  const toggleSelection = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }

  const resolvePerson = async (name: string, department?: string) => {
    const results = await searchPeople(name, 5)
    const match =
      results.find((person) =>
        department
          ? person.known_for_department?.toLowerCase().includes(department)
          : true
      ) ?? results[0]

    if (!match) return { name }

    return {
      id: match.id,
      name: match.name,
      image: match.profile_path
        ? `${TMDB_PROFILE_BASE}${match.profile_path}`
        : undefined,
    }
  }

  const addPerson = async (
    value: string,
    list: PersonCard[],
    setList: (v: PersonCard[]) => void,
    reset: () => void,
    department?: string
  ) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const normalized = trimmed.toLowerCase()

    if (list.some((p) => p.name.toLowerCase() === normalized)) return reset()

    const person = await resolvePerson(trimmed, department)
    setList([...list, person])
    reset()
  }

  const removePerson = (
    value: string,
    list: PersonCard[],
    setList: (v: PersonCard[]) => void
  ) => setList(list.filter((p) => p.name !== value))

  const normalizeSuggestions = useMemo(
    () => (results: Awaited<ReturnType<typeof searchPeople>>) =>
      results.map((person) => ({
        id: person.id,
        name: person.name,
        image: person.profile_path
          ? `${TMDB_PROFILE_BASE}${person.profile_path}`
          : undefined,
      })),
    []
  )

  useEffect(() => {
    if (!actorInput.trim()) {
      setActorSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const results = await searchPeople(actorInput.trim(), 6)
        setActorSuggestions(normalizeSuggestions(results))
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [actorInput, normalizeSuggestions])

  useEffect(() => {
    if (!directorInput.trim()) {
      setDirectorSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const results = await searchPeople(directorInput.trim(), 6)
        setDirectorSuggestions(normalizeSuggestions(results))
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [directorInput, normalizeSuggestions])

  const handleSavePreferences = async () => {
    setMessage(null)

    const events = [
      ...selectedGenres.map((value) => ({ type: "genre", value })),
      ...selectedMoods.map((value) => ({ type: "mood", value })),
      ...actors.map((person) => ({ type: "actor", value: person.name })),
      ...directors.map((person) => ({ type: "director", value: person.name })),
    ]

    if (!events.length) {
      setMessage("Select at least one preference.")
      return
    }

    const current = {
      genres: selectedGenres,
      moods: selectedMoods,
      actors: actors.map((p) => p.name),
      directors: directors.map((p) => p.name),
      weight,
    }

    const initial = initialPrefs ?? {
      genres: [],
      moods: [],
      actors: [],
      directors: [],
      weight: 0.8,
    }

    const normalize = (values: string[]) =>
      [...new Set(values.map((v) => v.trim().toLowerCase()))].sort()

    const toAdd = events.filter((event) => {
      const list =
        event.type === "genre"
          ? normalize(current.genres)
          : event.type === "mood"
            ? normalize(current.moods)
            : event.type === "actor"
              ? normalize(current.actors)
              : normalize(current.directors)

      const initialList =
        event.type === "genre"
          ? normalize(initial.genres)
          : event.type === "mood"
            ? normalize(initial.moods)
            : event.type === "actor"
              ? normalize(initial.actors)
              : normalize(initial.directors)

      return list.includes(event.value.toLowerCase()) && !initialList.includes(event.value.toLowerCase())
    })

    setSaving(true)
    try {
      const payload = toAdd.length ? toAdd : events
      await Promise.all(payload.map((event) => postPreference({ ...event, weight })))
      setMessage("Preferences saved.")
      toast.success("Preferences saved")
      setInitialPrefs({
        genres: current.genres,
        moods: current.moods,
        actors: current.actors,
        directors: current.directors,
        weight: current.weight,
      })
    } catch {
      setMessage("Failed to save preferences.")
      toast.error("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  const avatarSrc = profile?.avatar
    ? AVATAR_MAP[profile.avatar] ?? "/placeholder-user.jpg"
    : "/placeholder-user.jpg"

  const initials = profile?.username
    ? profile.username
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
    : "WW"

  const hasChanges = (() => {
    if (!initialPrefs) return selectedGenres.length + selectedMoods.length + actors.length + directors.length > 0 || weight !== 0.8

    const normalize = (values: string[]) =>
      [...new Set(values.map((v) => v.trim().toLowerCase()))].sort().join("|")

    return (
      normalize(selectedGenres) !== normalize(initialPrefs.genres) ||
      normalize(selectedMoods) !== normalize(initialPrefs.moods) ||
      normalize(actors.map((p) => p.name)) !== normalize(initialPrefs.actors) ||
      normalize(directors.map((p) => p.name)) !== normalize(initialPrefs.directors) ||
      weight !== initialPrefs.weight
    )
  })()

  return (
    <main className="min-h-screen pb-28">
      <Header />

      {/* Background accents */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_0%_0%,rgba(99,102,241,0.10),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_100%_15%,rgba(236,72,153,0.10),transparent_55%)]" />
        </div>
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/15 blur-[150px]" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[160px]" />

        <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6 relative">
          {/* Sticky actions (web-friendly) */}
          <div className="sticky top-16 z-30 -mx-1">
            <div
              className={cn(
                "rounded-2xl border border-border/60 bg-background/70 backdrop-blur",
                "shadow-sm px-3 py-3"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Set your tastes so recommendations feel more accurate.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    className="min-w-45"
                    onClick={handleSavePreferences}
                    disabled={saving || !hasChanges}
                  >
                    {saving ? "Saving..." : hasChanges ? "Save changes" : "No changes"}
                  </Button>
                </div>
              </div>

              {message && (
                <p className="mt-2 text-xs text-muted-foreground">{message}</p>
              )}
            </div>
          </div>

          {/* Layout web: 2 colonne su desktop */}
          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            {/* LEFT COLUMN: Profile + Lists */}
            <div className="space-y-6">
              {/* Hero profile */}
              <Card className="relative overflow-hidden border-border/60 bg-background/80 shadow-xl backdrop-blur transition hover:shadow-2xl hover:border-primary/40">
                <CardContent className="pt-8 pb-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-linear-to-br from-primary/30 via-fuchsia-400/30 to-indigo-400/30 blur-xl" />
                      <Avatar className="relative w-28 h-28 border-4 border-background shadow-xl transition-transform duration-500 hover:scale-[1.03]">
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 p-2 bg-primary rounded-full ring-4 ring-background shadow-md">
                        <Settings className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h1 className="text-3xl font-bold text-foreground">
                        {profile?.username ?? "WatchWise User"}
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        {profile?.email ?? "Movie enthusiast"}
                      </p>

                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {selectedGenres.slice(0, 3).map((g) => (
                          <Badge
                            key={g}
                            className="px-3 py-1 bg-primary/15 text-primary border border-primary/30"
                          >
                            {g}
                          </Badge>
                        ))}
                        {selectedMoods.slice(0, 2).map((m) => (
                          <Badge
                            key={m}
                            className="px-3 py-1 bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30"
                          >
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sub-hero action hint (keeps content, adds liveliness) */}
                    <div className="mt-2 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-left w-full max-w-md">
                      <p className="text-xs text-muted-foreground">
                        Choose genres, moods, and people so WatchWise can tailor better picks.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lists */}
              <Card className="relative overflow-hidden border-border/60 bg-background/80 shadow-lg backdrop-blur transition hover:shadow-xl hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Your lists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {listsError ? (
                    <p className="text-sm text-muted-foreground">{listsError}</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {lists.map((list) => (
                        <ListCard key={list.id} list={list} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-border/60 bg-background/80 shadow-lg backdrop-blur transition hover:shadow-xl hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Quick actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="justify-start">
                    <Link href="/seen">
                      <Film className="h-4 w-4 mr-2" />
                      Watch history
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start">
                    <Link href="/questionnaire">
                      <Laugh className="h-4 w-4 mr-2" />
                      Edit daily questionnaire
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Sign out (kept) */}
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* RIGHT COLUMN: People + Preferences */}
            <div className="space-y-6">
              {/* People */}
              <Card className="relative overflow-hidden border-border/60 bg-background/80 shadow-lg backdrop-blur transition hover:shadow-xl hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Favorite people
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-7">
                  {/* Actors */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Actors</p>
                      <p className="text-xs text-muted-foreground">
                        Add the faces you love seeing on screen.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={actorInput}
                        onChange={(e) => setActorInput(e.target.value)}
                        placeholder="e.g. Florence Pugh"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="sm:w-35"
                        onClick={() =>
                          void addPerson(
                            actorInput,
                            actors,
                            setActors,
                            () => setActorInput(""),
                            "acting"
                          )
                        }
                      >
                        Add
                      </Button>
                    </div>

                    <SuggestionDropdown
                      visible={!!actorInput}
                      loading={suggestionsLoading}
                      items={actorSuggestions}
                      onPick={(name) =>
                        void addPerson(
                          name,
                          actors,
                          setActors,
                          () => setActorInput(""),
                          "acting"
                        )
                      }
                    />

                    <PersonGrid
                      items={actors}
                      onRemove={(name) => removePerson(name, actors, setActors)}
                    />
                  </div>

                  {/* Directors */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Directors</p>
                      <p className="text-xs text-muted-foreground">
                        Help WatchWise understand your preferred style.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={directorInput}
                        onChange={(e) => setDirectorInput(e.target.value)}
                        placeholder="e.g. Denis Villeneuve"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="sm:w-35"
                        onClick={() =>
                          void addPerson(
                            directorInput,
                            directors,
                            setDirectors,
                            () => setDirectorInput(""),
                            "directing"
                          )
                        }
                      >
                        Add
                      </Button>
                    </div>

                    <SuggestionDropdown
                      visible={!!directorInput}
                      loading={suggestionsLoading}
                      items={directorSuggestions}
                      onPick={(name) =>
                        void addPerson(
                          name,
                          directors,
                          setDirectors,
                          () => setDirectorInput(""),
                          "directing"
                        )
                      }
                    />

                    <PersonGrid
                      items={directors}
                      onRemove={(name) => removePerson(name, directors, setDirectors)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card className="relative overflow-hidden border-border/60 bg-background/80 shadow-lg backdrop-blur transition hover:shadow-xl hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-primary flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Preferences
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-7">
                  {/* Genres */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Favorite genres</p>
                      <p className="text-xs text-muted-foreground">
                        Pick more genres for a richer profile.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre) => (
                        <ChoicePill
                          key={genre.id}
                          active={selectedGenres.includes(genre.name)}
                          onClick={() =>
                            toggleSelection(genre.name, selectedGenres, setSelectedGenres)
                          }
                        >
                          {genre.name}
                        </ChoicePill>
                      ))}
                    </div>
                  </div>

                  {/* Moods */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Current mood</p>
                      <p className="text-xs text-muted-foreground">
                        Mood influences the style of suggestions.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {moodOptions.map((mood) => (
                        <ChoicePill
                          key={mood}
                          active={selectedMoods.includes(mood)}
                          onClick={() =>
                            toggleSelection(mood, selectedMoods, setSelectedMoods)
                          }
                        >
                          {mood}
                        </ChoicePill>
                      ))}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Preference intensity</p>
                      <Badge className="bg-primary/15 text-primary border border-primary/30">
                        {Math.round(weight * 100)}%
                      </Badge>
                    </div>

                    <Slider
                      min={10}
                      max={100}
                      value={[Math.round(weight * 100)]}
                      onValueChange={(value) => setWeight(value[0] / 100)}
                    />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>More discovery</span>
                      <span>More personalization</span>
                    </div>
                  </div>

                  {/* Help text */}
                  <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Tip: increase intensity for more targeted picks. Lower it to explore more broadly.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Keeps original conditional message area concept; now sticky handles it, but we keep state */}
          {/* No additional block needed here */}
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
