"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, CircleAlert } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { clearAuthIntent, readAuthIntent, storeSession } from "@/lib/auth"
import { UsernameRetryForm } from "@/components/username-retry-form"

// Helper to retry registration with a new username
async function retryOAuthWithUsername(username: string, params: URLSearchParams) {
  // Ricostruisci la chiamata backend con username forzato
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
      setDetails("Lo username scelto è già in uso. Scegline un altro.")
      setUsernameSuggestions(suggestions)
      setLastTriedUsername(searchParams.get("username") || "")
      return
    }

    if (statusParam === "missing-config") {
      setStatus("error")
      setDetails(
        "Configura NEXT_PUBLIC_AUTH_BASE_URL e NEXT_PUBLIC_AUTH_CALLBACK_URL per completare l’integrazione.",
      )
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
      setDetails("Accesso completato. Verrai reindirizzato a breve.")
      const timeout = setTimeout(() => {
        router.replace(redirectTo)
      }, 1200)
      return () => clearTimeout(timeout)
    }

    setStatus("error")
    setDetails("Risposta non valida dal provider. Riprovare.")
  }, [redirectTo, router, searchParams])

  // Retry handler
  async function handleUsernameRetry(newUsername: string) {
    setRetryLoading(true)
    setRetryError(null)
    try {
      const params = new URLSearchParams(window.location.search)
      params.set("username", newUsername)
      const res = await retryOAuthWithUsername(newUsername, params)
      // Se va a buon fine, forziamo reload per triggerare il flusso normale
      window.location.search = params.toString()
    } catch (err: any) {
      let msg = "Errore generico. Riprova."
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
    <main className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-10 max-w-xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Conferma autenticazione</CardTitle>
            <CardDescription>
              Questa pagina gestisce il ritorno dal provider OAuth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "success" ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <CheckCircle2 className="h-5 w-5" />
                <span>{details}</span>
              </div>
            ) : status === "username-taken" ? (
              <div>
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <CircleAlert className="h-5 w-5" />
                  <span>{details ?? "Username già in uso."}</span>
                </div>
                <UsernameRetryForm
                  initialUsername={lastTriedUsername || ""}
                  suggestions={usernameSuggestions}
                  onSubmit={handleUsernameRetry}
                  loading={retryLoading}
                  error={retryError}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <CircleAlert className="h-5 w-5" />
                <span>{details ?? "Attendi..."}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/login">Torna al login</Link>
              </Button>
              {redirectTo && (
                <Button asChild>
                  <Link href={redirectTo}>Vai a WatchWise</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
