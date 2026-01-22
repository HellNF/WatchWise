"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowRight, Plus, Link2, Info, LogOut } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  createGroup,
  getGroups,
  joinGroup,
  leaveGroup,
  type GroupSummary,
} from "@/lib/api"

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null)

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await getGroups()
      setGroups(data)
    } catch (err: any) {
      setError(err?.message ?? "Errore nel caricamento gruppi")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  const list = useMemo(() => groups ?? [], [groups])

  const handleCreate = async () => {
    if (!createName.trim()) return
    try {
      setCreating(true)
      await createGroup({ name: createName.trim() })
      setCreateName("")
      await loadGroups()
    } catch (err: any) {
      setError(err?.message ?? "Errore durante la creazione")
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      setJoining(true)
      await joinGroup(joinCode.trim())
      setJoinCode("")
      await loadGroups()
    } catch (err: any) {
      setError(err?.message ?? "Errore durante il join")
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    try {
      setError(null)
      setLeavingGroupId(groupId)
      await leaveGroup(groupId)
      await loadGroups()
    } catch (err: any) {
      setError(err?.message ?? "Errore durante l'uscita dal gruppo")
    } finally {
      setLeavingGroupId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="relative bg-[radial-gradient(700px_circle_at_50%_0%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(650px_circle_at_50%_100%,rgba(49,213,180,0.20),transparent_55%)] ">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_0%_0%,rgba(99,102,241,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(650px_circle_at_100%_15%,rgba(236,72,153,0.08),transparent_55%)]" />
        </div>

        <main className="px-4 md:px-6 lg:px-8 max-w-5xl mx-auto pb-24 relative">
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Movie night</p>
            <h1 className="text-3xl font-semibold">Manage your groups</h1>
            <p className="text-sm text-muted-foreground">
              Create or join a group to get suggestions tailored for everyone.
            </p>
          </div>

          <section className="grid gap-6 md:grid-cols-2 mt-6">
            <Card className="border-border/50 bg-background/80 shadow-lg backdrop-blur bg-[radial-gradient(140%_90%_at_50%_0%,rgba(236,72,153,0.18),transparent_60%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Plus className="h-4 w-4" />
                <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  Create group
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Create a new group and share the join code with friends.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex flex-col items-center ">

              <Image
                  src="/CreateGroupVisual.png"
                  alt="Friends creating a movie night group"
                  width={560}
                  height={280}
                  className="h-full w-auto max-w-[90%] opacity-95 drop-shadow-[0_10px_30px_rgba(15,23,42,0.35)] aspect-[16/9]"
                  priority
                />
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Group name"
                className="border-white/20 text-center tracking-widest uppercase font-mono"
              />
              <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </CardContent>
            </Card>

            <Card className="border-border/50 bg-background/80 shadow-lg backdrop-blur bg-[radial-gradient(140%_90%_at_50%_0%,rgba(16,185,129,0.2),transparent_60%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Link2 className="h-4 w-4" />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Join with code
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    Enter the 8+ character code shared by the host.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex flex-col items-center ">

              <Image
                  src="/JoinGroupVisual.png"
                  alt="Joining a group with a code"
                  width={560}
                  height={280}
                  className="h-full w-auto max-w-[90%] opacity-95 drop-shadow-[0_10px_30px_rgba(15,23,42,0.35)] aspect-[16/9]"
                  priority
                />
              <Input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Join code"
                className="border-white/20 text-center tracking-widest uppercase font-mono"
              />
              <Button onClick={handleJoin} disabled={joining || !joinCode.trim()} >
                {joining ? "Joining..." : "Join"}
              </Button>
            </CardContent>
            </Card>
          </section>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Your groups
            </h2>
            {loading ? <Badge variant="secondary">Loading</Badge> : null}
          </div>

          {error ? (
            <Card className="border-destructive/40">
              <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : null}

          {!loading && !list.length ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No groups yet. Create one or join with a code.
              </CardContent>
            </Card>
          ) : null}

            <div className="grid gap-4">
            {list.map((group) => (
              <Card
              key={group.id}
              className="border-border/50 bg-background/80 shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg bg-[radial-gradient(120%_100%_at_20%_0%,rgba(99,102,241,0.12),transparent_55%)]"
              >
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="mx-3">
                <h3 className="text-2xl font-semibold">
                  <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                  {group.name}
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>{group.members.length} members</span>
                  {group.status ? <Badge variant="secondary">{group.status}</Badge> : null}
                  {group.joinCode ? (
                  <Badge variant="outline">Code: {group.joinCode}</Badge>
                  ) : null}
                </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  asChild
                  variant="ghost"
                  className="gap-2 hover:text-white rounded-full border border-transparent bg-[linear-gradient(var(--background),var(--background)),linear-gradient(90deg,rgba(99,102,241,0.9),rgba(236,72,153,0.9),rgba(16,185,129,0.9))] [background-clip:padding-box,border-box] [background-origin:border-box] hover:scale-105" 
                >
                  <Link href={`/groups/${group.id}`}>
                  Open group <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  disabled={loading || leavingGroupId === group.id}
                  className="relative overflow-hidden rounded-full border border-destructive/70 px-5 py-2 text-[0.65rem] font-semibold  tracking-[0.35em] text-destructive  transition duration-300 focus-visible:ring-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:scale-105"
                  onClick={() => handleLeaveGroup(group.id)}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    {leavingGroupId === group.id ? "Leaving..." : "Leave"}
                  </span>
                </Button>
                </div>
              </CardContent>
              </Card>
            ))}
            </div>
        </section>
      </main>
      </div>

      <BottomNav />
    </div>
  )
}
