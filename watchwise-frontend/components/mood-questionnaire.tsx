"use client"

import { useState } from "react"
import { Sparkles, Moon, Zap, Heart, Brain, Laugh, X } from "lucide-react"

interface MoodQuestionnaireProps {
  onComplete: (preferences: UserPreferences) => void
  onSkip: () => void
}

export interface UserPreferences {
  mood: string
  energy: string
  company: string
  duration: string
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
  { id: "medium", label: "90-120 min" },
  { id: "long", label: "Over 2 hours" },
  { id: "any", label: "No preference" },
]

export function MoodQuestionnaire({ onComplete, onSkip }: MoodQuestionnaireProps) {
  const [step, setStep] = useState(0)
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({})

  const handleMoodSelect = (mood: string) => {
    setPreferences((prev) => ({ ...prev, mood }))
    setStep(1)
  }

  const handleEnergySelect = (energy: string) => {
    setPreferences((prev) => ({ ...prev, energy }))
    setStep(2)
  }

  const handleCompanySelect = (company: string) => {
    setPreferences((prev) => ({ ...prev, company }))
    setStep(3)
  }

  const handleDurationSelect = (duration: string) => {
    const finalPreferences = { ...preferences, duration } as UserPreferences
    onComplete(finalPreferences)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="questionnaire-glass w-full max-w-md rounded-3xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Good evening</h2>
              <p className="text-xs text-muted-foreground">{"Let's find your perfect film"}</p>
            </div>
          </div>
          <button onClick={onSkip} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Step 0: Mood */}
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">How are you feeling tonight?</h3>
            <div className="grid grid-cols-2 gap-3">
              {moods.map((mood) => {
                const Icon = mood.icon
                return (
                  <button
                    key={mood.id}
                    onClick={() => handleMoodSelect(mood.id)}
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

        {/* Step 1: Energy */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">What energy level?</h3>
            <div className="space-y-3">
              {energyLevels.map((energy) => (
                <button
                  key={energy.id}
                  onClick={() => handleEnergySelect(energy.id)}
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

        {/* Step 2: Company */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">Who are you watching with?</h3>
            <div className="grid grid-cols-2 gap-3">
              {companyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleCompanySelect(option.id)}
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

        {/* Step 3: Duration */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-center text-foreground">How much time do you have?</h3>
            <div className="grid grid-cols-2 gap-3">
              {durationOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleDurationSelect(option.id)}
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
      </div>
    </div>
  )
}
