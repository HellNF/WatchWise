"use client"

import { useMemo, useState } from "react"
import { Sparkles, Moon, Zap, Heart, Brain, Laugh, X, Film, Stars, ArrowLeft, Clock, Users, Battery } from "lucide-react"
import { cn } from "@/lib/utils"

interface MoodQuestionnaireProps {
  onComplete: (preferences: UserPreferences) => void
  onSkip: () => void
}

export interface UserPreferences {
  mood: string
  energy: string
  company: string
  duration: string
  genres: string[]
  novelty: string
}

const moods = [
  { id: "relaxed", label: "Relaxed", icon: Moon, description: "Wind down", color: "text-blue-400 bg-blue-400/10" },
  { id: "adventurous", label: "Adventurous", icon: Zap, description: "Something new", color: "text-amber-400 bg-amber-400/10" },
  { id: "romantic", label: "Romantic", icon: Heart, description: "Feel the love", color: "text-pink-400 bg-pink-400/10" },
  { id: "thoughtful", label: "Thoughtful", icon: Brain, description: "Make me think", color: "text-violet-400 bg-violet-400/10" },
  { id: "fun", label: "Fun", icon: Laugh, description: "Laugh out loud", color: "text-emerald-400 bg-emerald-400/10" },
  { id: "surprise", label: "Surprise me", icon: Sparkles, description: "Anything goes", color: "text-fuchsia-400 bg-fuchsia-400/10" },
]

const energyLevels = [
  { id: "low", label: "Low Energy", description: "Easy to follow, comfort viewing" },
  { id: "medium", label: "Balanced", description: "Standard pacing and engagement" },
  { id: "high", label: "High Energy", description: "Edge of seat, intense focus" },
]

const companyOptions = [
  { id: "alone", label: "Solo tonight" },
  { id: "partner", label: "With partner" },
  { id: "friends", label: "With friends" },
  { id: "family", label: "Family time" },
]

const durationOptions = [
  { id: "short", label: "Short (< 90m)" },
  { id: "medium", label: "Standard (90-120m)" },
  { id: "long", label: "Epic (> 2h)" },
  { id: "any", label: "Any length" },
]

const genreOptions = [
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
  { id: "thriller", label: "Thriller" },
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "fantasy", label: "Fantasy" },
  { id: "romance", label: "Romance" },
  { id: "animation", label: "Animation" },
]

const noveltyOptions = [
  { id: "comfort", label: "Comfort Picks", description: "Familiar favorites & rewatchable classics" },
  { id: "balanced", label: "Balanced Mix", description: "A blend of safe bets and new discoveries" },
  { id: "discovery", label: "Pure Discovery", description: "Hidden gems and things I haven't seen" },
]

