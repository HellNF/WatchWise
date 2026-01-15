"use client"

import { Home, Film, User, Laugh } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/seen", icon: Film, label: "Watched" },
  {href:"/questionnaire", icon: Laugh, label: "Mood"},
  { href: "/profile", icon: User, label: "Profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 ">
      <div className="liquid-glass rounded-3xl max-w-md mx-auto backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-around h-16 px-2 ">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 py-2 px-5 rounded-2xl transition-all duration-300"
              >
                {/* Active pill background */}
                {isActive && <div className="absolute inset-0 liquid-glass-active rounded-2xl" />}

                <div className="relative z-10">
                  <Icon
                    className={`h-5 w-5 transition-colors duration-300 ${isActive ? "text-primary" : "text-white/60"}`}
                  />
                </div>
                <span
                  className={`relative z-10 text-[10px] font-medium transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-white/60"
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
