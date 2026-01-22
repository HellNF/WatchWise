import React from "react"
import { cn } from "@/lib/utils"

// --- GRADIENTI & DEFINIZIONI ---
const SparkleGradients = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      {/* Gradiente "Magic" Fluido */}
      <linearGradient id="spark-grad-magic" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" /> {/* Primary */}
        <stop offset="50%" stopColor="#2dd4bf" /> {/* Mint */}
        <stop offset="100%" stopColor="#f59e0b" /> {/* Accent */}
      </linearGradient>

      {/* Gradiente Solido Verticale */}
      <linearGradient id="spark-grad-block" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      
      {/* Glow intenso per il neon */}
      <filter id="neon-heavy" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Forma della Scintilla a 4 punte riutilizzabile */}
      <path id="star-4" d="M10 0 C10 0 12 6 18 10 C 12 14 10 20 10 20 C 10 20 8 14 2 10 C 8 6 10 0 10 0 Z" />
    </defs>
  </svg>
)

// --- 1. THE MAGIC STROKE ---
// Tubo neon spessissimo che termina in una scintilla
const LogoMagicStroke = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 140 80" className={cn("w-56 h-32", className)} fill="none">
    <g filter="url(#neon-heavy)">
      {/* La W fluida */}
      <path 
        d="M10 15 L30 65 L50 25 L70 65 L90 25" 
        stroke="url(#spark-grad-magic)" 
        strokeWidth="20" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* La Scintilla finale (estensione del tratto) */}
      <g transform="translate(90, 10) scale(1.5)">
         <path d="M15 0 C15 0 18 10 28 15 C 18 20 15 30 15 30 C 15 30 12 20 2 15 C 12 10 15 0 15 0 Z" fill="#f59e0b" />
      </g>
    </g>
  </svg>
)

// --- 2. THE STAR FORGE ---
// Spazio negativo tra due blocchi crea la stella
const LogoStarForge = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 80" className={cn("w-48 h-32", className)} fill="none">
    {/* Blocco W Sinistro */}
    <path d="M10 10 L30 70 L50 30 L40 10 Z" fill="#8b5cf6" />
    {/* Blocco W Destro */}
    <path d="M70 30 L90 70 L110 10 L100 10 Z" fill="#2dd4bf" />
    
    {/* Elemento centrale di connessione che crea la stella negativa */}
    <path d="M50 30 L70 30 L60 60 Z" fill="url(#spark-grad-block)" />
    
    {/* La Scintilla Sovrapposta (Punto di fusione) */}
    <g transform="translate(48, 20) scale(1.2)">
        <path d="M12 0 C12 0 15 8 22 12 C 15 16 12 24 12 24 C 12 24 9 16 2 12 C 9 8 12 0 12 0 Z" fill="white" />
    </g>
  </svg>
)

// --- 3. THE GEM BLOCK ---
// W geometrica sfaccettata con glint
const LogoGemBlock = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 80" className={cn("w-48 h-32", className)} fill="none">
    <defs>
      <linearGradient id="gem-shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
      </linearGradient>
    </defs>
    
    {/* Base Scura */}
    <path d="M10 10 L35 70 L60 20 L85 70 L110 10 H85 L70 45 L60 25 L50 45 L35 10 Z" fill="#7c3aed" />
    
    {/* Sfaccettatura Luminosa (Overlay) */}
    <path d="M10 10 L35 70 L60 20 L85 70 L110 10" fill="none" stroke="url(#gem-shine)" strokeWidth="2" opacity="0.5"/>
    
    {/* La "Glint" (Scintilla) sul bordo */}
    <g transform="translate(50, 10) scale(1.5) rotate(15)">
       <path d="M10 0 C10 0 12 6 18 10 C 12 14 10 20 10 20 C 10 20 8 14 2 10 C 8 6 10 0 10 0 Z" fill="#f59e0b" filter="drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))" />
    </g>
  </svg>
)

