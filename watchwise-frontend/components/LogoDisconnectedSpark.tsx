import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

export function LogoDisconnectedSpark({ className, ...props }: LogoProps) {
  // ID univoci per i gradienti/filtri di questo specifico logo
  const gradientMainId = "ww-ds-gradient-main"
  const gradientSparkId = "ww-ds-gradient-spark"
  const filterId = "ww-ds-neon-glow"

  return (
    <svg
      viewBox="0 0 140 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="WatchWise Logo"
      className={cn("w-32 h-auto text-foreground", className)}
      {...props}
    >
      <defs>
        {/* Gradiente Principale per la W: Violet -> Mint -> Amber */}
        <linearGradient id={gradientMainId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" /> {/* Violet-600 */}
          <stop offset="50%" stopColor="#2dd4bf" /> {/* Teal-400 */}
          <stop offset="100%" stopColor="#f59e0b" /> {/* Amber-500 */}
        </linearGradient>

        {/* Gradiente Verticale per la Scintilla: Amber -> Violet */}
        <linearGradient id={gradientSparkId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" /> {/* Amber */}
          <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet */}
        </linearGradient>

        {/* Filtro Neon Glow */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        {/* Il Tratto Veloce (W incompleta) */}
        <path
          d="M10 15 L35 65 L60 25 L85 65"
          stroke={`url(#${gradientMainId})`}
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* La Scintilla Sospesa (Completa la forma visiva della W) */}
        <g transform="translate(95, 20) scale(1.8) rotate(10)">
          <path
            d="M10 0 C10 0 12 6 18 10 C 12 14 10 20 10 20 C 10 20 8 14 2 10 C 8 6 10 0 10 0 Z"
            fill={`url(#${gradientSparkId})`}
          />
        </g>
      </g>
    </svg>
  )
}