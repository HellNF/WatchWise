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
  Loader2,
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
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
        >
          <div className="h-52 w-full animate-pulse bg-white/10" />
          <div className="space-y-3 p-4">
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
    { key: "top k", label: "Top pick" },
    { key: "compatibility", label: "High match" },
    { key: "mixmatch", label: "Balanced picks" },
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
      <div className="fixed inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full opacity-40 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full opacity-30 pointer-events-none z-0" />

      <div className="relative z-10">
        <Header />

        <div className="px-4 md:px-6 lg:px-8 max-w-6xl mx-auto pt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="group mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <div className="rounded-full border border-white/10 bg-white/5 p-1.5 transition-colors group-hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </div>
            Back to groups
          </button>

          <div className="mb-10 space-y-6">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div className="space-y-3">
                <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                  Group lobby
                </Badge>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-teal-300 to-amber-300 md:text-5xl">
                  {group?.name ?? "Loading..."}
                </h1>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", allMembersReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                    {allMembersReady ? "Ready to choose" : "Gathering preferences"}
                  </span>
                  <span>•</span>
                  <span>{membersTotal || group?.members?.length || 0} members</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {joinCodeVisible && (
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 py-1 pl-3 pr-1 backdrop-blur">
                    <span className="text-xs font-mono tracking-[0.18em] text-zinc-400">
                      Code: <span className="font-semibold text-white">{formatJoinCode(group!.joinCode!)}</span>
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
                      <TooltipContent>{copiedJoinCode ? "Copied" : "Copy code"}</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/10 bg-zinc-900/60 hover:bg-zinc-800"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {copiedLink ? "Copied link" : "Share link"}
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <Card className="border-white/10 bg-zinc-900/40 backdrop-blur">
              <CardContent className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
              </CardContent>
            </Card>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          ) : group ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <Card className="overflow-hidden border-white/10 bg-zinc-900/40 backdrop-blur-xl">
                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
                      <Users className="h-5 w-5 text-zinc-400" />
                      Members
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={load}
                        className="h-8 text-xs text-zinc-400 hover:text-white"
                      >
                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                        Refresh
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href="/questionnaire">
                            <Button size="sm" className="h-8 rounded-full border border-white/10 bg-violet-600 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-500">
                              <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                              Daily poll
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Complete your daily preferences</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-sm text-emerald-400">
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
                          className="min-w-[110px] rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-14 w-14 border-2 border-zinc-800">
                                <AvatarImage
                                  src={
                                    AVATAR_OPTIONS.find(
                                      (option) => option.id === memberProfiles[member.userId]?.avatar,
                                    )?.src ?? "/Avatar_1.png"
                                  }
                                />
                                <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400">
                                  {(memberProfiles[member.userId]?.username ?? "U").substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isMemberHost && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-amber-500/50 bg-zinc-900 px-1.5">
                                  <span className="block py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500 leading-none">
                                    Host
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-center">
                              <p className="text-sm font-medium leading-tight text-white">
                                {memberProfiles[member.userId]?.username ?? "User"}
                                {isYou && <span className="ml-1 text-zinc-500">(You)</span>}
                              </p>
                              <p className="mt-1 text-[10px] text-zinc-500">
                                {member.completed ? (
                                  <span className="text-emerald-400">{formatRelativeTime(member.lastCompletedAt)}</span>
                                ) : (
                                  STATUS_COPY.waiting
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="h-fit border-white/10 bg-zinc-900/40 backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent" />
                <CardContent className="relative space-y-6 p-6">
                  <div>
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">Session status</h3>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-3 w-3 rounded-full", softstart?.ready ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-zinc-600")} />
                      <span className="text-lg font-semibold tracking-[-0.02em] text-white">
                        {softstart?.ready ? "Results ready" : "Waiting for input"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {!sessionId
                        ? isHost
                          ? "Start a session when the group is ready to compare preferences."
                          : "Waiting for the host to create the session."
                        : softstart?.ready
                          ? "Recommendations are ready below."
                          : "The room is still collecting enough answers to generate the shortlist."}
                    </p>
                  </div>

                  {countdown && !allMembersReady && (
                    <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-4 text-center">
                      <p className="mb-1 text-xs uppercase tracking-[0.22em] text-zinc-500">Time remaining</p>
                      <p className="font-mono text-3xl font-bold text-emerald-400">{countdown}</p>
                    </div>
                  )}

                  {!sessionId ? (
                    isHost ? (
                      <Button
                        onClick={handleCreateSession}
                        disabled={sessionCreating}
                        className="h-12 w-full rounded-xl bg-white text-base font-semibold text-black hover:bg-zinc-200"
                      >
                        {sessionCreating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4 fill-current" />
                            Start session
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-white/5 bg-zinc-950/30 p-4 text-center text-sm text-zinc-500">
                        Waiting for host to start...
                      </div>
                    )
                  ) : null}

                  {sessionId && isHost && !softstart?.ready && (
                    <Button
                      variant="outline"
                      onClick={handleStartAnyway}
                      disabled={starting}
                      className="w-full border-white/10 bg-transparent hover:bg-white/5"
                    >
                      {starting ? "Starting..." : "Force start now"}
                    </Button>
                  )}

                  {sessionId && (
                    <div
                      onClick={handleCopySessionId}
                      className="group flex cursor-pointer items-center justify-between rounded-lg border border-white/5 bg-black/20 p-3 transition-colors hover:bg-black/40"
                    >
                      <span className="font-mono text-xs text-zinc-500">ID: {sessionId}</span>
                      <span className="text-xs text-zinc-400 transition-colors group-hover:text-white">
                        {copiedSession ? "Copied" : "Copy"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <section className="mb-12 mt-16">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  Top suggestions
                </h2>
                <p className="mt-1 max-w-lg text-sm leading-6 text-zinc-400">
                  Curated picks based on your group’s latest shared preferences.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewSearch} className="rounded-full border-white/10">
                <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                New search
              </Button>
            </div>

            <div className="mb-8 flex flex-wrap gap-2">
              {bucketTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveBucket(tab.key)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                    activeBucket === tab.key
                      ? "border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      : "border-white/5 bg-zinc-900/40 text-zinc-400 hover:border-white/20 hover:text-white",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {!sessionId && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
                <p className="text-zinc-500">Start a session to unlock recommendations.</p>
              </div>
            )}

            {sessionId && !softstart?.ready && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-zinc-600" />
                <p className="text-zinc-500">Analyzing group preferences...</p>
              </div>
            )}

            {sessionId && softstart?.ready && !recommendations && <SkeletonMovieGrid count={3} />}

            {recommendations && (
              <div className="space-y-10">
                {activeBucket === "top k" && recommendations.recommended && (
                  <div className="group relative">
                    <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-violet-600 to-amber-500 opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30" />
                    <Card className="relative overflow-hidden border-white/10 bg-zinc-900/80 backdrop-blur-xl">
                      <CardContent className="flex flex-col p-0 md:flex-row">
                        <div className="relative h-64 w-full shrink-0 md:h-auto md:w-48">
                          <img
                            src={recommendations.recommended.movie.posterPath || "/placeholder-movie.jpg"}
                            alt={recommendations.recommended.movie.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute left-3 top-3 rounded bg-amber-500 px-2 py-1 text-xs font-bold text-black shadow-lg">
                            #1 MATCH
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
                          <div className="mb-2 flex items-start justify-between gap-4">
                            <div>
                              <h3 className="mb-1 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                                {recommendations.recommended.movie.title}
                              </h3>
                              <p className="text-sm text-zinc-400">
                                {recommendations.recommended.movie.year} • {(recommendations.recommended.compatibility * 100).toFixed(0)}% match
                              </p>
                            </div>
                            <div className="hidden md:block">
                              <MovieQuickActions movieId={normalizeMovieId(recommendations.recommended.movie.movieId)} />
                            </div>
                          </div>

                          <p className="mb-6 max-w-2xl text-sm leading-7 text-zinc-300">
                            {recommendations.recommended.reasons?.[0] ?? "This movie best balances the group’s taste profile."}
                            {recommendations.recommended.reasons?.length > 1 && (
                              <span className="mt-2 block text-xs font-semibold text-violet-400">
                                + {recommendations.recommended.reasons.length - 1} more reasons
                              </span>
                            )}
                          </p>

                          <div className="mt-auto md:hidden">
                            <MovieQuickActions movieId={normalizeMovieId(recommendations.recommended.movie.movieId)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

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
                          <Badge variant="secondary" className="border-0 bg-white/10 text-zinc-300 hover:bg-white/20">
                            {(entry.compatibility * 100).toFixed(0)}% match
                          </Badge>
                          {entry.outsider && (
                            <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-500">
                              Outsider
                            </Badge>
                          )}
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
