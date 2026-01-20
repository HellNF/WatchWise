"use client"

import Link from "next/link"
import { Chrome, Github, Sparkles } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { startOAuth, type OAuthProviderId } from "@/lib/auth"

const providers: Array<{
  id: OAuthProviderId
  label: string
  description: string
  icon: typeof Chrome
}> = [
  {
    id: "google",
    label: "Continua con Google",
    description: "Crea un profilo con Google.",
    icon: Chrome,
  },
  {
    id: "github",
    label: "Continua con GitHub",
    description: "Crea un profilo con GitHub.",
    icon: Github,
  },
]

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-fuchsia-950">
      <div className="pointer-events-none absolute -top-32 left-0 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-primary/20 blur-[140px]" />
      <Header />

      <section className="container mx-auto px-4 py-10 max-w-2xl">
        <Card className="border-border/60 bg-background/80 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold">
              Crea il tuo{" "}
              <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                account
              </span>
            </CardTitle>
            <CardDescription>
              Registrati solo con provider esterni. È veloce e sicuro.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-indigo-500/10 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </span>
                Nessuna password da ricordare
              </div>
              <p className="mt-2">
                Imposta le chiavi OAuth e l’endpoint backend per attivare il
                flusso di registrazione.
              </p>
            </div>

            <div className="grid gap-3">
              {providers.map((provider) => {
                const Icon = provider.icon
                return (
                  <Button
                    key={provider.id}
                    variant="outline"
                    className="h-14 justify-start border-white/20 bg-white/5 text-foreground transition hover:border-white/40 hover:bg-white/10"
                    onClick={() =>
                      startOAuth(provider.id, {
                        redirectTo: "/profile",
                      })
                    }
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-fuchsia-500/20 to-indigo-500/20">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-left">
                        <span className="block font-medium">{provider.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {provider.description}
                        </span>
                      </span>
                    </span>
                  </Button>
                )
              })}
            </div>

            <div className="rounded-lg border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
              Hai già un account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Accedi
              </Link>
              .
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