// --- 4. THE SPARKLE ANCHOR ---
// W massiccia con stella bucata (spazio negativo)
const LogoSparkleAnchor = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 80" className={cn("w-48 h-32", className)} fill="none">
    <mask id="sparkle-cutout">
      <rect width="100%" height="100%" fill="white" />
      {/* La stella che buca il logo */}
      <g transform="translate(50, 20) scale(1.8)">
        <path d="M10 0 C10 0 12 6 18 10 C 12 14 10 20 10 20 C 10 20 8 14 2 10 C 8 6 10 0 10 0 Z" fill="black" />
      </g>
    </mask>

    {/* La forma W Chunky con gradiente e maschera */}
    <path 
      d="M15 15 L35 65 L60 25 L85 65 L105 15" 
      stroke="url(#spark-grad-magic)" 
      strokeWidth="26" 
      strokeLinecap="square" 
      strokeLinejoin="miter"
      mask="url(#sparkle-cutout)"
    />
  </svg>
)

// --- COMPONENTE VISUALIZZAZIONE ---
export default function SparkleLogoShowcase() {
  return (
    <section className="py-24 bg-zinc-950 text-white min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-[url('/noise.svg')] mix-blend-overlay pointer-events-none"></div>
      <SparkleGradients />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-mint-300 to-amber-400">
            Chunky + Sparkles
          </h2>
          <p className="text-zinc-400 text-lg font-medium">Bold structures powered by magic.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* 1. Magic Stroke */}
          <div className="group cursor-pointer bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center hover:bg-zinc-900/80 hover:border-amber-500/50 transition-all duration-300">
            <div className="h-40 flex items-center justify-center w-full">
               <LogoMagicStroke className="transition-transform duration-300 group-hover:-translate-y-2" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-white mb-1">1. Magic Stroke</h3>
              <p className="text-xs text-zinc-500">Neon pesante + Esplosione finale. L'evoluzione diretta del Dual Bandwidth.</p>
            </div>
          </div>

          {/* 2. Star Forge */}
          <div className="group cursor-pointer bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center hover:bg-zinc-900/80 hover:border-violet-500/50 transition-all duration-300">
            <div className="h-40 flex items-center justify-center w-full">
               <LogoStarForge className="transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-white mb-1">2. Star Forge</h3>
              <p className="text-xs text-zinc-500">Geometria solida. La stella nasce dalla fusione dei due blocchi W.</p>
            </div>
          </div>

          {/* 3. Gem Block */}
          <div className="group cursor-pointer bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center hover:bg-zinc-900/80 hover:border-mint/50 transition-all duration-300">
            <div className="h-40 flex items-center justify-center w-full">
               <LogoGemBlock className="transition-transform duration-300 group-hover:rotate-2" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-white mb-1">3. Gem Block</h3>
              <p className="text-xs text-zinc-500">Monolite tech. Una gemma solida con una scintilla di luce sul bordo.</p>
            </div>
          </div>

           {/* 4. Sparkle Anchor */}
           <div className="group cursor-pointer bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center hover:bg-zinc-900/80 hover:border-white/50 transition-all duration-300">
            <div className="h-40 flex items-center justify-center w-full">
               <LogoSparkleAnchor className="transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-black text-white mb-1">4. Sparkle Anchor</h3>
              <p className="text-xs text-zinc-500">Spazio negativo. La stella è intagliata direttamente nel flusso pesante.</p>
            </div>
          </div>

        </div>

        {/* Navbar Test */}
        <div className="mt-20 border-t border-white/10 pt-10 flex flex-col items-center">
            <p className="text-zinc-600 mb-6 uppercase tracking-widest text-xs font-black">Navbar Implementation</p>
            <div className="flex justify-center gap-12 bg-black/80 p-6 rounded-full border border-white/10 backdrop-blur-xl">
                {/* Test Magic Stroke */}
                <div className="flex items-center gap-3">
                    <LogoMagicStroke className="w-14 h-8" />
                    <span className="font-black text-xl tracking-tight text-white hidden md:block">WatchWise</span>
                </div>
                 {/* Test Anchor */}
                 <div className="flex items-center gap-3 border-l border-white/10 pl-8">
                    <LogoSparkleAnchor className="w-12 h-8" />
                    <span className="font-black text-xl tracking-tight text-white hidden md:block">WatchWise</span>
                </div>
            </div>
        </div>
      </div>
    </section>
  )
}