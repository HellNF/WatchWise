"use client"

import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Check, Star, Calendar } from "lucide-react"

// Mock data for seen movies
const seenMovies = [
  {
    id: 1,
    title: "Inception",
    year: 2010,
    poster: "/interstellar-movie-poster-space-wormhole.jpg",
    rating: 9,
    watchedDate: "Yesterday",
    myRating: 5
  },
  {
    id: 2,
    title: "Dune: Part Two",
    year: 2024,
    poster: "/dune-part-two-poster.jpg", // Placeholder
    rating: 8.8,
    watchedDate: "2 days ago",
    myRating: 4
  },
  {
    id: 3,
    title: "Everything Everywhere All At Once",
    year: 2022,
    poster: "/eeao-poster.jpg", // Placeholder
    rating: 8.9,
    watchedDate: "Last Week",
    myRating: 5
  },
  {
    id: 4,
    title: "Past Lives",
    year: 2023,
    poster: "/past-lives-poster.jpg", // Placeholder
    rating: 8.0,
    watchedDate: "2 weeks ago",
    myRating: 4
  }
]

export default function SeenMoviesPage() {
  return (
    <main className="min-h-screen pb-28">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-full">
                <Check className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Movies You've Seen</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seenMovies.map((movie) => (
            <div key={movie.id} className="flex gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors">
              <div className="w-20 h-28 bg-muted rounded-lg shrink-0 overflow-hidden relative">
                 {/* Simulate Image if available, otherwise gray placeholder */}
                 <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-muted-foreground text-xs text-center p-1">
                    {movie.poster.includes("placeholder") ? movie.title : <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />}
                 </div>
              </div>
              
              <div className="flex flex-col justify-between py-1 flex-1">
                <div>
                  <h3 className="font-semibold line-clamp-1">{movie.title}</h3>
                  <p className="text-sm text-muted-foreground">{movie.year}</p>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Watched {movie.watchedDate}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                       {[...Array(5)].map((_, i) => (
                           <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < movie.myRating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} 
                           />
                       ))}
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </main>
  )
}
