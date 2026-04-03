"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles } from "lucide-react"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"
import { postQuestionnairePreferences } from "@/lib/api"

const STORAGE_KEY = "watchwise-daily-questionnaire"

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

function hasCompletedToday(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(STORAGE_KEY) === getTodayDateString()
}

function markCompletedToday() {
  localStorage.setItem(STORAGE_KEY, getTodayDateString())
}

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  return Boolean(localStorage.getItem("watchwise-token") || localStorage.getItem("watchwise-user"))
}

export function DailyMoodOverlay() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Piccolo delay per non bloccare il rendering della pagina
    const timer = setTimeout(() => {
      if (isLoggedIn() && !hasCompletedToday()) {
        setVisible(true)
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    markCompletedToday()
    setVisible(false)
  }

  const handleComplete = async (prefs: UserPreferences) => {
    markCompletedToday()
    setVisible(false)
    try {
      localStorage.setItem("watchwise-preferences", JSON.stringify(prefs))
      await postQuestionnairePreferences(prefs)
    } catch {
      // silent fail — le preferenze sono già salvate in localStorage
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Ambient top glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[300px] h-[120px] bg-violet-600/20 blur-[60px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/5">
                  <Sparkles className="h-4 w-4 text-fuchsia-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Daily check-in</p>
                  <h2 className="text-base font-bold text-white leading-tight">What's your vibe today?</h2>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Skip questionnaire"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Questionnaire */}
            <div className="px-6 py-6">
              <MoodQuestionnaire onComplete={handleComplete} onSkip={dismiss} />
            </div>

            {/* Footer hint */}
            <div className="px-6 pb-5 text-center">
              <p className="text-[11px] text-zinc-600">
                Appears once a day · Helps us find the perfect film for tonight
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
