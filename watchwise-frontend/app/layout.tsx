import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "WatchWise - Your Smart Movie Companion",
  description: "Stop scrolling, start watching. WatchWise suggests the perfect films for your evening.",
  generator: "WatchWise v1.0.0",
  // Nota: Se usi file 'icon.tsx' e 'apple-icon.tsx' nella cartella app/, 
  // Next.js li rileva automaticamente. Questa configurazione manuale è comunque valida.
  icons: {
    icon: [
      {
        url: "/icon?v=2", // ?v=2 costringe il browser a riscaricarla
        type: "image/png",
        sizes: "32x32",
      }
    ],
    apple: [
      {
        url: "/apple-icon?v=2", 
        type: "image/png",
        sizes: "180x180",
      }
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#09090b", // Aggiornato a Zinc 950 per matchare lo sfondo
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // 1. Forziamo la classe dark
    <html lang="en" className="dark">
      <body
        className={cn(
          inter.className,
          // 2. Impostiamo lo sfondo base scuro e il colore di selezione neon
          "min-h-screen bg-zinc-950 text-foreground antialiased selection:bg-violet-500/30"
        )}
      >
        {children}
        
        {/* 3. Posizioniamo le notifiche in alto al centro */}
        <Toaster position="top-center" richColors />
        
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
