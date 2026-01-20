"use client"

import { Home, Film, User, Laugh } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/movie?category=popular", icon: Home, label: "Home" },
  { href: "/seen", icon: Film, label: "Watched" },
  {href:"/questionnaire", icon: Laugh, label: "Mood"},
  { href: "/profile", icon: User, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 ">
      <div className="liquid-glass rounded-3xl w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-around h-14 sm:h-16 md:h-18 px-2 sm:px-3 md:px-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 py-1.5 sm:py-2 px-3 sm:px-4 md:px-5 rounded-2xl transition-all duration-300"
              >
                {/* Active pill background */}
                {isActive && <div className="absolute inset-0 liquid-glass-active rounded-2xl" />}

                <div className="relative z-10">
                  <Icon
                    className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-colors duration-300 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] ${
                      isActive ? "text-primary" : "text-white/80"
                    }`}
                  />
                </div>
                <span
                  className={`relative z-10 text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-white/80"
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
