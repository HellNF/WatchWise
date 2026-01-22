"use client"

import { useEffect, useState } from "react"
import { CircleCheckBig, Plus, Star, ThumbsDown } from "lucide-react"
import {
  addListItem,
  getLists,
  getMovieDetails,
  postPreferenceEvents,
  postWatchHistory,
  type UserList,
} from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const ratingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function MovieQuickActions({
  movieId,
  showHistory = true,
  showLists = true,
  showNotInterested = false,
  onNotInterested,
}: {
  movieId: string
  showHistory?: boolean
  showLists?: boolean
  showNotInterested?: boolean
  onNotInterested?: (movieId: string) => void
}) {
  const [lists, setLists] = useState<UserList[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [savingList, setSavingList] = useState<string | null>(null)
  const [savingHistory, setSavingHistory] = useState(false)
  const [savingNotInterested, setSavingNotInterested] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  useEffect(() => {
    if (!listOpen) return
    let active = true

    const load = async () => {
      setListLoading(true)
      setListError(null)
      try {
        const data = await getLists()
        if (active) setLists(data)
      } catch {
        if (active) setListError("Unable to load lists.")
      } finally {
        if (active) setListLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [listOpen])

  const handleAddToHistory = async (rating: number) => {
    if (!movieId) return
    setSavingHistory(true)
    try {
      await postWatchHistory({ movieId, rating })
      toast.success("Added to watch history")
    } finally {
      setSavingHistory(false)
    }
  }

  const handleNotInterested = async () => {
    if (!movieId) return
    setSavingNotInterested(true)
    try {
      const details = await getMovieDetails(movieId)
      const events = [{ type: "movie", value: movieId, weight: -1, source: "feedback" }]

      if (details.genres?.length) {
        const perGenre = -0.6 / details.genres.length
        for (const genre of details.genres) {
          events.push({ type: "genre", value: genre, weight: perGenre, source: "feedback" })
        }
      }

      if (details.director) {
        events.push({ type: "director", value: details.director, weight: -0.4, source: "feedback" })
      }

      if (details.actorsDetailed?.length) {
        const topActors = details.actorsDetailed.slice(0, 3)
        const perActor = -0.3 / topActors.length
        for (const actor of topActors) {
          events.push({ type: "actor", value: actor.name, weight: perActor, source: "feedback" })
        }
      }

      if (!events.length) {
        toast.message("Not enough info to update preferences")
        return
      }

      await postPreferenceEvents(events)
      toast.success("Got it — we will avoid similar picks")
      onNotInterested?.(movieId)
    } finally {
      setSavingNotInterested(false)
    }
  }

  const handleAddToList = async (listId?: string) => {
    if (!movieId || !listId) return
    setSavingList(listId)
    try {
      await addListItem(listId, movieId)
      const listName = lists.find((list) => list.id === listId)?.name
      toast.success(listName ? `Added to ${listName}` : "Added to list")
    } finally {
      setSavingList(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {showNotInterested && (
        <Button
          size="icon"
          variant="outline"
          aria-label="Not interested"
          disabled={savingNotInterested}
          onClick={handleNotInterested}
          className="h-7 w-7"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      )}
      {showHistory && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              aria-label="Add to watch history"
              disabled={savingHistory}
              className="h-7 w-7"
            >
              <CircleCheckBig className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel>Rate this movie</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ratingOptions.map((value) => (
              <DropdownMenuItem
                key={`rating-${value}`}
                onClick={() => handleAddToHistory(value)}
              >
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {value} / 10
                </span>
              </DropdownMenuItem>
            ))}
            {showNotInterested ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleNotInterested}
                  disabled={savingNotInterested}
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    Not interested
                  </span>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showLists && (
        <DropdownMenu onOpenChange={setListOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              aria-label="Add to list"
              className="h-7 w-7"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Choose a list</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {listLoading ? (
              <DropdownMenuItem disabled>Loading lists...</DropdownMenuItem>
            ) : listError ? (
              <DropdownMenuItem disabled>{listError}</DropdownMenuItem>
            ) : lists.length ? (
              lists.map((list, index) => (
                <DropdownMenuItem
                  key={`${list.id ?? list.slug ?? list.name ?? "list"}-${index}`}
                  onClick={() => handleAddToList(list.id)}
                  disabled={!list.id || savingList === list.id}
                >
                  {list.name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No lists available</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
