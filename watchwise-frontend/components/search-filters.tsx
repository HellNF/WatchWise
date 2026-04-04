"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { searchPeople, type MovieGenre, type PersonSearchResult } from "@/lib/api"

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w45"

export type FilterValues = {
  query: string
  genreIds: string[]
  yearFrom: string
  yearTo: string
  ratingMin: string
  ratingMax: string
  runtimeMin: string
  runtimeMax: string
  sortBy: string
  actorId: number | null
  actorName: string
  directorId: number | null
  directorName: string
  keywordIds: number[]
  keywordNames: string[]
}

export const DEFAULT_FILTERS: FilterValues = {
  query: "",
  genreIds: [],
  yearFrom: "",
  yearTo: "",
  ratingMin: "",
  ratingMax: "",
  runtimeMin: "",
  runtimeMax: "",
  sortBy: "popularity.desc",
  actorId: null,
  actorName: "",
  directorId: null,
  directorName: "",
  keywordIds: [],
  keywordNames: [],
}

type Props = {
  genres: MovieGenre[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  onReset: () => void
  resultCount?: number
}

export function SearchFilters({ genres, values, onChange, onReset, resultCount }: Props) {
  const [actorInput, setActorInput] = useState(values.actorName)
  const [actorSuggestions, setActorSuggestions] = useState<PersonSearchResult[]>([])
  const [directorInput, setDirectorInput] = useState(values.directorName)
  const [directorSuggestions, setDirectorSuggestions] = useState<PersonSearchResult[]>([])

  useEffect(() => { setActorInput(values.actorName) }, [values.actorName])
  useEffect(() => { setDirectorInput(values.directorName) }, [values.directorName])

  useEffect(() => {
    if (!actorInput.trim() || values.actorId) { setActorSuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await searchPeople(actorInput.trim(), 6)
      setActorSuggestions(res)
    }, 300)
    return () => clearTimeout(t)
  }, [actorInput, values.actorId])

  useEffect(() => {
    if (!directorInput.trim() || values.directorId) { setDirectorSuggestions([]); return }
    const t = setTimeout(async () => {
      const res = await searchPeople(directorInput.trim(), 6)
      setDirectorSuggestions(res)
    }, 300)
    return () => clearTimeout(t)
  }, [directorInput, values.directorId])

  const set = (patch: Partial<FilterValues>) => onChange({ ...values, ...patch })

  return (
    <div className="space-y-5">
      {/* Sort */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Sort by</label>
        <Select value={values.sortBy} onValueChange={(v) => set({ sortBy: v })}>
          <SelectTrigger className="bg-black/20 border-white/10 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            <SelectItem value="popularity.desc">Popularity</SelectItem>
            <SelectItem value="vote_average.desc">Rating</SelectItem>
            <SelectItem value="primary_release_date.desc">Newest first</SelectItem>
            <SelectItem value="primary_release_date.asc">Oldest first</SelectItem>
            <SelectItem value="revenue.desc">Box office</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Genres */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Genres</label>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3 max-h-44 overflow-y-auto custom-scrollbar">
          <label className="flex items-center gap-2 text-sm p-1 hover:bg-white/5 rounded cursor-pointer">
            <Checkbox
              checked={values.genreIds.length === 0}
              onCheckedChange={(c) => { if (c) set({ genreIds: [] }) }}
              className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <span>All genres</span>
          </label>
          {genres.map((genre) => {
            const id = String(genre.id)
            return (
              <label key={id} className="flex items-center gap-2 text-sm p-1 hover:bg-white/5 rounded cursor-pointer">
                <Checkbox
                  checked={values.genreIds.includes(id)}
                  onCheckedChange={(c) =>
                    set({ genreIds: c ? [...values.genreIds, id] : values.genreIds.filter((x) => x !== id) })
                  }
                  className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <span className="truncate">{genre.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Year</label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={1900} placeholder="From" value={values.yearFrom}
            onChange={(e) => set({ yearFrom: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
          <Input type="number" min={1900} placeholder="To" value={values.yearTo}
            onChange={(e) => set({ yearTo: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Rating (0–10)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} max={10} step={0.1} placeholder="Min" value={values.ratingMin}
            onChange={(e) => set({ ratingMin: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
          <Input type="number" min={0} max={10} step={0.1} placeholder="Max" value={values.ratingMax}
            onChange={(e) => set({ ratingMax: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
        </div>
      </div>

      {/* Runtime */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Runtime (min)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} placeholder="Min" value={values.runtimeMin}
            onChange={(e) => set({ runtimeMin: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
          <Input type="number" min={0} placeholder="Max" value={values.runtimeMax}
            onChange={(e) => set({ runtimeMax: e.target.value })}
            className="bg-black/20 border-white/10 h-9 text-sm" />
        </div>
      </div>

      {/* Actor */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Actor</label>
        <div className="relative">
          <Input
            value={actorInput}
            onChange={(e) => { setActorInput(e.target.value); if (!e.target.value) set({ actorId: null, actorName: "" }) }}
            placeholder="Search actor..."
            className="bg-black/20 border-white/10 h-9 text-sm"
          />
          {values.actorId && (
            <button
              onClick={() => { set({ actorId: null, actorName: "" }); setActorInput("") }}
              className="absolute right-2 top-2.5 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {actorSuggestions.length > 0 && !values.actorId && (
            <div className="absolute top-full left-0 w-full z-50 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {actorSuggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { set({ actorId: p.id, actorName: p.name }); setActorInput(p.name); setActorSuggestions([]) }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                >
                  <img
                    src={p.profile_path ? `${TMDB_PROFILE_BASE}${p.profile_path}` : "/placeholder.svg"}
                    alt={p.name}
                    className="h-8 w-8 rounded-full object-cover bg-zinc-800 flex-shrink-0"
                  />
                  <div>
                    <p className="text-zinc-100 leading-tight">{p.name}</p>
                    {p.known_for_department && (
                      <p className="text-[10px] text-zinc-500">{p.known_for_department}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Director */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Director</label>
        <div className="relative">
          <Input
            value={directorInput}
            onChange={(e) => { setDirectorInput(e.target.value); if (!e.target.value) set({ directorId: null, directorName: "" }) }}
            placeholder="Search director..."
            className="bg-black/20 border-white/10 h-9 text-sm"
          />
          {values.directorId && (
            <button
              onClick={() => { set({ directorId: null, directorName: "" }); setDirectorInput("") }}
              className="absolute right-2 top-2.5 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {directorSuggestions.length > 0 && !values.directorId && (
            <div className="absolute top-full left-0 w-full z-50 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {directorSuggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { set({ directorId: p.id, directorName: p.name }); setDirectorInput(p.name); setDirectorSuggestions([]) }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-white/5 text-sm"
                >
                  <img
                    src={p.profile_path ? `${TMDB_PROFILE_BASE}${p.profile_path}` : "/placeholder.svg"}
                    alt={p.name}
                    className="h-8 w-8 rounded-full object-cover bg-zinc-800 flex-shrink-0"
                  />
                  <div>
                    <p className="text-zinc-100 leading-tight">{p.name}</p>
                    {p.known_for_department && (
                      <p className="text-[10px] text-zinc-500">{p.known_for_department}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        className="w-full text-zinc-400 hover:text-white hover:bg-white/5 text-sm"
        onClick={onReset}
      >
        Reset all filters
      </Button>

      {resultCount !== undefined && (
        <p className="text-center text-xs text-zinc-600 font-mono">{resultCount} results</p>
      )}
    </div>
  )
}
