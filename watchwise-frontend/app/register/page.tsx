"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Chrome, Github, ArrowLeft, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { startOAuth, type OAuthProviderId } from "@/lib/auth"
import { cn } from "@/lib/utils"

// --- LOGO COMPONENT (Disconnected Spark) ---
const LogoDisconnectedSpark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 140 80" className={cn("w-32 h-auto", className)} fill="none">
    <defs>
      <linearGradient id="reg-grad-main" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="50%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="reg-grad-spark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <filter id="reg-neon" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#reg-neon)">
      <path d="M10 15 L35 65 L60 25 L85 65" stroke="url(#reg-grad-main)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(95, 20) scale(1.8) rotate(10)">
         <path d="M10 0 C10 0 12 6 18 10 C 12 14 10 20 10 20 C 10 20 8 14 2 10 C 8 6 10 0 10 0 Z" fill="url(#reg-grad-spark)" />
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
    description: "Create a profile with Google",
    icon: Chrome,
    colorClass: "hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]",
  },
  {
    id: "github",
    label: "GitHub",
    description: "Create a profile with GitHub",
    icon: Github,
    colorClass: "hover:border-purple-500/50 hover:bg-purple-500/10 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]",
  },
]

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950 text-foreground selection:bg-amber-500/30">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-violet-600/10 blur-[120px] rounded-full opacity-30" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full opacity-30" />
      
      {/* --- BACK LINK --- */}
      <div className="absolute top-8 left-8 z-50">
        <Link href="/" className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-sm">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>
      </div>

      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-md px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative group"
        >
          {/* Outer Glow */}
          <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-tr from-teal-500/20 via-violet-500/20 to-amber-500/20 opacity-30 blur-md" />
          
          <div className="relative rounded-[2rem] border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
            
            {/* Top Shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="p-8 md:p-10 flex flex-col items-center">
              
              {/* Logo */}
              <div className="mb-6">
                <LogoDisconnectedSpark className="w-28 h-auto drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
              </div>

              <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                  Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-teal-300 to-amber-400">WatchWise</span>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Start getting better recommendations today.
                </p>
              </div>

              {/* Feature Box (No Password) */}
              <div className="w-full mb-6 p-4 rounded-xl bg-gradient-to-r from-teal-500/5 to-violet-500/5 border border-white/5 flex items-center gap-4 relative overflow-hidden group/box">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/box:opacity-100 transition-opacity" />
                <div className="h-10 w-10 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 border border-teal-500/20">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">No password needed</p>
                    <p className="text-xs text-muted-foreground">Secure and instant access via your favorite provider.</p>
                </div>
              </div>

              {/* Providers Grid */}
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
                          redirectTo: "/profile",
                        })
                      }
                    >
                      <div className="p-2 rounded-full bg-white/5 border border-white/5 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{provider.label}</span>
                        <span className="text-xs text-muted-foreground/80 font-normal">{provider.description}</span>
                      </div>
                      
                      {/* Action Arrow */}
                      <div className="ml-auto opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Button>
                  )
                })}
              </div>

              {/* Footer Links */}
              <div className="mt-8 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium underline-offset-4 hover:underline transition-colors">
                  Log in here
                </Link>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
      
       {/* Terms Hint */}
       <div className="absolute bottom-6 text-center w-full px-6 text-[10px] text-zinc-600 pointer-events-none">
        By registering, you agree to our Terms of Service and Privacy Policy.
      </div>

    </main>
  )
}