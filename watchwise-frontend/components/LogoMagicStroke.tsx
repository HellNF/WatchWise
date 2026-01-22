import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

export function LogoMagicStroke({ className, ...props }: LogoProps) {
  // ID univoci per evitare conflitti se usi altri SVG nella pagina
  const gradientId = "ww-magic-gradient"
  const filterId = "ww-neon-glow"

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
        {/* Gradiente Fluido: Primary (Viola) -> Mint -> Accent (Arancio) */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" /> {/* Violet-600 */}
          <stop offset="50%" stopColor="#2dd4bf" /> {/* Teal-400 */}
          <stop offset="100%" stopColor="#f59e0b" /> {/* Amber-500 */}
        </linearGradient>

        {/* Filtro Neon Glow per dare spessore e luce */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        {/* La W "Chunky" */}
        <path
          d="M10 15 L30 65 L50 25 L70 65 L90 25"
          stroke={`url(#${gradientId})`}
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* La Scintilla Finale (Sparkle) */}
        <g transform="translate(90, 10) scale(1.5)">
          <path
            d="M15 0 C15 0 18 10 28 15 C 18 20 15 30 15 30 C 15 30 12 20 2 15 C 12 10 15 0 15 0 Z"
            fill="#f59e0b" // Colore Accento solido per la scintilla
          />
        </g>
      </g>
    </svg>
  )
}