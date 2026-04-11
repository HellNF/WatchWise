"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog"
import { Users, ArrowRight, Plus, Link2, LogOut, Loader2, Sparkles, TriangleAlert } from "lucide-react"
import {
  createGroup,
  getGroups,
  joinGroup,
  leaveGroup,
  type GroupSummary,
} from "@/lib/api"

function formatJoinCode(code?: string) {
  if (!code) return null
  const cleaned = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  if (cleaned.length <= 4) return cleaned
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}${cleaned.length > 8 ? `-${cleaned.slice(8, 12)}` : ""}`
}

export default function GroupsPage() {
  const checking = useRequireAuth()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null)
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState<GroupSummary | null>(null)

  const loadGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getGroups()
      setGroups(data)
    } catch (err: any) {
      setError(err?.message ?? "Error loading groups")
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
      setError(null)
      await createGroup({ name: createName.trim() })
      setCreateName("")
      await loadGroups()
    } catch (err: any) {
      setError(err?.message ?? "Error creating group")
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    try {
      setJoining(true)
      setError(null)
      await joinGroup(joinCode.trim())
      setJoinCode("")
      await loadGroups()
    } catch (err: any) {
      setError(err?.message ?? "Error joining group")
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
      setError(err?.message ?? "Error leaving group")
    } finally {
      setLeavingGroupId(null)
    }
  }

  if (checking) return null

  return (
    <main className="relative min-h-screen bg-zinc-950 pb-28 text-foreground selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay" />
      <div className="pointer-events-none fixed left-0 top-0 z-0 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px] opacity-40" />
      <div className="pointer-events-none fixed bottom-0 right-0 z-0 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px] opacity-30" />

      <div className="relative z-10">
        <Header />

        <div className="mx-auto max-w-5xl px-4 pt-8 md:px-6 lg:px-8">
          <div className="mb-10 space-y-3 text-center">
            <Badge
              variant="outline"
              className="mb-2 border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground"
            >
              Sync and watch
            </Badge>
            <h1 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              Manage your{" "}
              <span className="bg-gradient-to-r from-violet-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                groups
              </span>
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground md:text-[15px]">
              Create a lobby or join one with an invite code, then return here whenever your group is ready to pick something together.
            </p>
          </div>

          <div className="mb-12 grid gap-6 md:grid-cols-2">
            <Card className="group relative overflow-hidden border-white/10 bg-zinc-900/40 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <CardContent className="relative z-10 flex flex-col items-center p-6 text-center md:p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 transition-transform duration-300 group-hover:scale-110">
                  <Plus className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-[-0.02em]">Create a group</h3>
                <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
                  Start a new lobby and invite everyone with a single code.
                </p>

                <div className="w-full space-y-3">
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate()
                    }}
                    placeholder="Cinema Squad"
                    className="h-12 border-white/10 bg-black/20 text-center text-base text-white placeholder:text-zinc-500 focus-visible:ring-violet-500/50"
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !createName.trim()}
                    className="h-12 w-full font-semibold text-black transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create group"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-white/10 bg-zinc-900/40 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-bl from-teal-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <CardContent className="relative z-10 flex flex-col items-center p-6 text-center md:p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/10 transition-transform duration-300 group-hover:scale-110">
                  <Link2 className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-[-0.02em]">Join with code</h3>
                <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
                  Enter the invite code shared by the host to jump straight into the lobby.
                </p>

                <div className="w-full space-y-3">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleJoin()
                    }}
                    placeholder="ABCD-1234"
                    className="h-12 border-white/10 bg-black/20 text-center font-mono text-base uppercase tracking-[0.22em] text-white placeholder:text-zinc-500 focus-visible:ring-teal-500/50"
                  />
                  <Button
                    onClick={handleJoin}
                    disabled={joining || !joinCode.trim()}
                    className="h-12 w-full border border-white/5 bg-zinc-800 font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-zinc-700"
                  >
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join group"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
                  <Users className="h-5 w-5 text-zinc-400" />
                  Your squads
                </h2>
                <p className="mt-1 text-sm text-zinc-500">Open an existing group or leave the ones you no longer use.</p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {!loading && list.length === 0 && !error && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-sm leading-6 text-muted-foreground">
                  You are not in any groups yet. Create one above or ask a host to share an invite code.
                </p>
              </div>
            )}

            <div className="grid gap-4">
              <AnimatePresence>
                {list.map((group) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group overflow-hidden border-white/5 bg-zinc-900/60 transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/80">
                      <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold tracking-[-0.02em] text-white transition-all group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-teal-300 group-hover:bg-clip-text group-hover:text-transparent">
                              {group.name}
                            </h3>
                            {group.status && (
                              <Badge variant="secondary" className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                                {group.status}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {group.members.length} members
                            </span>
                            {group.joinCode && (
                              <span className="rounded border border-white/5 bg-black/30 px-1.5 py-0.5 font-mono text-zinc-400">
                                Code: {formatJoinCode(group.joinCode)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-3 border-t border-white/5 pt-2 md:mt-0 md:border-0 md:pt-0">
                          <Button
                            asChild
                            variant="default"
                            className="h-10 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 font-medium text-white shadow-lg shadow-violet-900/20 transition-transform duration-200 hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500"
                          >
                            <Link href={`/groups/${group.id}`}>
                              Open <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            disabled={leavingGroupId === group.id}
                            onClick={() => setConfirmLeaveGroup(group)}
                            className="h-10 rounded-full border border-rose-500/25 px-4 font-medium text-rose-400 transition-all duration-200 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            {leavingGroupId === group.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Leave</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <Footer />
        <BottomNav />
      </div>

      <AlertDialog open={!!confirmLeaveGroup} onOpenChange={(open) => { if (!open) setConfirmLeaveGroup(null) }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black/60 backdrop-blur-md" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

              <div className="flex flex-col items-center gap-5 p-7 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
                    <TriangleAlert className="h-6 w-6 text-rose-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Leave this group?</h2>
                  <p className="text-sm leading-6 text-zinc-400">
                    You are about to leave{" "}
                    <span className="font-semibold text-zinc-200">"{confirmLeaveGroup?.name}"</span>.
                    You will need the invite code to rejoin.
                  </p>
                </div>

                <div className="flex w-full gap-3 pt-1">
                  <Button
                    variant="ghost"
                    className="h-11 flex-1 rounded-2xl border border-white/10 font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
                    onClick={() => setConfirmLeaveGroup(null)}
                  >
                    Stay
                  </Button>
                  <Button
                    className="h-11 flex-1 rounded-2xl border border-rose-500/30 bg-rose-500/15 font-semibold text-rose-300 transition-all duration-200 hover:border-rose-500/50 hover:bg-rose-500/25 hover:text-rose-200"
                    disabled={!!leavingGroupId}
                    onClick={async () => {
                      if (!confirmLeaveGroup) return
                      const id = confirmLeaveGroup.id
                      setConfirmLeaveGroup(null)
                      await handleLeaveGroup(id)
                    }}
                  >
                    {leavingGroupId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Leave
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </AlertDialogPortal>
      </AlertDialog>
    </main>
  )
}
