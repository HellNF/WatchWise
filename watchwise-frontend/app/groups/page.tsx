"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
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
import { cn } from "@/lib/utils"

export default function GroupsPage() {
  const checking = useRequireAuth()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null)
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState<GroupSummary | null>(null)

  const loadGroups = async () => {
    try {
      setLoading(true)
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
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- CONTENT --- */}
      <div className="relative z-10">
        <Header />

        <div className="px-4 md:px-6 lg:px-8 max-w-5xl mx-auto pt-8">
          
          {/* Page Header */}
          <div className="text-center mb-10 space-y-2">
            <Badge variant="outline" className="mb-2 border-white/10 bg-white/5 text-muted-foreground uppercase tracking-widest text-[10px]">
              Sync & Watch
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Manage your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-teal-300 to-amber-400">Groups</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Create a squad or join one to find the perfect movie for everyone.
            </p>
          </div>

          {/* Action Grid (Create / Join) */}
          <div className="grid gap-6 md:grid-cols-2 mb-12">
            
            {/* 1. Create Card */}
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-6 md:p-8 flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 border border-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create a Group</h3>
                <p className="text-sm text-muted-foreground mb-6">Start a new lobby and invite your friends via code.</p>
                
                <div className="w-full space-y-3">
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Group Name (e.g. Cinema Squad)"
                    className="bg-black/20 border-white/10 text-center h-12 text-lg focus-visible:ring-violet-500/50"
                  />
                  <Button 
                    onClick={handleCreate} 
                    disabled={creating || !createName.trim()}
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Group"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. Join Card */}
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-bl from-teal-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-6 md:p-8 flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center mb-4 border border-teal-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Link2 className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Join with Code</h3>
                <p className="text-sm text-muted-foreground mb-6">Enter the invite code shared by the group host.</p>
                
                <div className="w-full space-y-3">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="bg-black/20 border-white/10 text-center h-12 text-lg uppercase tracking-widest font-mono focus-visible:ring-teal-500/50"
                  />
                  <Button 
                    onClick={handleJoin} 
                    disabled={joining || !joinCode.trim()}
                    className="w-full h-12 bg-zinc-800 text-white hover:bg-zinc-700 font-bold border border-white/5"
                  >
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Group"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Groups List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-zinc-400" /> 
                Your Squads
              </h2>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {!loading && list.length === 0 && !error && (
              <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">You are not in any groups yet.</p>
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
                    <Card className="border-white/5 bg-zinc-900/60 hover:bg-zinc-900/80 hover:border-white/10 transition-all duration-300 group overflow-hidden">
                      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Group Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-teal-300 transition-all">
                              {group.name}
                            </h3>
                            {group.status && (
                              <Badge variant="secondary" className="bg-white/5 text-zinc-400 text-[10px] uppercase">
                                {group.status}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {group.members.length} members
                            </span>
                            {group.joinCode && (
                              <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-zinc-400">
                                CODE: {group.joinCode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2 md:pt-0 border-t border-white/5 md:border-0 mt-2 md:mt-0">
                          <Button
                            asChild
                            variant="default"
                            className="h-10 px-6 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-900/20"
                          >
                            <Link href={`/groups/${group.id}`}>
                              Open <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>

                          <Button
                            variant="ghost"
                            disabled={leavingGroupId === group.id}
                            onClick={() => setConfirmLeaveGroup(group)}
                            className="h-10 px-4 rounded-full border border-rose-500/25 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/50 transition-all duration-200 font-medium gap-2"
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

        <BottomNav />
      </div>

      {/* ── Leave Group Confirmation Dialog ── */}
      <AlertDialog open={!!confirmLeaveGroup} onOpenChange={(open) => { if (!open) setConfirmLeaveGroup(null) }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black/60 backdrop-blur-md" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              {/* Top accent line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

              <div className="p-7 flex flex-col items-center text-center gap-5">
                {/* Icon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full" />
                  <div className="relative w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <TriangleAlert className="h-6 w-6 text-rose-400" />
                  </div>
                </div>

                {/* Text */}
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Leave this group?</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    You're about to leave{" "}
                    <span className="font-semibold text-zinc-200">
                      "{confirmLeaveGroup?.name}"
                    </span>
                    . You'll need the invite code to rejoin.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex w-full gap-3 pt-1">
                  <Button
                    variant="ghost"
                    className="flex-1 h-11 rounded-2xl border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white font-medium"
                    onClick={() => setConfirmLeaveGroup(null)}
                  >
                    Stay
                  </Button>
                  <Button
                    className="flex-1 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:border-rose-500/50 hover:text-rose-200 font-semibold transition-all duration-200 gap-2"
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