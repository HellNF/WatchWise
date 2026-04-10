"use client"

import { Home, Users, User, Search, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  
  {href:"/search", icon: Search, label: "Search"},
  { href: "/suggestions", icon: Sparkles, label: "For you" },
  {href:"/groups", icon: Users, label: "Groups"},
  { href: "/profile", icon: User, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 sm:bottom-4 sm:left-4 sm:right-4">
      <div className="liquid-glass mx-auto w-full max-w-xl rounded-[1.75rem] px-1.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5 shadow-lg backdrop-blur-sm">
        <div className="grid h-16 grid-cols-5 items-center gap-1 sm:h-[4.25rem] sm:gap-2 sm:px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const isForYou = item.label === "For you"

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-300"
              >
                {/* Active pill background */}
                {isActive && (
                  <div
                    className={`absolute inset-0 rounded-2xl ${
                      isForYou ? "liquid-glass-active-for-you" : "liquid-glass-active"
                    }`}
                  />
                )}

                <div className="relative z-10">
                  <Icon
                    className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-colors duration-300 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] ${
                      isActive
                        ? isForYou
                          ? "text-discovery drop-shadow-[0_0_12px_rgba(250,204,21,0.75)]"
                          : "text-primary"
                        : "text-white/80"
                    }`}
                  />
                </div>
                <span
                  className={`relative z-10 max-w-full truncate px-1 text-[10px] font-medium transition-colors duration-300 sm:text-[11px] ${
                    isActive
                      ? isForYou
                        ? "text-discovery drop-shadow-[0_0_10px_rgba(250,204,21,0.65)]"
                        : "text-primary"
                      : "text-white/80"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
