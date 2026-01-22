"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MovieCard } from "@/components/movie-card"
import { Button } from "@/components/ui/button"
import {
  getLists,
  getListItems,
  getMovieDetails,
  removeListItem,
  createList,
  deleteList,
  type MovieDetails,
  type UserList,
  type UserListItem,
} from "@/lib/api"

const POSTER_BASE = "https://image.tmdb.org/t/p/w500"

type ListMovieCard = {
  id: string
  title: string
  year?: number
  poster?: string
  rating?: number
  addedAt?: string
}

function toPosterUrl(posterPath?: string) {
  if (!posterPath) return "/placeholder.svg"
  if (posterPath.startsWith("http")) return posterPath
  return `${POSTER_BASE}${posterPath}`
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await mapper(items[i])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export default function ListsPage() {
  const searchParams = useSearchParams()
  const listParam = searchParams.get("listId")
  const [lists, setLists] = useState<UserList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [items, setItems] = useState<UserListItem[]>([])
  const [cards, setCards] = useState<ListMovieCard[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState("")
  const [creatingList, setCreatingList] = useState(false)
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadLists = async () => {
      setLoadingLists(true)
      setError(null)
      try {
        const data = await getLists()
        if (!active) return
        setLists(data)
        if (!selectedListId && data.length) {
          const initial = listParam && data.some((list) => list.id === listParam)
            ? listParam
            : data[0].id
          setSelectedListId(initial)
        }
      } catch {
        if (active) setError("Unable to load lists.")
      } finally {
        if (active) setLoadingLists(false)
      }
    }

    loadLists()
    return () => {
      active = false
    }
  }, [listParam, selectedListId])

  useEffect(() => {
    let active = true

    const loadItems = async () => {
      if (!selectedListId) {
        setItems([])
        setCards([])
        return
      }
      setLoadingItems(true)
      setError(null)
      try {
        const listItems = await getListItems(selectedListId)
        if (!active) return
        setItems(listItems)

        if (!listItems.length) {
          setCards([])
          return
        }

        const details = await mapWithConcurrency(listItems, 6, (item) => getMovieDetails(item.movieId))
        if (!active) return

        const mapped = listItems.map((item, index) => {
          const detail = details[index] as MovieDetails | undefined
          return {
            id: item.movieId,
            title: detail?.title ?? item.movieId,
            year: detail?.year,
            poster: toPosterUrl(detail?.posterPath),
            rating: detail?.rating,
            addedAt: item.addedAt,
          }
        })

        setCards(mapped)
      } catch {
        if (active) setError("Unable to load list items.")
      } finally {
        if (active) setLoadingItems(false)
      }
    }

    loadItems()
    return () => {
      active = false
    }
  }, [selectedListId, refreshKey])

  const headerSubtitle = useMemo(() => {
    if (!selectedListId) return "Choose a list to see its movies."
    const list = lists.find((entry) => entry.id === selectedListId)
    return list ? `${list.name} · ${items.length} movies` : "Choose a list to see its movies."
  }, [selectedListId, lists, items.length])

  const activeList = useMemo(
    () => lists.find((entry) => entry.id === selectedListId) ?? null,
    [selectedListId, lists]
  )

  const activeListIsDeletable = activeList ? !activeList.isDefault : false

  return (
    <main className="min-h-screen pb-28 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_50%)]">
      <Header />
      <div className="container mx-auto px-4 py-10 mx-1 max-w-11/12">
        <div className="flex flex-col gap-3 mb-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300/80">
            Your Lists
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Lists</h1>
              <p className="text-base text-muted-foreground">{headerSubtitle}</p>
            </div>
            <Button
              className="h-11 text-base"
              variant="outline"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              disabled={loadingLists || loadingItems}
            >
              {loadingItems ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          {loadingLists ? (
            <div className="text-sm text-muted-foreground">Loading lists...</div>
          ) : lists.length ? (
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => (
                <Button
                  key={list.id}
                  variant={selectedListId === list.id ? "default" : "outline"}
                  className="h-9 text-sm"
                  onClick={() => setSelectedListId(list.id)}
                >
                  {list.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No lists available.</div>
          )}

          {activeListIsDeletable ? (
            <Button
              variant="outline"
              className="h-9 text-xs"
              disabled={!activeList || deletingListId === activeList.id}
              onClick={async () => {
                if (!activeList) return
                setDeletingListId(activeList.id)
                try {
                  await deleteList(activeList.id)
                  setLists((prev) => prev.filter((entry) => entry.id !== activeList.id))
                  if (selectedListId === activeList.id) {
                    setSelectedListId(null)
                  }
                } finally {
                  setDeletingListId(null)
                }
              }}
            >
              {deletingListId === activeList?.id ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="h-11 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm"
            placeholder="New list name"
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
          />
          <Button
            className="h-11 text-base"
            disabled={!newListName.trim() || creatingList}
            onClick={async () => {
              const name = newListName.trim()
              if (!name) return
              setCreatingList(true)
              try {
                const created = await createList(name)
                setLists((prev) => [created, ...prev])
                setSelectedListId(created.id)
                setNewListName("")
              } finally {
                setCreatingList(false)
              }
            }}
          >
            {creatingList ? "Creating..." : "Create list"}
          </Button>
        </div>

        {error ? (
          <div className="text-destructive">{error}</div>
        ) : loadingItems ? (
          <div className="text-muted-foreground">Loading list items...</div>
        ) : !cards.length ? (
          <div className="text-muted-foreground">No movies in this list.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map((movie) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                poster={movie.poster}
                year={movie.year}
                rating={movie.rating}
                meta={
                  movie.addedAt ? (
                    <div className="text-xs text-muted-foreground">
                      Added {new Date(movie.addedAt).toLocaleDateString()}
                    </div>
                  ) : null
                }
              >
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedListId || removingId === movie.id}
                  onClick={async () => {
                    if (!selectedListId) return
                    setRemovingId(movie.id)
                    try {
                      await removeListItem(selectedListId, movie.id)
                      setItems((prev) => prev.filter((item) => item.movieId !== movie.id))
                      setCards((prev) => prev.filter((item) => item.id !== movie.id))
                    } finally {
                      setRemovingId(null)
                    }
                  }}
                  className="h-7 text-xs"
                >
                  {removingId === movie.id ? "Removing..." : "Remove"}
                </Button>
              </MovieCard>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
