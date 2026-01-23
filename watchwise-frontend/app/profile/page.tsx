"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  deletePreferencesBySource,
  postPreference,
  createList,
  patchProfile,
  searchPeople,
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
  SlidersHorizontal,
  Save,
  Loader2,
  Plus
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { clearSession } from "@/lib/auth"

const moodOptions = [
  "Chill",
  "Mind-bending",
  "Cozy",
  "Adrenaline",
  "Feel-good",
  "Dark",
  "Romantic",
]

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

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185"

type PersonCard = {
  id?: number
  name: string
  image?: string
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
        "group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 select-none",
        "border shadow-sm active:scale-95",
        active
          ? "bg-violet-600/20 border-violet-500/50 text-violet-100 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
          : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/20"
      )}
    >
      {children}
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
    <div className="mt-2 rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-xl backdrop-blur-md z-50 absolute w-full max-h-60 overflow-y-auto custom-scrollbar">
      {loading ? (
        <div className="flex items-center gap-2 p-3 text-sm text-zinc-500">
           <Loader2 className="h-4 w-4 animate-spin"/> Searching...
        </div>
      ) : items.length ? (
        <div className="grid gap-1">
          {items.map((s) => (
            <button
              key={`s-${s.id ?? s.name}`}
              type="button"
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10 transition-colors group"
              onClick={() => onPick(s.name)}
            >
              <img
                src={s.image || "/placeholder-user.jpg"}
                alt={s.name}
                className="h-8 w-8 rounded-full object-cover border border-white/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate group-hover:text-violet-300 transition-colors">{s.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Select</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="p-3 text-sm text-zinc-500">No results found.</p>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
      {items.map((p) => (
        <div
          key={p.name}
          className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-2 pr-8 shadow-sm transition hover:bg-white/[0.05] hover:border-white/10"
        >
          <img
            src={p.image || "/placeholder-user.jpg"}
            alt={p.name}
            className="h-10 w-10 rounded-full object-cover border border-white/10"
          />
          <span className="text-xs font-medium text-zinc-300 line-clamp-2 leading-tight">
            {p.name}
          </span>

          <button
            type="button"
            onClick={() => onRemove(p.name)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
            aria-label={`Remove ${p.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function ListCard({ list }: { list: UserList }) {
  const icon = list.name.toLowerCase().includes("fav") ? Heart : Film
  const Icon = icon

  return (
    <Link
      href={`/lists?listId=${list.id}`}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-sm transition-all hover:bg-white/[0.05] hover:border-white/10 hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-400 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate text-zinc-200 group-hover:text-white transition-colors">{list.name}</p>
          <p className="text-xs text-zinc-500">
            {list.isDefault ? "Default list" : "Custom list"}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function ProfilePage() {
  const router = useRouter()
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
  const [newListName, setNewListName] = useState("")
  const [creatingList, setCreatingList] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)

  // ... (Data fetching logic remains the same)
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
          const explicitPrefs = prefs.filter((p) => (p.source ?? "explicit") === "explicit")
          const genres = explicitPrefs.filter((p) => p.type === "genre").map((p) => p.value)
          const moods = explicitPrefs.filter((p) => p.type === "mood").map((p) => p.value)
          const actorNames = explicitPrefs.filter((p) => p.type === "actor").map((p) => p.value)
          const directorNames = explicitPrefs.filter((p) => p.type === "director").map((p) => p.value)
          const weight = explicitPrefs.find((p) => typeof p.weight === "number")?.weight ?? 0.8

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

    setSaving(true)
    try {
      const payload = events
      await deletePreferencesBySource("explicit")
      await Promise.all(
        payload.map((event) => postPreference({ ...event, weight, source: "explicit" }))
      )
      setMessage("Preferences saved.")
      toast.success("Preferences saved")
      
      // Update initial state to reflect saved
      setInitialPrefs({
        genres: selectedGenres,
        moods: selectedMoods,
        actors: actors.map(p => p.name),
        directors: directors.map(p => p.name),
        weight
      })
    } catch {
      setMessage("Failed to save preferences.")
      toast.error("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  const avatarSrc = profile?.avatar
    ? AVATAR_OPTIONS.find((option) => option.id === profile.avatar)?.src ?? "/placeholder-user.jpg"
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
    <main className="min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      <Header />

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="container relative z-10 mx-auto px-4 py-8 max-w-6xl space-y-6">
        
        {/* Sticky Action Bar */}
        <div className="sticky top-20 z-40">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-violet-500/10 text-violet-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-sm text-zinc-300">
                Tweak your taste profile for better recommendations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleSavePreferences}
                disabled={saving || !hasChanges}
                className={cn(
                  "rounded-full transition-all duration-300",
                  hasChanges 
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/20"
                    : "bg-white/5 text-zinc-500 hover:bg-white/10"
                )}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : hasChanges ? "Save Changes" : "Up to Date"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          
          {/* LEFT COLUMN: Profile & Lists */}
          <div className="space-y-6">
            
            {/* Profile Card */}
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-violet-600/20 via-fuchsia-500/10 to-transparent" />
              <CardContent className="px-6 pb-8 -mt-16 flex flex-col items-center text-center">
                <div className="relative mb-4 group">
                  <Avatar className="w-32 h-32 border-4 border-zinc-900 shadow-xl">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-3xl font-bold bg-zinc-800 text-zinc-400">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setAvatarPickerOpen(true)}
                    className="absolute bottom-0 right-0 p-2.5 bg-zinc-800 rounded-full border border-zinc-700 text-zinc-300 hover:bg-white hover:text-black transition-all shadow-lg"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <h1 className="text-2xl font-bold text-white mb-1">
                  {profile?.username ?? "WatchWise User"}
                </h1>
                <p className="text-sm text-zinc-500 mb-6">
                  {profile?.email ?? "Movie enthusiast"}
                </p>

                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {selectedGenres.slice(0, 3).map((g) => (
                    <Badge key={g} variant="secondary" className="bg-violet-500/10 text-violet-300 border-violet-500/20">{g}</Badge>
                  ))}
                  {selectedMoods.slice(0, 2).map((m) => (
                    <Badge key={m} variant="outline" className="border-zinc-700 text-zinc-400">{m}</Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button asChild variant="outline" className="h-10 border-white/10 hover:bg-white/5">
                    <Link href="/seen">
                      <Film className="w-4 h-4 mr-2 text-violet-400" /> History
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-10 border-white/10 hover:bg-white/5">
                    <Link href="/questionnaire">
                      <Laugh className="w-4 h-4 mr-2 text-amber-400" /> Daily Poll
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="col-span-2 h-10 border-white/10 hover:bg-white/5">
                    <Link href="/groups">
                      <Users className="w-4 h-4 mr-2 text-teal-400" /> Manage Groups
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lists Card */}
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-zinc-400" /> Your Lists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {listsError ? (
                  <p className="text-sm text-red-400">{listsError}</p>
                ) : (
                  <div className="grid gap-3">
                    {lists.map((list) => (
                      <ListCard key={list.id} list={list} />
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider font-semibold">Create New List</p>
                  <div className="flex gap-2">
                    <Input
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="e.g. Date Night Classics"
                      className="bg-black/20 border-white/10 h-10"
                    />
                    <Button
                      size="icon"
                      disabled={!newListName.trim() || creatingList}
                      onClick={async () => {
                        const name = newListName.trim()
                        if (!name) return
                        setCreatingList(true)
                        try {
                          const created = await createList(name)
                          setLists((prev) => [created, ...prev])
                          setNewListName("")
                          toast.success("List created")
                        } catch {
                          toast.error("Failed to create list")
                        } finally {
                          setCreatingList(false)
                        }
                      }}
                      className="h-10 w-10 shrink-0 bg-white text-black hover:bg-zinc-200"
                    >
                      {creatingList ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="ghost"
              className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => {
                clearSession()
                router.replace("/login")
              }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>

          {/* RIGHT COLUMN: Preferences */}
          <div className="space-y-6">
            
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="h-5 w-5 text-zinc-400" /> Taste Profile
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-8">
                
                {/* Genres */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-200">Favorite Genres</label>
                    <span className="text-xs text-zinc-500">{selectedGenres.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <ChoicePill
                        key={genre.id}
                        active={selectedGenres.includes(genre.name)}
                        onClick={() => toggleSelection(genre.name, selectedGenres, setSelectedGenres)}
                      >
                        {genre.name}
                      </ChoicePill>
                    ))}
                  </div>
                </div>

                {/* Moods */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-200">Vibe Check</label>
                    <span className="text-xs text-zinc-500">What are you in the mood for?</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.map((mood) => (
                      <ChoicePill
                        key={mood}
                        active={selectedMoods.includes(mood)}
                        onClick={() => toggleSelection(mood, selectedMoods, setSelectedMoods)}
                      >
                        {mood}
                      </ChoicePill>
                    ))}
                  </div>
                </div>

                {/* Discovery Slider */}
                <div className="space-y-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-200">Discovery Intensity</label>
                    <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                      {Math.round(weight * 100)}%
                    </Badge>
                  </div>
                  <Slider
                    min={10}
                    max={100}
                    step={10}
                    value={[Math.round(weight * 100)]}
                    onValueChange={(val) => setWeight(val[0] / 100)}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    <span>Broad Discovery</span>
                    <span>Precision Match</span>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-zinc-400" /> People
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* Actors */}
                <div className="space-y-3 relative">
                  <label className="text-sm font-medium text-zinc-200">Favorite Actors</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={actorInput}
                        onChange={(e) => setActorInput(e.target.value)}
                        placeholder="Search actors..."
                        className="bg-black/20 border-white/10 focus-visible:ring-violet-500/50"
                      />
                      <SuggestionDropdown
                        visible={!!actorInput}
                        loading={suggestionsLoading}
                        items={actorSuggestions}
                        onPick={(name) => addPerson(name, actors, setActors, () => setActorInput(""), "acting")}
                      />
                    </div>
                    <Button 
                      onClick={() => addPerson(actorInput, actors, setActors, () => setActorInput(""), "acting")}
                      variant="secondary"
                      className="bg-white/10 hover:bg-white/20 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  <PersonGrid items={actors} onRemove={(name) => removePerson(name, actors, setActors)} />
                </div>

                {/* Directors */}
                <div className="space-y-3 relative">
                  <label className="text-sm font-medium text-zinc-200">Favorite Directors</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={directorInput}
                        onChange={(e) => setDirectorInput(e.target.value)}
                        placeholder="Search directors..."
                        className="bg-black/20 border-white/10 focus-visible:ring-violet-500/50"
                      />
                      <SuggestionDropdown
                        visible={!!directorInput}
                        loading={suggestionsLoading}
                        items={directorSuggestions}
                        onPick={(name) => addPerson(name, directors, setDirectors, () => setDirectorInput(""), "directing")}
                      />
                    </div>
                    <Button 
                      onClick={() => addPerson(directorInput, directors, setDirectors, () => setDirectorInput(""), "directing")}
                      variant="secondary"
                      className="bg-white/10 hover:bg-white/20 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  <PersonGrid items={directors} onRemove={(name) => removePerson(name, directors, setDirectors)} />
                </div>

              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      <BottomNav />

      {/* Avatar Modal */}
      {avatarPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Choose Avatar</h2>
                <p className="text-sm text-zinc-400">Select a persona for your profile.</p>
              </div>
              <button
                onClick={() => setAvatarPickerOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={async () => {
                    setSavingAvatar(true)
                    try {
                      await patchProfile({ avatar: option.id })
                      setProfile((prev) => (prev ? { ...prev, avatar: option.id } : prev))
                      toast.success("Avatar updated")
                      setAvatarPickerOpen(false)
                    } catch {
                      toast.error("Failed to update avatar")
                    } finally {
                      setSavingAvatar(false)
                    }
                  }}
                  disabled={savingAvatar}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105",
                    profile?.avatar === option.id
                      ? "border-violet-500 ring-2 ring-violet-500/30"
                      : "border-transparent hover:border-white/20"
                  )}
                >
                  <img src={option.src} alt={option.id} className="w-full h-full object-cover" />
                  {savingAvatar && profile?.avatar === option.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white"/>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}