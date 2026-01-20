"use client"

import { useMemo, useState } from "react"
import { Sparkles, Moon, Zap, Heart, Brain, Laugh, X, Film, Stars } from "lucide-react"

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
  { id: "relaxed", label: "Relaxed", icon: Moon, description: "Wind down" },
  { id: "adventurous", label: "Adventurous", icon: Zap, description: "Something new" },
  { id: "romantic", label: "Romantic", icon: Heart, description: "Feel the love" },
  { id: "thoughtful", label: "Thoughtful", icon: Brain, description: "Make me think" },
  { id: "fun", label: "Fun", icon: Laugh, description: "Laugh out loud" },
  { id: "surprise", label: "Surprise me", icon: Sparkles, description: "Anything goes" },
]

const energyLevels = [
  { id: "low", label: "Low energy", description: "Easy to follow" },
  { id: "medium", label: "Medium", description: "Balanced pacing" },
  { id: "high", label: "High energy", description: "Edge of my seat" },
]

const companyOptions = [
  { id: "alone", label: "Solo tonight" },
  { id: "partner", label: "With partner" },
  { id: "friends", label: "With friends" },
  { id: "family", label: "Family time" },
]

const durationOptions = [
  { id: "short", label: "Under 90 min" },
  { id: "medium", label: "90–120 min" },
  { id: "long", label: "Over 2 hours" },
  { id: "any", label: "No preference" },
]

const genreOptions = [
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
  { id: "thriller", label: "Thriller" },
  { id: "sci-fi", label: "Sci‑Fi" },
  { id: "fantasy", label: "Fantasy" },
  { id: "romance", label: "Romance" },
  { id: "animation", label: "Animation" },
]

const noveltyOptions = [
  { id: "comfort", label: "Comfort picks", description: "Familiar & easy" },
  { id: "balanced", label: "Balanced", description: "A mix of safe and new" },
  { id: "discovery", label: "Discovery", description: "Surprise me with new" },
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
    if (step === 4) return true
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="questionnaire-glass w-full max-w-md rounded-3xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Daily Check‑in</h2>
              <p className="text-xs text-muted-foreground">Let’s tune your recommendations</p>
            </div>
          </div>
          <button onClick={onSkip} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">How are you feeling?</h3>
            <div className="grid grid-cols-2 gap-3">
              {moods.map((mood) => {
                const Icon = mood.icon
                return (
                  <button
                    key={mood.id}
                    onClick={() => {
                      setPreferences((prev) => ({ ...prev, mood: mood.id }))
                      setStep(1)
                    }}
                    className="liquid-glass-pill p-4 rounded-2xl text-left hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Icon className="h-6 w-6 text-primary mb-2" />
                    <div className="font-medium text-foreground">{mood.label}</div>
                    <div className="text-xs text-muted-foreground">{mood.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">Energy level?</h3>
            <div className="space-y-3">
              {energyLevels.map((energy) => (
                <button
                  key={energy.id}
                  onClick={() => {
                    setPreferences((prev) => ({ ...prev, energy: energy.id }))
                    setStep(2)
                  }}
                  className="liquid-glass-pill w-full p-4 rounded-2xl text-left hover:bg-white/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="font-medium text-foreground">{energy.label}</div>
                  <div className="text-xs text-muted-foreground">{energy.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(0)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">Who are you watching with?</h3>
            <div className="grid grid-cols-2 gap-3">
              {companyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPreferences((prev) => ({ ...prev, company: option.id }))
                    setStep(3)
                  }}
                  className="liquid-glass-pill p-4 rounded-2xl text-center hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="font-medium text-foreground">{option.label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">How much time do you have?</h3>
            <div className="grid grid-cols-2 gap-3">
              {durationOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPreferences((prev) => ({ ...prev, duration: option.id }))
                    setStep(4)
                  }}
                  className="liquid-glass-pill p-4 rounded-2xl text-center hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="font-medium text-foreground">{option.label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-medium text-center text-foreground">Pick up to 3 genres</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {genreOptions.map((genre) => {
                const active = (preferences.genres ?? []).includes(genre.id)
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    aria-pressed={active}
                    className={`liquid-glass-pill p-4 rounded-2xl text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                      active
                        ? "bg-primary/20 ring-2 ring-primary/60 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div className="font-medium text-foreground flex items-center justify-center gap-2">
                      {active && (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/30 text-primary text-xs">
                          ✓
                        </span>
                      )}
                      <span>{genre.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{(preferences.genres ?? []).length}/3 selected</span>
              <button
                onClick={() => setPreferences((prev) => ({ ...prev, genres: [] }))}
                className="hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <button
              disabled={!canContinue}
              onClick={() => setStep(5)}
              className="w-full text-sm text-foreground hover:text-primary transition-colors"
            >
              Continue
            </button>
            <button
              onClick={() => setStep(3)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-center gap-2">
              <Stars className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-medium text-center text-foreground">Familiar or new?</h3>
            </div>
            <div className="space-y-3">
              {noveltyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPreferences((prev) => ({ ...prev, novelty: option.id }))
                    finish(option.id)
                  }}
                  className="liquid-glass-pill w-full p-4 rounded-2xl text-left hover:bg-white/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(4)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Go back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
