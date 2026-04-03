"use client"

import { useRequireAuth } from "@/hooks/useRequireAuth"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"
import { useRouter } from "next/navigation"
import { postQuestionnairePreferences } from "@/lib/api"
import { Sparkles, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function QuestionnairePage() {
  const checking = useRequireAuth()
  const router = useRouter()

  const handleComplete = async (prefs: UserPreferences) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchwise-preferences", JSON.stringify(prefs))
    }
    try {
      await postQuestionnairePreferences(prefs)
    } catch (error) {
      console.error("Failed to save preferences", error)
    }
    router.back()
  }

  const handleSkip = () => {
    router.push("/")
  }

  if (checking) return null

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">
      <Header />

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        
        {/* Back Button (Mobile friendly) */}
        <div className="mb-6 md:hidden">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-zinc-400 hover:text-white pl-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        {/* Page Header */}
        <div className="mb-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-white/5 mb-2">
            <Sparkles className="h-6 w-6 text-fuchsia-300" />
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Today's <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-300">Vibe Check</span>
            </h1>
            <p className="text-zinc-400 mt-3 text-lg leading-relaxed">
              Help us tune your recommendations.<br className="hidden sm:block"/>
              What are you in the mood for right now?
            </p>
          </div>
        </div>

        {/* Questionnaire Stage */}
        <div className="relative rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl shadow-2xl p-1 md:p-2">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none" />
          
          <div className="relative z-10 min-h-[400px] flex items-center justify-center py-8">
            <MoodQuestionnaire onComplete={handleComplete} onSkip={handleSkip} />
          </div>
        </div>

      </div>
      
      <Footer />
      <BottomNav />
    </main>
  )
}