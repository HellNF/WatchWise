"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface MovieCardProps {
  id: string
  title: string
  poster?: string
  year?: number
  rating?: number
  isDiscovery?: boolean
  reason?: string
  className?: string
}

export function MovieCard({
  id,
  title,
  poster,
  year,
  rating,
  isDiscovery,
  reason,
  className,
}: MovieCardProps) {
  const normalizedId = id.includes(":") ? id.split(":").pop() ?? id : id
  const href = `/movie/${encodeURIComponent(normalizedId)}`

  return (
    <div className={className ?? "group flex flex-col text-left"}>
      <Link
        href={href}
        className="relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-border/30 hover:ring-primary/50 transition"
      >
        <img
          src={poster || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {isDiscovery && (
          <Badge className="absolute top-2 left-2 bg-discovery/90 text-discovery-foreground text-[10px] px-1.5 py-0.5 gap-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">Discovery</span>
          </Badge>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>

      <div className="mt-2">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <p className="text-xs text-muted-foreground">
          {year ?? ""}
          {typeof rating === "number" ? ` · ${rating.toFixed(1)}` : ""}
        </p>
      </div>

      {reason && (
        <div className="mt-2 p-2 bg-secondary/50 rounded-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
        </div>
      )}
    </div>
  )
}
