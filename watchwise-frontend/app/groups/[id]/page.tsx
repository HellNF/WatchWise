"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useRequireAuth } from "@/hooks/useRequireAuth"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  createGroupSession,
  getGroup,
  getGroupQuestionnaireStatus,
  getGroupRecommendations,
  getGroupSoftstartStatus,
  getProfile,
  getUserById,
  startGroupSession,
  type GroupQuestionnaireStatus,
  type GroupRecommendationResponse,
  type GroupSoftstartStatus,
  type GroupSummary,
  type Profile,
} from "@/lib/api"
import { 
  CheckCircle2, 
  Copy, 
  RefreshCcw, 
  Users, 
  ClipboardList, 
  ChevronLeft, 
  Sparkles, 
  Play, 
  Loader2 
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const SESSION_STORAGE_KEY = (groupId: string) => `ww-group-session:${groupId}`

const AVATAR_OPTIONS = [
  { id: "avatar_01", src: "/Avatar_1.png" },
  { id: "avatar_02", src: "/Avatar_2.png" },
  { id: "avatar_03", src: "/Avatar_3.png" },
  { id: "avatar_04", src: "/Avatar_4.png" },
  { id: "avatar_05", src: "/Avatar_5.png" },
  { id: "avatar_06", src: "/Avatar_6.png" },
  { id: "avatar_07", src: "/Avatar_7.png" },
  { id: "avatar_08", src: "/Avatar_8.png" },
  { id: "avatar_09", src: "/Avatar_9.png" },
  { id: "avatar_10", src: "/Avatar_10.png" },
  { id: "avatar_11", src: "/Avatar_11.png" },
  { id: "avatar_12", src: "/Avatar_12.png" },
]

const STATUS_COPY = {
  allReady: "All members are ready",
  collecting: "Collecting preferences",
  waiting: "Waiting for everyone",
}

function formatRelativeTime(date?: string | null) {
  if (!date) return "Online now"
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `Completed ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `Completed ${hours}h ago`
}

function normalizeMovieId(movieId: string) {
  return movieId.includes(":") ? (movieId.split(":").pop() ?? movieId) : movieId
}

function formatJoinCode(code: string) {
  const cleaned = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  if (cleaned.length <= 4) return cleaned
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}${cleaned.length > 8 ? `-${cleaned.slice(8, 12)}` : ""}`
}

function canUseClipboard() {
  return typeof window !== "undefined" && !!navigator?.clipboard?.writeText
}

function SkeletonMovieGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
        >
          <div className="h-52 w-full animate-pulse bg-white/10" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GroupDetailPage() {
  const checking = useRequireAuth()
  const router = useRouter()
  const params = useParams()
  const groupId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)

  const [group, setGroup] = useState<GroupSummary | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [questionnaire, setQuestionnaire] = useState<GroupQuestionnaireStatus | null>(null)
  const [memberProfiles, setMemberProfiles] = useState<Record<string, Profile>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [softstart, setSoftstart] = useState<GroupSoftstartStatus | null>(null)
  const [recommendations, setRecommendations] = useState<GroupRecommendationResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [sessionCreating, setSessionCreating] = useState(false)

  const [copiedSession, setCopiedSession] = useState(false)
  const [copiedJoinCode, setCopiedJoinCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [activeBucket, setActiveBucket] = useState<
    "top k" | "compatibility" | "mixmatch" | "eximatch" | "explore" | "outsiders"
  >("top k")

  const isHost = useMemo(() => {
    if (!group?.hostId || !profile?.id) return false
    return group.hostId === profile.id
  }, [group?.hostId, profile?.id])

  const joinCodeVisible = useMemo(() => {
    if (!group?.joinCode) return false
    if (group.status && group.status !== "open") return false
    if (group.joinCodeExpiresAt) {
      const expires = new Date(group.joinCodeExpiresAt).getTime()
      if (Number.isFinite(expires) && expires <= Date.now()) return false
    }
    return true
  }, [group?.joinCode, group?.joinCodeExpiresAt, group?.status])

  useEffect(() => {
    if (!groupId) return
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(SESSION_STORAGE_KEY(groupId))
        : null
    if (stored) setSessionId(stored)
  }, [groupId])

  const load = useCallback(async () => {
    if (!groupId) return
    try {
      setError(null)
      setLoading(true)

      const [groupData, profileData, questionnaireData] = await Promise.all([
        getGroup(groupId),
        getProfile(),
        getGroupQuestionnaireStatus(groupId),
      ])

      setGroup(groupData)
      setProfile(profileData)
      setQuestionnaire(questionnaireData)

      const ids = questionnaireData?.members.map((m) => m.userId) ?? []
      if (ids.length) {
        const entries = await Promise.all(
          ids.map(async (userId) => {
            try {
              const user = await getUserById(userId)
              return [userId, user] as const
            } catch {
              return null
            }
          }),
        )
        const mapped = entries.reduce<Record<string, Profile>>((acc, entry) => {
          if (!entry) return acc
          acc[entry[0]] = entry[1]
          return acc
        }, {})
        setMemberProfiles(mapped)
      } else {
        setMemberProfiles({})
      }
    } catch (err: any) {
      setError(err?.message ?? "Error loading group")
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!groupId || !sessionId) return

    let active = true
    const poll = async () => {
      try {
        const status = await getGroupSoftstartStatus(groupId, sessionId)
        if (!active) return
        setSoftstart(status)

        if (status.ready && !recommendations) {
          const recs = await getGroupRecommendations(groupId, sessionId, { limit: 50 })
          if (!active) return
          setRecommendations(recs)
        }
      } catch (err: any) {
        if (!active) return
        setError(err?.message ?? "Error loading status")
      }
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [groupId, sessionId, recommendations])

  const handleCreateSession = async () => {
    if (!groupId) return
    try {
      setError(null)
      setSessionCreating(true)
      const session = await createGroupSession(groupId)
      setSessionId(session.id)
      setSoftstart(null)
      setRecommendations(null)
      setActiveBucket("top k")
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_STORAGE_KEY(groupId), session.id)
      }
    } catch (err: any) {
      setError(err?.message ?? "Error creating session")
    } finally {
      setSessionCreating(false)
    }
  }

  const handleStartAnyway = async () => {
    if (!groupId || !sessionId) return
    try {
      setError(null)
      setStarting(true)
      await startGroupSession(groupId, sessionId)
      const status = await getGroupSoftstartStatus(groupId, sessionId)
      setSoftstart(status)
    } catch (err: any) {
      setError(err?.message ?? "Error starting session")
    } finally {
      setStarting(false)
    }
  }

  const handleCopySessionId = async () => {
    if (!sessionId || !canUseClipboard()) return
    await navigator.clipboard.writeText(sessionId)
    setCopiedSession(true)
    window.setTimeout(() => setCopiedSession(false), 1200)
  }

  const handleCopyJoinCode = async () => {
    const code = group?.joinCode
    if (!code || !canUseClipboard()) return
    await navigator.clipboard.writeText(code)
    setCopiedJoinCode(true)
    window.setTimeout(() => setCopiedJoinCode(false), 1200)
  }

  const handleCopyLink = async () => {
    if (typeof window === "undefined" || !canUseClipboard()) return
    await navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    window.setTimeout(() => setCopiedLink(false), 1200)
  }

  const handleNewSearch = () => {
    if (!groupId) return
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_STORAGE_KEY(groupId))
    }
    setSessionId(null)
    setSoftstart(null)
    setRecommendations(null)
    setActiveBucket("top k")
  }

  const [countdown, setCountdown] = useState<string | null>(null)

  useEffect(() => {
    if (!softstart?.timeoutAt) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const diff = new Date(softstart.timeoutAt).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown("0:00")
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [softstart?.timeoutAt])

  const membersReady = questionnaire?.completed ?? 0
  const membersTotal = questionnaire?.total ?? 0
  const allMembersReady = questionnaire?.allComplete ?? false

  const buckets = recommendations?.buckets
  const outsiders = recommendations?.outsiders

  const bucketTabs = [
    { key: "top k", label: "Top Pick" },
    { key: "compatibility", label: "High Match" },
    { key: "mixmatch", label: "Medium Match" },
    { key: "explore", label: "Explore" },
    { key: "outsiders", label: "Outsiders" },
  ] as const

  const bucketEntries =
    activeBucket === "top k" ? recommendations?.topK
    : activeBucket === "compatibility" ? buckets?.high
    : activeBucket === "mixmatch" ? buckets?.medium
    : activeBucket === "explore" ? buckets?.explore
    : outsiders

  if (checking) return null

  return (
    <main className="relative min-h-screen bg-zinc-950 text-foreground selection:bg-violet-500/30 pb-28">

      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      {/* --- CONTENT --- */}
      <div className="relative z-10">
        <Header />

        <div className="px-4 md:px-6 lg:px-8 max-w-6xl mx-auto pt-8">
          
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <div className="p-1.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </div>
            Back to Groups
          </button>

          {/* Group Header */}
          <div className="space-y-6 mb-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              
              <div className="space-y-2">
                <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400 uppercase tracking-widest text-[10px]">
                  Group Lobby
                </Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-teal-300 to-amber-400">
                  {group?.name ?? "Loading..."}
                </h1>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", allMembersReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                    {allMembersReady ? "Ready to choose" : "Gathering preferences"}
                  </span>
                  <span>•</span>
                  <span>{membersTotal || group?.members?.length || 0} members</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {joinCodeVisible && (
                  <div className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur">
                    <span className="text-xs font-mono tracking-wider text-zinc-400">
                      CODE: <span className="text-white font-bold">{formatJoinCode(group!.joinCode!)}</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full hover:bg-white/10"
                          onClick={handleCopyJoinCode}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{copiedJoinCode ? "Copied" : "Copy Code"}</TooltipContent>
                    </Tooltip>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full border-white/10 bg-zinc-900/60 hover:bg-zinc-800"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  {copiedLink ? "Copied Link" : "Share Link"}
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur">
              <CardContent className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              </CardContent>
            </Card>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          ) : group ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              
              {/* MEMBERS CARD */}
              <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-zinc-400" /> Members
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={load} 
                        className="h-8 text-xs text-zinc-400 hover:text-white"
                      >
                        <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/questionnaire`}>
                            <Button size="sm" className="h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white border border-white/10 shadow-lg shadow-violet-900/20">
                              <ClipboardList className="h-3.5 w-3.5 mr-1.5"/> Daily Poll
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Complete your daily preferences</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-400 pt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{allMembersReady ? STATUS_COPY.allReady : STATUS_COPY.collecting}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    {questionnaire?.members.map((member) => {
                      const isMemberHost = !!group.hostId && member.userId === group.hostId
                      const isYou = !!profile?.id && member.userId === profile.id

                      return (
                        <div
                          key={member.userId}
                          className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] min-w-[100px]"
                        >
                          <div className="relative">
                            <Avatar className="h-14 w-14 border-2 border-zinc-800">
                              <AvatarImage
                                src={
                                  AVATAR_OPTIONS.find(
                                    (option) => option.id === memberProfiles[member.userId]?.avatar,
                                  )?.src ?? "/placeholder-user.jpg"
                                }
                              />
                              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                                {(memberProfiles[member.userId]?.username ?? "U").substring(0,2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isMemberHost && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-zinc-900 rounded-full px-1.5 border border-amber-500/50">
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block leading-none py-0.5">HOST</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm font-medium text-white leading-tight">
                              {memberProfiles[member.userId]?.username ?? "User"}
                              {isYou && <span className="text-zinc-500 ml-1">(You)</span>}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              {member.completed ? (
                                <span className="text-emerald-400">Ready</span>
                              ) : (
                                "Waiting..."
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* SESSION STATUS CARD */}
              <Card className="border-white/10 bg-zinc-900/40 backdrop-blur-xl h-fit">
                <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
                <CardContent className="p-6 space-y-6 relative">
                  
                  {/* Status Indicator */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">Session Status</h3>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", softstart?.ready ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-zinc-600")} />
                      <span className="text-lg font-semibold text-white">
                        {softstart?.ready ? "Results Ready" : "Waiting for Input"}
                      </span>
                    </div>
                  </div>

                  {/* Countdown */}
                  {countdown && !allMembersReady && (
                    <div className="p-4 rounded-xl bg-zinc-950/50 border border-white/5 text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Time Remaining</p>
                      <p className="text-3xl font-mono font-bold text-emerald-400">{countdown}</p>
                    </div>
                  )}

                  {/* Host Controls */}
                  {!sessionId ? (
                    isHost ? (
                      <Button 
                        onClick={handleCreateSession} 
                        disabled={sessionCreating}
                        className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-base"
                      >
                        {sessionCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Play className="mr-2 h-4 w-4 fill-current" /> Start Session</>}
                      </Button>
                    ) : (
                      <div className="text-center p-4 rounded-xl bg-zinc-950/30 border border-white/5 text-sm text-zinc-500">
                        Waiting for host to start...
                      </div>
                    )
                  ) : null}

                  {/* Force Start */}
                  {sessionId && isHost && !softstart?.ready && (
                    <Button 
                      variant="outline"
                      onClick={handleStartAnyway}
                      disabled={starting}
                      className="w-full border-white/10 bg-transparent hover:bg-white/5"
                    >
                      {starting ? "Starting..." : "Force Start Now"}
                    </Button>
                  )}

                  {/* Session ID */}
                  {sessionId && (
                    <div 
                      onClick={handleCopySessionId}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer hover:bg-black/40 transition-colors group"
                    >
                      <span className="text-xs text-zinc-500 font-mono">ID: {sessionId}</span>
                      <Copy className="h-3.5 w-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                  )}

                </CardContent>
              </Card>

            </div>
          ) : null}

          {/* RECOMMENDATIONS SECTION */}
          <section className="mt-16 mb-12">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  Top Suggestions
                </h2>
                <p className="text-zinc-400 text-sm mt-1">Curated picks based on your group's unique taste.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewSearch} className="rounded-full border-white/10">
                <RefreshCcw className="h-3.5 w-3.5 mr-2" /> New Search
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {bucketTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveBucket(tab.key)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
                    activeBucket === tab.key
                      ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      : "bg-zinc-900/40 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Empty States */}
            {!sessionId && (
              <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                <p className="text-zinc-500">Start a session to unlock recommendations.</p>
              </div>
            )}

            {sessionId && !softstart?.ready && (
              <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500">Analyzing group preferences...</p>
              </div>
            )}

            {sessionId && softstart?.ready && !recommendations && (
               <SkeletonMovieGrid count={3} />
            )}

            {/* Results */}
            {recommendations && (
              <div className="space-y-10">
                
                {/* Spotlight Card (Top Pick) */}
                {activeBucket === "top k" && recommendations.recommended && (
                  <div className="relative group">
                    <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-violet-600 to-amber-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500" />
                    <Card className="relative border-white/10 bg-zinc-900/80 backdrop-blur-xl overflow-hidden">
                      <CardContent className="p-0 flex flex-col md:flex-row">
                        {/* Poster */}
                        <div className="w-full md:w-48 h-64 md:h-auto relative shrink-0">
                          <img
                            src={recommendations.recommended.movie.posterPath || "/placeholder-movie.jpg"}
                            alt={recommendations.recommended.movie.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded shadow-lg">
                            #1 MATCH
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-6 md:p-8 flex flex-col justify-center flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">
                                {recommendations.recommended.movie.title}
                              </h3>
                              <p className="text-zinc-400">
                                {recommendations.recommended.movie.year} • {(recommendations.recommended.compatibility * 100).toFixed(0)}% Match
                              </p>
                            </div>
                            <div className="hidden md:block">
                                <MovieQuickActions movieId={normalizeMovieId(recommendations.recommended.movie.movieId)} />
                            </div>
                          </div>
                          
                          <p className="text-zinc-300 text-sm leading-relaxed mb-6 max-w-2xl">
                             {recommendations.recommended.reasons?.[0] ?? "This movie perfectly balances the group's taste profile."}
                             {recommendations.recommended.reasons?.length > 1 && (
                               <span className="block mt-2 text-violet-400 text-xs font-semibold">
                                 + {recommendations.recommended.reasons.length - 1} more reasons
                               </span>
                             )}
                          </p>
                          
                          <div className="md:hidden mt-auto">
                             <MovieQuickActions movieId={normalizeMovieId(recommendations.recommended.movie.movieId)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {bucketEntries?.slice(0, 12).map((entry) => (
                    <MovieCard
                      key={entry.movie.movieId}
                      id={normalizeMovieId(entry.movie.movieId)}
                      title={entry.movie.title}
                      poster={entry.movie.posterPath}
                      year={entry.movie.year}
                      rating={entry.movie.voteAverage}
                      reason={entry.reasons?.[0]}
                      meta={
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-zinc-300 border-0">
                              {(entry.compatibility * 100).toFixed(0)}% Match
                           </Badge>
                           {entry.outsider && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">Outsider</Badge>}
                         </div>
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

        </div>
        <BottomNav />
      </div>
    </main>
  )
}