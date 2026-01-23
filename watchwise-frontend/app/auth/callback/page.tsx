"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, UserX, Loader2, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { clearAuthIntent, readAuthIntent, storeSession } from "@/lib/auth"
import { UsernameRetryForm } from "@/components/username-retry-form"
import { cn } from "@/lib/utils"

// Helper to retry registration with a new username
async function retryOAuthWithUsername(username: string, params: URLSearchParams) {
  const provider = params.get("provider") || "google"
  const code = params.get("code")
  const state = params.get("state")
  
  if (!code || !state) throw new Error("Missing OAuth params")
  
  const baseUrl = process.env.NEXT_PUBLIC_AUTH_BASE_URL || ""
  const url = `${baseUrl}/oauth/${provider}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&username=${encodeURIComponent(username)}`
  
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw data
  }
  return res
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "success" | "error" | "username-taken">("idle")
  const [details, setDetails] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState<string>("")
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [lastTriedUsername, setLastTriedUsername] = useState<string>("")
  const [retryError, setRetryError] = useState<string | null>(null)
  const [retryLoading, setRetryLoading] = useState(false)

  useEffect(() => {
    const intent = readAuthIntent()
    setRedirectTo(intent?.redirectTo ?? "/profile")
  }, [])

  useEffect(() => {
    if (!redirectTo) return
    const error = searchParams.get("error")
    const statusParam = searchParams.get("status")
    const token = searchParams.get("token")
    const userParam = searchParams.get("user")

    // Username taken custom error
    if (error && error.toUpperCase().includes("USERNAME_TAKEN")) {
      let suggestions: string[] = []
      try {
        const parsed = JSON.parse(searchParams.get("error_body") || "{}")
        if (Array.isArray(parsed.suggestions)) suggestions = parsed.suggestions
      } catch {}
      
      setStatus("username-taken")
      setDetails("The username is already taken. Please choose another one.")
      setUsernameSuggestions(suggestions)
      setLastTriedUsername(searchParams.get("username") || "")
      return
    }

    if (statusParam === "missing-config") {
      setStatus("error")
      setDetails("Missing configuration. Check NEXT_PUBLIC_AUTH_BASE_URL.")
      return
    }

    if (error) {
      setStatus("error")
      setDetails(error)
      return
    }

    if (token || userParam) {
      let parsedUser: unknown | undefined
      if (userParam) {
        try {
          parsedUser = JSON.parse(decodeURIComponent(userParam))
        } catch {
          parsedUser = undefined
        }
      }

      storeSession({ token: token ?? undefined, user: parsedUser })
      clearAuthIntent()
      setStatus("success")
      setDetails("Successfully authenticated. Redirecting you shortly...")
      
      const timeout = setTimeout(() => {
        router.replace(redirectTo)
      }, 1500)
      return () => clearTimeout(timeout)
    }

    setStatus("error")
    setDetails("Invalid response from provider. Please try again.")
  }, [redirectTo, router, searchParams])

  // Retry handler
  async function handleUsernameRetry(newUsername: string) {
    setRetryLoading(true)
    setRetryError(null)
    try {
      const params = new URLSearchParams(window.location.search)
      params.set("username", newUsername)
      await retryOAuthWithUsername(newUsername, params)
      // Force reload to trigger normal flow
      window.location.search = params.toString()
    } catch (err: any) {
      let msg = "Generic error. Please try again."
      let suggestions: string[] = []
      if (err && typeof err === "object") {
        if (err.message) msg = err.message
        if (Array.isArray(err.suggestions)) suggestions = err.suggestions
      }
      setRetryError(msg)
      setUsernameSuggestions(suggestions)
    } finally {
      setRetryLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 flex flex-col">
      <Header />

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <section className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          
          {/* Status Indicator Bar */}
          <div className={cn(
            "h-1.5 w-full",
            status === "idle" && "bg-zinc-800",
            status === "success" && "bg-emerald-500",
            status === "error" && "bg-red-500",
            status === "username-taken" && "bg-amber-500",
          )} />

          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
            
            {/* --- IDLE / LOADING STATE --- */}
            {status === "idle" && (
              <>
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-violet-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-violet-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">Finalizing Login</h2>
                  <p className="text-zinc-400 text-sm">Please wait while we secure your session...</p>
                </div>
              </>
            )}

            {/* --- SUCCESS STATE --- */}
            {status === "success" && (
              <>
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 animate-in zoom-in duration-300" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
                  <p className="text-zinc-400 text-sm">{details}</p>
                </div>
                <div className="w-full pt-4">
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 animate-[progress_1.5s_ease-in-out]" style={{width: '100%'}} />
                   </div>
                </div>
              </>
            )}

            {/* --- USERNAME TAKEN STATE --- */}
            {status === "username-taken" && (
              <div className="w-full">
                <div className="flex flex-col items-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-4">
                    <UserX className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Username Taken</h2>
                  <p className="text-zinc-400 text-sm mt-2 max-w-xs">
                    {details}
                  </p>
                </div>

                <div className="text-left w-full bg-black/20 rounded-xl p-4 border border-white/5">
                  <UsernameRetryForm
                    initialUsername={lastTriedUsername || ""}
                    suggestions={usernameSuggestions}
                    onSubmit={handleUsernameRetry}
                    loading={retryLoading}
                    error={retryError}
                  />
                </div>
              </div>
            )}

            {/* --- ERROR STATE --- */}
            {status === "error" && (
              <>
                <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Authentication Failed</h2>
                  <p className="text-red-300/80 text-sm bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                    {details}
                  </p>
                </div>
                
                <div className="flex flex-col w-full gap-3 pt-4">
                  <Button asChild className="w-full bg-white text-black hover:bg-zinc-200">
                    <Link href="/login">Back to Login</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full text-zinc-400 hover:text-white">
                    <Link href="/">Go Home</Link>
                  </Button>
                </div>
              </>
            )}

            {/* Manual Redirect Button (Success Fallback) */}
            {status === "success" && redirectTo && (
              <Button asChild variant="ghost" className="text-zinc-500 hover:text-emerald-400 text-xs mt-4 animate-pulse">
                <Link href={redirectTo} className="flex items-center gap-1">
                  Click here if not redirected <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            )}

          </CardContent>
        </Card>
      </section>
    </main>
  )
}