export function MoodQuestionnaire({ onComplete, onSkip }: MoodQuestionnaireProps) {
  const [step, setStep] = useState(0)
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({ genres: [] })
  const totalSteps = 6

  const canContinue = useMemo(() => {
    if (step === 0) return !!preferences.mood
    if (step === 1) return !!preferences.energy
    if (step === 2) return !!preferences.company
    if (step === 3) return !!preferences.duration
    if (step === 4) return true // Genres are optional but check handled in UI
    if (step === 5) return !!preferences.novelty
    return false
  }, [step, preferences])

  const toggleGenre = (id: string) => {
    setPreferences((prev) => {
      const current = new Set(prev.genres ?? [])
      if (current.has(id)) current.delete(id)
      else if (current.size < 3) current.add(id)
      return { ...prev, genres: Array.from(current) }
    })
  }

  const finish = (novelty: string) => {
    const finalPreferences = {
      mood: preferences.mood ?? "surprise",
      energy: preferences.energy ?? "medium",
      company: preferences.company ?? "alone",
      duration: preferences.duration ?? "any",
      genres: preferences.genres ?? [],
      novelty,
    } satisfies UserPreferences
    onComplete(finalPreferences)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      
      {/* Progress Bar */}
      <div className="mb-8 px-2">
        <div className="flex justify-between mb-2 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          <span>Step {step + 1} of {totalSteps}</span>
          <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps Container */}
      <div className="min-h-[400px]">
        
        {/* STEP 0: MOOD */}
        {step === 0 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <h3 className="text-2xl font-bold text-center text-white mb-6">How are you feeling?</h3>
            <div className="grid grid-cols-2 gap-3">
              {moods.map((mood) => {
                const Icon = mood.icon
                const isActive = preferences.mood === mood.id
                return (
                  <button
                    key={mood.id}
                    onClick={() => {
                      setPreferences((prev) => ({ ...prev, mood: mood.id }))
                      setStep(1)
                    }}
                    className={cn(
                      "relative p-4 rounded-2xl text-left border transition-all duration-200 group",
                      isActive 
                        ? "bg-white/10 border-white/20 ring-1 ring-white/20" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:-translate-y-0.5"
                    )}
                  >
                    <div className={cn("p-2 rounded-xl w-fit mb-3 transition-colors", mood.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-white mb-0.5">{mood.label}</div>
                    <div className="text-xs text-zinc-400">{mood.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 1: ENERGY */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col items-center mb-6">
                <div className="p-3 rounded-full bg-amber-500/10 mb-3">
                    <Battery className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-white text-center">Energy level?</h3>
            </div>
            
            <div className="space-y-3">
              {energyLevels.map((energy) => {
                const isActive = preferences.energy === energy.id
                return (
                  <button
                    key={energy.id}
                    onClick={() => {
                      setPreferences((prev) => ({ ...prev, energy: energy.id }))
                      setStep(2)
                    }}
                    className={cn(
                        "w-full p-4 rounded-2xl text-left border transition-all duration-200 group flex items-center justify-between",
                        isActive 
                          ? "bg-amber-500/10 border-amber-500/30" 
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                      )}
                  >
                    <div>
                        <div className={cn("font-semibold mb-0.5", isActive ? "text-amber-200" : "text-white")}>{energy.label}</div>
                        <div className="text-xs text-zinc-400">{energy.description}</div>
                    </div>
                    {isActive && <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setStep(0)} className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-full">
               <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
        )}

        {/* STEP 2: COMPANY */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col items-center mb-6">
                <div className="p-3 rounded-full bg-violet-500/10 mb-3">
                    <Users className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-2xl font-bold text-white text-center">Who's watching?</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {companyOptions.map((option) => {
                 const isActive = preferences.company === option.id
                 return (
                    <button
                        key={option.id}
                        onClick={() => {
                        setPreferences((prev) => ({ ...prev, company: option.id }))
                        setStep(3)
                        }}
                        className={cn(
                            "p-5 rounded-2xl text-center border transition-all duration-200",
                            isActive 
                            ? "bg-violet-500/10 border-violet-500/30 text-violet-200" 
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white"
                        )}
                    >
                        <div className="font-semibold">{option.label}</div>
                    </button>
                 )
              })}
            </div>
            <button onClick={() => setStep(1)} className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-full">
               <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
        )}

        {/* STEP 3: DURATION */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col items-center mb-6">
                <div className="p-3 rounded-full bg-teal-500/10 mb-3">
                    <Clock className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-2xl font-bold text-white text-center">How much time?</h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {durationOptions.map((option) => {
                 const isActive = preferences.duration === option.id
                 return (
                    <button
                        key={option.id}
                        onClick={() => {
                        setPreferences((prev) => ({ ...prev, duration: option.id }))
                        setStep(4)
                        }}
                        className={cn(
                            "p-4 rounded-2xl text-center border transition-all duration-200",
                            isActive 
                            ? "bg-teal-500/10 border-teal-500/30 text-teal-200 font-bold" 
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white font-medium"
                        )}
                    >
                        {option.label}
                    </button>
                 )
              })}
            </div>
            <button onClick={() => setStep(2)} className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-full">
               <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
        )}

        {/* STEP 4: GENRES */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col items-center mb-6">
                <div className="p-3 rounded-full bg-fuchsia-500/10 mb-3">
                    <Film className="h-6 w-6 text-fuchsia-400" />
                </div>
                <h3 className="text-2xl font-bold text-white text-center">Specific vibe?</h3>
                <p className="text-zinc-500 text-sm">Select up to 3 genres (optional)</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {genreOptions.map((genre) => {
                const active = (preferences.genres ?? []).includes(genre.id)
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={cn(
                        "p-3 rounded-xl text-sm font-medium border transition-all duration-200 flex items-center justify-center gap-2",
                        active 
                        ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-100 shadow-[0_0_15px_rgba(217,70,239,0.15)]" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-400 hover:text-white"
                    )}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />}
                    {genre.label}
                  </button>
                )
              })}
            </div>

            <div className="space-y-3">
                <button
                    onClick={() => setStep(5)}
                    className="w-full h-12 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
                >
                    Continue {(preferences.genres?.length ?? 0) > 0 ? `(${preferences.genres?.length})` : ""}
                </button>
                <button onClick={() => setStep(3)} className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-full">
                    <ArrowLeft className="h-3 w-3" /> Back
                </button>
            </div>
          </div>
        )}

        {/* STEP 5: NOVELTY */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col items-center mb-6">
                <div className="p-3 rounded-full bg-indigo-500/10 mb-3">
                    <Stars className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-white text-center">Familiar or New?</h3>
            </div>

            <div className="space-y-3">
              {noveltyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPreferences((prev) => ({ ...prev, novelty: option.id }))
                    finish(option.id)
                  }}
                  className="w-full p-5 rounded-2xl text-left border border-white/5 bg-white/5 hover:bg-white/10 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300 group"
                >
                  <div className="font-bold text-white text-lg mb-1 group-hover:text-indigo-300 transition-colors">{option.label}</div>
                  <div className="text-sm text-zinc-400 group-hover:text-zinc-300">{option.description}</div>
                </button>
              ))}
            </div>
            
            <button onClick={() => setStep(4)} className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors w-full">
               <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
        )}

      </div>
    </div>
  )
}