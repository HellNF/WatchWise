"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function UsernameRetryForm({
  initialUsername,
  suggestions,
  onSubmit,
  loading,
  error,
}: {
  initialUsername: string
  suggestions: string[]
  onSubmit: (username: string) => void
  loading?: boolean
  error?: string | null
}) {
  const [username, setUsername] = useState(initialUsername)

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault()
        onSubmit(username)
      }}
    >
      <label className="block font-medium">Scegli un nuovo username</label>
      <Input
        value={username}
        onChange={e => setUsername(e.target.value)}
        disabled={loading}
        autoFocus
        className="w-full"
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {suggestions?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions.map(s => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUsername(s)}
              disabled={loading}
            >
              {s}
            </Button>
          ))}
        </div>
      )}
      <Button type="submit" className="mt-4 w-full" disabled={loading}>
        Conferma username
      </Button>
    </form>
  )
}
