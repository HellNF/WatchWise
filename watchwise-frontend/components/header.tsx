"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Film } from "lucide-react"
import Link from "next/link"
import { LogoDisconnectedSpark } from "@/components/LogoDisconnectedSpark"
import { LogoMagicStroke } from "./LogoMagicStroke"

import { useRouter } from "next/navigation"
import { clearSession, getSupabaseClient } from "@/lib/auth"

const AVATAR_OPTIONS = [
  { id: "avatar_01", src: "/Avatar_1.png" },
  { id: "avatar_02", src: "/Avatar_2.png" },
  { id: "avatar_03", src: "/Avatar_3.png" },
  { id: "avatar_04", src: "/Avatar_4.png" },
  { id: "avatar_05", src: "/Avatar_5.png" },
  { id: "avatar_06", src: "/Avatar_6.png" },
  { id: "avatar_07", src: "/Avatar_7.png" },
  { id: "avatar_08", src: "/Avatar_8.png" },
  { id: "avatar_09", src: "/Avatar_9.png" },
  { id: "avatar_10", src: "/Avatar_10.png" },
  { id: "avatar_11", src: "/Avatar_11.png" },
  { id: "avatar_12", src: "/Avatar_12.png" },
]

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ username?: string; avatar?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadFromStorage = () => {
      const raw = localStorage.getItem("watchwise-user")
      const hasToken = Boolean(localStorage.getItem("watchwise-token"))
      setIsLoggedIn(Boolean(raw) || hasToken)
      if (raw) {
        try { setUser(JSON.parse(raw)) } catch { setUser(null) }
      } else {
        setUser(null)
      }
    }

    loadFromStorage()

    // Re-sync when storage changes (fired by storeSession via dispatchEvent)
    const onStorage = () => loadFromStorage()
    window.addEventListener("watchwise-auth-changed", onStorage)

    // Re-sync when Supabase session changes (e.g. after OAuth redirect).
    // Use a small delay so that storeSession() has already written
    // watchwise-user to localStorage before we read it.
    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setTimeout(loadFromStorage, 200)
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false)
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener("watchwise-auth-changed", onStorage)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-16 max-w-10/12 mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <LogoMagicStroke className="h-10 w-auto" />
            
          </div>
          <span className="text-xl font-semibold tracking-tight">WatchWise</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <div className="relative group">
            <Link href="/movie" className="text-sm font-medium text-foreground/90 hover:text-foreground transition-colors">
              Movies
            </Link>
            <div className="absolute left-0 top-full pt-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
              <div className="min-w-[200px] rounded-md border border-border/60 bg-background/95 backdrop-blur shadow-lg p-2">
                <Link href="/movie?category=popular" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  Popular movies
                </Link>
                <Link href="/movie?category=now_playing" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  Now playing
                </Link>
                <Link href="/movie?category=top_rated" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  Top rated
                </Link>
                <Link href="/suggestions" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-primary hover:text-accent-foreground">
                  Selected for you
                </Link>
              </div>
            </div>
          </div>

          <div className="relative group">
            <span className="text-sm font-medium text-foreground/40 cursor-not-allowed select-none">
              TV Series
            </span>
            <div className="absolute left-0 top-full pt-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
              <div className="min-w-[200px] rounded-md border border-border/60 bg-background/95 backdrop-blur shadow-lg p-2">
                {/*
                <Link href="/tv?category=popular" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  Popular series
                </Link>
                <Link href="/tv?category=airing_today" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  Airing today
                </Link>
                <Link href="/tv?category=on_the_air" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  On the air
                </Link>
                <Link href="/tv?category=top_rated" className="block rounded-sm px-3 py-2 text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground">
                  Top rated
                </Link>
  */}
                <span className="block rounded-sm px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                  Coming soon...
                </span>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="flex items-center gap-4">
          {isLoggedIn && user ? (
            <div className="relative group  flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">Tonight</span>
              <button
                className="focus:outline-none"
                onClick={() => router.push("/profile")}
                aria-label="Go to profile"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer">
                  <AvatarImage
                    src={(() => {
                      if (user.avatar) {
                        const found = AVATAR_OPTIONS.find(opt => opt.id === user.avatar);
                        return found ? found.src : "/friendly-avatar-illustration.jpg";
                      }
                      return "/friendly-avatar-illustration.jpg";
                    })()}
                  />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user.username ? user.username.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
              
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
