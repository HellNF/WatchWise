"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getSupabaseClient, storeSession, getAuthRedirect, clearAuthRedirect } from "@/lib/auth"
import { cn } from "@/lib/utils"

// NEXT_PUBLIC_API_BASE_URL may already include "/api" (e.g. "http://localhost:3001/api").
// Strip it so we can always build the full path ourselves.
const _rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
const API_BASE = _rawBase.endsWith("/api") ? _rawBase.slice(0, -4) : _rawBase

async function upsertUserSession(accessToken: string) {
  const res = await fetch(`${API_BASE}/api/auth/session`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error("Failed to upsert user session")
  return res.json()
}

function AuthCallbackPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [details, setDetails] = useState<string | null>(null)
  const [redirectTo, setRedirectTo] = useState<string>("/")

  useEffect(() => {
    // Read destination once synchronously — avoids stale-closure in callbacks.
    // Fall back to /profile rather than "/" when the key is absent or stale.
    const rawDest = getAuthRedirect()
    const dest = rawDest === "/" ? "/profile" : rawDest
    setRedirectTo(dest)

    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    if (error) {
      setStatus("error")
      setDetails(errorDescription ?? error)
      return
    }

    const supabase = getSupabaseClient()

    // Supabase (detectSessionInUrl: true) exchanges the code automatically on
    // client init and removes ?code= from the URL via history.replaceState.
    // We just wait for that to settle, then read the resulting session.
    supabase.auth.getSession()
      .then(async ({ data, error: sessionError }) => {
        if (sessionError || !data.session) {
          setStatus("error")
          setDetails(sessionError?.message ?? "Failed to complete authentication.")
          return
        }

        const { access_token, user: supabaseUser } = data.session

        try {
          const user = await upsertUserSession(access_token)
          storeSession({ token: access_token, user })
        } catch (err) {
          console.error("[Auth] Backend session upsert failed:", err)
          // Fallback: store basic info from the Supabase JWT so the header
          // can show the user avatar/username even if the backend is unreachable.
          const fallbackUser = {
            id: supabaseUser.id,
            username:
              supabaseUser.user_metadata?.full_name ??
              supabaseUser.user_metadata?.name ??
              supabaseUser.email?.split("@")[0] ??
              "User",
            avatar: "",
            email: supabaseUser.email,
          }
          storeSession({ token: access_token, user: fallbackUser })
        }

        clearAuthRedirect()
        setStatus("success")
        setDetails("Successfully authenticated. Redirecting you shortly...")

        // Full page reload so that the Header (persistent layout) remounts and
        // reads the freshly-written localStorage. router.replace() is soft-nav
        // and would leave the Header in a stale "not logged in" state.
        setTimeout(() => {
          window.location.href = dest
        }, 1500)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unknown authentication error"
        setStatus("error")
        setDetails(msg)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 flex flex-col">
      <Header />

      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <section className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div
            className={cn(
              "h-1.5 w-full",
              status === "idle" && "bg-zinc-800",
              status === "success" && "bg-emerald-500",
              status === "error" && "bg-red-500"
            )}
          />

          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
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
                    <div className="h-full bg-emerald-500 animate-[progress_1.5s_ease-in-out]" style={{ width: "100%" }} />
                  </div>
                </div>
                <Button asChild variant="ghost" className="text-zinc-500 hover:text-emerald-400 text-xs mt-4 animate-pulse">
                  <Link href={redirectTo} className="flex items-center gap-1">
                    Click here if not redirected <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </>
            )}

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
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AuthCallbackPageInner />
    </Suspense>
  )
}
