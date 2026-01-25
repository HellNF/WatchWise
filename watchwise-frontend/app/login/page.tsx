"use client"

import React, { Suspense } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Chrome, Github, ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { startOAuth, type OAuthProviderId } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { LogoMagicStroke } from "@/components/LogoMagicStroke"

// --- LOGO COMPONENT (Disconnected Spark) ---
// Integrato qui per comodità, puoi importarlo dal tuo file separato
const LogoDisconnectedSpark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 140 80" className={cn("w-32 h-auto", className)} fill="none">
    <defs>
      <linearGradient id="login-grad-main" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="50%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="login-grad-spark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <filter id="login-neon" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#login-neon)">
      <path
        d="M10 15 L35 65 L60 25 L85 65"
        stroke="url(#login-grad-main)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="translate(95, 20) scale(1.8) rotate(10)">
        <path
          d="M10 0 C10 0 12 6 18 10 C 12 14 10 20 10 20 C 10 20 8 14 2 10 C 8 6 10 0 10 0 Z"
          fill="url(#login-grad-spark)"
        />
      </g>
    </g>
  </svg>
)

const providers: Array<{
  id: OAuthProviderId
  label: string
  description: string
  icon: typeof Chrome
  colorClass: string
}> = [
  {
    id: "google",
    label: "Google",
    description: "Continua con il tuo account Google",
    icon: Chrome,
    colorClass:
      "hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]",
  },
  {
    id: "github",
    label: "GitHub",
    description: "Continua con il tuo account GitHub",
    icon: Github,
    colorClass:
      "hover:border-purple-500/50 hover:bg-purple-500/10 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]",
  },
]

function LoginPageInner() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/profile"

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950 text-foreground selection:bg-mint/30">
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/20 blur-[120px] rounded-full opacity-40 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 blur-[120px] rounded-full opacity-30" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 blur-[100px] rounded-full opacity-20" />

      {/* --- BACK LINK --- */}
      <div className="absolute top-8 left-8 z-50">
        <Link
          href="/"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Torna alla Home
        </Link>
      </div>

      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-md px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative group"
        >
          <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-b from-white/20 to-transparent opacity-20 blur-md transition duration-500 group-hover:opacity-40" />

          <div className="relative rounded-[2rem] border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="p-8 md:p-10 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mb-8"
              >
                <LogoMagicStroke className="w-32 h-auto drop-shadow-[0_0_15px_rgba(124,58,237,0.3)]" />
              </motion.div>

              <div className="text-center space-y-2 mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                  Bentornato su{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-teal-300 to-amber-400">
                    WatchWise
                  </span>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Sincronizza i tuoi gusti, trova cosa guardare.
                </p>
              </div>

              <div className="w-full mb-6 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-3 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                <p>
                  Usa il tuo account esistente per accedere. Non condivideremo mai i tuoi dati senza
                  permesso.
                </p>
              </div>

              <div className="w-full space-y-3">
                {providers.map((provider) => {
                  const Icon = provider.icon
                  return (
                    <Button
                      key={provider.id}
                      variant="outline"
                      className={cn(
                        "relative w-full h-auto p-4 flex items-center justify-start gap-4",
                        "bg-white/[0.03] border-white/10 rounded-xl",
                        "text-left transition-all duration-300",
                        "hover:text-foreground",
                        provider.colorClass
                      )}
                      onClick={() =>
                        startOAuth(provider.id, {
                          redirectTo,
                        })
                      }
                    >
                      <div className="p-2 rounded-full bg-white/5 border border-white/5 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{provider.label}</span>
                        <span className="text-xs text-muted-foreground/80 font-normal">
                          {provider.description}
                        </span>
                      </div>

                      <div className="ml-auto opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </div>
                    </Button>
                  )
                })}
              </div>

              <div className="mt-8 text-center text-xs text-muted-foreground">
                Non hai ancora un account?{" "}
                <Link
                  href="/register"
                  className="text-teal-400 hover:text-teal-300 font-medium underline-offset-4 hover:underline transition-colors"
                >
                  Registrati gratis
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 text-center w-full text-[10px] text-zinc-700 pointer-events-none">
        &copy; 2024 WatchWise Inc. All rights reserved.
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LoginPageInner />
    </Suspense>
  )
}
