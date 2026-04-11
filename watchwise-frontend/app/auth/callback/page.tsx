"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient, storeSession, getAuthRedirect, clearAuthRedirect } from "@/lib/auth"

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

        setTimeout(() => {
          window.location.href = dest
        }, 250)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unknown authentication error"
        setStatus("error")
        setDetails(msg)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-foreground">
      <section className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        {status === "idle" && (
          <>
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-violet-400" />
            <h1 className="text-xl font-semibold text-white">Finalizing login</h1>
            <p className="mt-2 text-sm text-zinc-400">Securing your session...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mb-4 h-9 w-9 text-emerald-400" />
            <h1 className="text-xl font-semibold text-white">Login completed</h1>
            <p className="mt-2 text-sm text-zinc-400">{details}</p>
            <Button asChild variant="ghost" className="mt-6 text-xs text-zinc-400 hover:text-white">
              <Link href={redirectTo}>Open destination</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="mb-4 h-9 w-9 text-red-400" />
            <h1 className="text-xl font-semibold text-white">Authentication failed</h1>
            <p className="mt-2 text-sm text-red-300/80">{details}</p>
            <div className="mt-6 flex w-full flex-col gap-3">
              <Button asChild className="w-full bg-white text-black hover:bg-zinc-200">
                <Link href="/login">Back to login</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full text-zinc-400 hover:text-white">
                <Link href="/">Go home</Link>
              </Button>
            </div>
          </>
        )}
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
