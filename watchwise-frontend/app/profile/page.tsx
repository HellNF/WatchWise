"use client"

import { useMemo, useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Settings, LogOut, Heart, Clock, Award, BarChart3 } from "lucide-react"
import { useEffect } from "react"

const genreOptions = [
    "Sci-Fi",
    "Thriller",
    "Drama",
    "Comedy",
    "Action",
    "Romance",
    "Horror",
    "Animation",
]

const moodOptions = [
    "Chill",
    "Mind-bending",
    "Cozy",
    "Adrenaline",
    "Feel-good",
    "Dark",
    "Romantic",
]

export default function ProfilePage() {
    const [selectedGenres, setSelectedGenres] = useState<string[]>([])
    const [genres, setGenres] = useState<{ id: number; name: string }[]>([])
    const [selectedMoods, setSelectedMoods] = useState<string[]>([])
    const [actorInput, setActorInput] = useState("")
    const [directorInput, setDirectorInput] = useState("")
    const [actors, setActors] = useState<string[]>([])
    const [directors, setDirectors] = useState<string[]>([])
    const [weight, setWeight] = useState(0.8)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const apiBase = useMemo(
        () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api",
        []
    )

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const response = await fetch(`${apiBase}/movies/genres`);
                if (!response.ok) {
                    throw new Error("Failed to fetch genres");
                }
                const data = await response.json();
                setGenres(data);
            } catch (error) {
                console.error("Error fetching genres:", error);
            }
        };

        fetchGenres();
    }, [apiBase]);

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

    const addToList = (
        value: string,
        list: string[],
        setList: (v: string[]) => void,
        reset: () => void
    ) => {
        const trimmed = value.trim()
        if (!trimmed) return
        if (list.includes(trimmed)) return reset()
        setList([...list, trimmed])
        reset()
    }

    const removeFromList = (
        value: string,
        list: string[],
        setList: (v: string[]) => void
    ) => {
        setList(list.filter((v) => v !== value))
    }

    const handleSavePreferences = async () => {
        setMessage(null)

        const events = [
            ...selectedGenres.map((value) => ({ type: "genre", value })),
            ...selectedMoods.map((value) => ({ type: "mood", value })),
            ...actors.map((value) => ({ type: "actor", value })),
            ...directors.map((value) => ({ type: "director", value })),
        ]

        if (!events.length) {
            setMessage("Seleziona almeno una preferenza.")
            return
        }

        setSaving(true)
        try {
            await Promise.all(
                events.map((event) =>
                    fetch(`${apiBase}/preferences`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            ...event,
                            weight,
                        }),
                    })
                )
            )
            setMessage("Preferenze salvate.")
        } catch {
            setMessage("Errore nel salvataggio delle preferenze.")
        } finally {
            setSaving(false)
        }
    }
  return (
    <main className="min-h-screen pb-28">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* User Header */}
        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                    <AvatarImage src="/avatar-placeholder.jpg" />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">NP</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full ring-4 ring-background">
                    <Settings className="w-4 h-4 text-primary-foreground" />
                </div>
            </div>
            <div className="text-center">
                <h1 className="text-2xl font-bold">Nicolas Priscoglio</h1>
                <p className="text-muted-foreground">Movie Enthusiast</p>
            </div>
            
            <div className="flex gap-2">
                <Badge variant="secondary" className="px-3 py-1">Sci-Fi Lover</Badge>
                <Badge variant="secondary" className="px-3 py-1">Night Owl</Badge>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="text-center border-border/50 bg-card/50">
                <CardContent className="pt-6">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">124</div>
                    <p className="text-xs text-muted-foreground">Hours Watched</p>
                </CardContent>
            </Card>
            <Card className="text-center border-border/50 bg-card/50">
                <CardContent className="pt-6">
                    <Heart className="w-5 h-5 mx-auto mb-2 text-rose-500" />
                    <div className="text-2xl font-bold">42</div>
                    <p className="text-xs text-muted-foreground">Favorites</p>
                </CardContent>
            </Card>
            <Card className="text-center border-border/50 bg-card/50">
                <CardContent className="pt-6">
                    <Award className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground">Achievements</p>
                </CardContent>
            </Card>
        </div>

                {/* Preferences */}
                <div className="space-y-6 mb-8">
                    <section className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Preferenze
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Scegli generi, mood e persone che ti rappresentano: useremo queste
                            preferenze per suggerimenti più precisi.
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Generi preferiti</p>
                                <div className="flex flex-wrap gap-2">
                                    {genres.map((genre) => {
                                        const active = selectedGenres.includes(genre.name)
                                        return (
                                            <Button
                                                key={genre.id}
                                                type="button"
                                                size="sm"
                                                variant={active ? "default" : "secondary"}
                                                onClick={() =>
                                                    toggleSelection(genre.name, selectedGenres, setSelectedGenres)
                                                }
                                            >
                                                {genre.name}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Mood del momento</p>
                                <div className="flex flex-wrap gap-2">
                                    {moodOptions.map((mood) => {
                                        const active = selectedMoods.includes(mood)
                                        return (
                                            <Button
                                                key={mood}
                                                type="button"
                                                size="sm"
                                                variant={active ? "default" : "secondary"}
                                                onClick={() =>
                                                    toggleSelection(mood, selectedMoods, setSelectedMoods)
                                                }
                                            >
                                                {mood}
                                            </Button>
                                        )}
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Attori preferiti</p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={actorInput}
                                            onChange={(e) => setActorInput(e.target.value)}
                                            placeholder="Es. Florence Pugh"
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() =>
                                                addToList(actorInput, actors, setActors, () => setActorInput(""))
                                            }
                                        >
                                            Aggiungi
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {actors.map((actor) => (
                                            <Badge
                                                key={actor}
                                                variant="secondary"
                                                className="cursor-pointer"
                                                onClick={() => removeFromList(actor, actors, setActors)}
                                            >
                                                {actor}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Registi preferiti</p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={directorInput}
                                            onChange={(e) => setDirectorInput(e.target.value)}
                                            placeholder="Es. Denis Villeneuve"
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() =>
                                                addToList(
                                                    directorInput,
                                                    directors,
                                                    setDirectors,
                                                    () => setDirectorInput("")
                                                )
                                            }
                                        >
                                            Aggiungi
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {directors.map((director) => (
                                            <Badge
                                                key={director}
                                                variant="secondary"
                                                className="cursor-pointer"
                                                onClick={() => removeFromList(director, directors, setDirectors)}
                                            >
                                                {director}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Intensità preferenze</p>
                                <Slider
                                    min={10}
                                    max={100}
                                    value={[Math.round(weight * 100)]}
                                    onValueChange={(value) => setWeight(value[0] / 100)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Valore attuale: {Math.round(weight * 100)}%
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={handleSavePreferences}
                                    disabled={saving}
                                >
                                    {saving ? "Salvataggio..." : "Salva preferenze"}
                                </Button>
                                {message && (
                                    <p className="text-xs text-muted-foreground">{message}</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Favorite Genres */}
        <div className="space-y-6">
            <section>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Favorite Genres
                </h3>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Science Fiction</span>
                            <span className="text-muted-foreground">45%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[45%]" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Thriller</span>
                            <span className="text-muted-foreground">30%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[30%]" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Drama</span>
                            <span className="text-muted-foreground">25%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 w-[25%]" />
                        </div>
                    </div>
                </div>
            </section>
            
            <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
            </Button>
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
