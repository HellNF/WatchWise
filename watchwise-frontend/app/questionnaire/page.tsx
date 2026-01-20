"use client"

import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"
import { useRouter } from "next/navigation"
import { postQuestionnairePreferences } from "@/lib/api"

export default function QuestionnairePage() {
  const router = useRouter()

  const handleComplete = async (prefs: UserPreferences) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("watchwise-preferences", JSON.stringify(prefs))
    }
    await postQuestionnairePreferences(prefs)
    router.push("/")
  }

  const handleSkip = () => {
    router.push("/")
  }

  return (
    <main className="min-h-screen pb-28">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Daily Check‑in</h1>
          <p className="text-muted-foreground">Refine your taste so today’s picks fit better.</p>
        </div>

        <div className="relative min-h-[60vh] flex items-center justify-center">
          <MoodQuestionnaire onComplete={handleComplete} onSkip={handleSkip} />
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
