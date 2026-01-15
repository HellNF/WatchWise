import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Film } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-16 max-w-10/12 mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Film className="h-7 w-7 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/30" />
          </div>
          <span className="text-xl font-semibold tracking-tight">WatchWise</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">Tonight</span>
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src="/friendly-avatar-illustration.jpg" />
            <AvatarFallback className="bg-secondary text-secondary-foreground">M</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
