"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, CircleAlert } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  clearAuthIntent,
  readAuthIntent,
  storeSession,
} from "@/lib/auth"

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [details, setDetails] = useState<string | null>(null)

  const redirectTo = useMemo(() => {
    const intent = readAuthIntent()
    return intent?.redirectTo ?? "/profile"
  }, [])

  useEffect(() => {
    const error = searchParams.get("error")
    const statusParam = searchParams.get("status")
    const token = searchParams.get("token")
    const userParam = searchParams.get("user")

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
              <Button asChild>
                <Link href={redirectTo}>Vai a WatchWise</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
