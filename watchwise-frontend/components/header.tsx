"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Film } from "lucide-react"
import Link from "next/link"
import { LogoDisconnectedSpark } from "@/components/LogoDisconnectedSpark"
import { LogoMagicStroke } from "./LogoMagicStroke"


export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const hasUser = Boolean(localStorage.getItem("watchwise-user"))
    const hasToken = Boolean(localStorage.getItem("watchwise-token"))
    setIsLoggedIn(hasUser || hasToken)
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
            <Link  href="/tv" className="text-sm font-medium text-foreground/90 hover:text-foreground transition-colors disabled:opacity-50">
              TV Series
            </Link>
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
          {isLoggedIn ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">Tonight</span>
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src="/friendly-avatar-illustration.jpg" />
                <AvatarFallback className="bg-secondary text-secondary-foreground">M</AvatarFallback>
              </Avatar>
            </>
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
