"use client"

import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MoodQuestionnaire, type UserPreferences } from "@/components/mood-questionnaire"
import { useRouter } from "next/navigation"
import { Toaster, toast } from "sonner" // Assuming sonner is installed as per package.json list but using basic toast for now if not set up

export default function QuestionnairePage() {
  const router = useRouter()

  const handleComplete = (prefs: UserPreferences) => {
    // Save to local storage
    if (typeof window !== "undefined") {
        localStorage.setItem("watchwise-preferences", JSON.stringify(prefs))
        // Reset last visit to force a fresh "today" state if needed, or just rely on preferences
    }
    
    // Redirect home
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
            <h1 className="text-2xl font-bold mb-2">Daily Check-in</h1>
            <p className="text-muted-foreground">Update your mood to get fresh recommendations.</p>
        </div>

        {/* We reuse the component but we might need to style it to fit the page structure if it's fixed position. 
            Checking MoodQuestionnaire implementation, it renders a fixed overlay. 
            We might need to override styles or wrap it. 
            Wait, MoodQuestionnaire in components usually has fixed inset-0.
            Let's create a wrapper that is relative if possible, or accept that it looks like a modal.
            
            Actually, looking at the code of MoodQuestionnaire provided in context:
            It returns a `div` with `fixed inset-0 z-50 ...`.
            So it takes over the screen.
            
            For this page, we probably want it embedded or we just let it take over the screen.
            Since it's a dedicated page, letting it take over is fine, but we might want to ensure the Header/Footer aren't covered weirdly 
            OR we assume this page is just a launcher data-pref updater.
            
            However, it sets `z-50 bg-background/80 backdrop-blur-sm`.
            Ideally, we would refactor MoodQuestionnaire to accept a 'inline' prop.
            But for now, I'll wrap it in a div that attempts to contain it or I will just render it and it will look like the modal.
            
            Better yet, let's just render it. It will overlay the empty page, which is fine.
        */}
        
        <div className="relative min-h-[60vh] flex items-center justify-center">
            {/* 
               Since MoodQuestionnaire has 'fixed inset-0', it will cover the header/footer of this page.
               That's actually okay for a "Mode" page, but if the user wants to navigate away they might need the close button from the questionnaire.
               The questionnaire has a close button? Looking at the code: Yes, `X` icon handles generic close or skip?
               The props are `onSkip`.
             */}
             <MoodQuestionnaire onComplete={handleComplete} onSkip={handleSkip} />
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
