"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { MovieCard } from "@/components/movie-card"
import { MovieQuickActions } from "@/components/movie-quick-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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
import { CheckCircle2, Copy, RefreshCcw, Users, ClipboardList } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const SESSION_STORAGE_KEY = (groupId: string) => `ww-group-session:${groupId}`

const AVATAR_OPTIONS = [
  { id: "avatar_01", src: "/avatar_1.png" },
  { id: "avatar_02", src: "/avatar_2.png" },
  { id: "avatar_03", src: "/avatar_3.png" },
  { id: "avatar_04", src: "/avatar_4.png" },
  { id: "avatar_05", src: "/avatar_5.png" },
  { id: "avatar_06", src: "/avatar_6.png" },
  { id: "avatar_07", src: "/avatar_7.png" },
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
    <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
      <CardContent className="pt-6">
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
      </CardContent>
    </Card>
  )
}

export default function GroupDetailPage() {
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
    "top" | "compatibility" | "mixmatch" | "eximatch" | "explore" | "outsiders"
  >("top")

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
      setError(err?.message ?? "Errore nel caricamento del gruppo")
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

        // Evita fetch ripetuti se già abbiamo recommendations
        if (status.ready && !recommendations) {
          const recs = await getGroupRecommendations(groupId, sessionId, { limit: 30 })
          if (!active) return
          setRecommendations(recs)
        }
      } catch (err: any) {
        if (!active) return
        setError(err?.message ?? "Errore nel caricamento stato")
      }
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => {
      active = false
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setActiveBucket("top")
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_STORAGE_KEY(groupId), session.id)
      }
    } catch (err: any) {
      setError(err?.message ?? "Errore nella creazione sessione")
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
      setError(err?.message ?? "Errore durante l'avvio")
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
    setActiveBucket("top")
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
    { key: "top", label: "Top Pick" },
    { key: "compatibility", label: "High" },
    { key: "mixmatch", label: "Medium" },
    { key: "explore", label: "Explore" },
    { key: "outsiders", label: "Outsiders" },
  ] as const

  const bucketEntries =
    activeBucket === "top" ? buckets?.high
    : activeBucket === "compatibility" ? buckets?.high
    : activeBucket === "mixmatch" ? buckets?.medium
    : activeBucket === "explore" ? buckets?.explore
    : outsiders

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="relative px-4 md:px-6 lg:px-8 max-w-6xl mx-auto pb-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_50%),radial-gradient(circle_at_25%_25%,rgba(16,185,129,0.20),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.18),transparent_40%),radial-gradient(circle_at_10%_80%,rgba(236,72,153,0.16),transparent_38%),radial-gradient(circle_at_70%_10%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_90%_30%,rgba(34,197,94,0.16),transparent_35%)]" />

        <div className="mt-6 space-y-4">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Group team
          </div>

          <div className="flex flex-wrap items-center gap-4">
            

            <div className="flex items-center justify-between gap-6 flex-1 min-w-0">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold bg-gradient-to-br from-cyan-200 via-emerald-200 to-sky-400 bg-clip-text text-transparent truncate">
                  {group?.name ?? "Group"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Live session · {membersTotal || group?.members?.length || 0} members ·{" "}
                  {allMembersReady ? "Ready to choose" : "Gathering preferences"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {joinCodeVisible ? (
                  <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
                      Join
                    </span>
                    <span className="font-mono text-sm text-foreground">
                      {formatJoinCode(group!.joinCode!)}
                    </span>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleCopyJoinCode}
                          className="text-muted-foreground hover:text-foreground transition"
                          aria-label="Copy join code"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copiedJoinCode ? "Copied" : "Copy join code"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : null}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="rounded-full" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      {copiedLink ? "Copied" : "Copy link"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share this group page</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live session
          </div>

          {joinCodeVisible ? (
            <div className="sm:hidden inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-[0.3em]">Join</span>
              <span className="font-mono text-foreground">{formatJoinCode(group!.joinCode!)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="text-muted-foreground hover:text-foreground transition"
                    aria-label="Copy join code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{copiedJoinCode ? "Copied" : "Copy join code"}</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Card className="mt-6 rounded-2xl border-white/10 bg-white/5 backdrop-blur">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="mt-6 rounded-2xl border-destructive/40 bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {group ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.10),transparent_55%)]" />
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Group members
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={load}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                    </button>
                    {/*aggiungi un bottone che porti direttamente alla pagina del questionario*/ }
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/questionnaire`}>
                          <Button variant="outline" className="rounded-full hover:bg-primary hover:scale-105 transition-transform border-white/30" >
                            <ClipboardList/>
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Complete the daily questionnaire</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-base text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{allMembersReady ? STATUS_COPY.allReady : STATUS_COPY.collecting}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant={allMembersReady ? "default" : "secondary"}>
                    {membersReady}/{membersTotal} ready
                  </Badge>
                  {questionnaire ? (
                    <span>
                      Day: {new Date(questionnaire.dayStart).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  {questionnaire?.members.map((member) => {
                    const isMemberHost = !!group.hostId && member.userId === group.hostId
                    const isYou = !!profile?.id && member.userId === profile.id

                    return (
                      <div
                        key={member.userId}
                        className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                      >
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarImage
                              src={
                                AVATAR_OPTIONS.find(
                                  (option) => option.id === memberProfiles[member.userId]?.avatar,
                                )?.src ?? "/placeholder-user.jpg"
                              }
                            />
                            <AvatarFallback>
                              {(memberProfiles[member.userId]?.username ?? "U")
                                .split(" ")
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                            </AvatarFallback>
                          </Avatar>

                          {isMemberHost ? (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                              Host
                            </span>
                          ) : null}
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">
                            {memberProfiles[member.userId]?.username ?? "User"}
                            {isYou ? (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.completed ? formatRelativeTime(member.lastCompletedAt) : "Waiting"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.16),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(56,189,248,0.10),transparent_50%)]" />
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-base text-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{softstart?.ready ? "Session ready" : STATUS_COPY.waiting}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {softstart?.ready
                        ? "Recommendations are available"
                        : "Waiting for preferences to be collected"}
                    </p>
                  </div>

                  {countdown && !allMembersReady ? (
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Countdown
                      </p>
                      <p className="text-3xl font-semibold text-emerald-200 tracking-tight animate-pulse">
                        {countdown}
                      </p>
                    </div>
                  ) : null}

                  {sessionId && isHost && !softstart?.ready ? (
                    <Button
                      variant="outline"
                      onClick={handleStartAnyway}
                      disabled={starting}
                      className="rounded-full"
                    >
                      {starting ? "Starting..." : "Start anyway"}
                    </Button>
                  ) : null}
                </div>

                {!sessionId ? (
                  isHost ? (
                    <Button
                      onClick={handleCreateSession}
                      disabled={sessionCreating}
                      className="rounded-full"
                    >
                      {sessionCreating ? "Creating..." : "Start session"}
                    </Button>
                  ) : (
                    <Card className="rounded-2xl border-white/10 bg-white/5">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        Waiting for the host to start the session.
                      </CardContent>
                    </Card>
                  )
                ) : null}

                {sessionId ? (
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono truncate">Session ID: {sessionId}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition"
                            onClick={handleCopySessionId}
                            aria-label="Copy session ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{copiedSession ? "Copied" : "Copy session ID"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold">Group Movie Suggestions</h2>
                <p className="text-sm text-muted-foreground">
                  Based on everyone’s preferences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleNewSearch}
              >
                New search
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 my-2 text-xs text-muted-foreground">
            {bucketTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveBucket(tab.key)}
                className={`rounded-full px-4 py-1 transition ${
                  activeBucket === tab.key
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!sessionId ? (
            <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
              <CardContent className="p-6 text-sm text-muted-foreground">
                {isHost
                  ? "Start a session to view suggestions."
                  : "Waiting for the host to start a session."}
              </CardContent>
            </Card>
          ) : null}

          {sessionId && !softstart?.ready ? (
            <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Waiting for everyone to complete the questionnaire or for the timer to expire.
              </CardContent>
            </Card>
          ) : null}

          {sessionId && softstart?.ready && !recommendations ? (
            <SkeletonMovieGrid />
          ) : null}

          {recommendations ? (
            <div className="space-y-8">
              {/* Top Pick shown as a prominent card above the grid */}
              <div className="mb-4">
                <Card className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border-white/10 bg-gradient-to-b from-primary/40 to-primary/10 shadow-lg">
                  <div className="relative flex-shrink-0">
                    <img
                      src={recommendations.recommended.movie.posterPath || "/placeholder-movie.jpg"}
                      alt={recommendations.recommended.movie.title}
                      className="w-28 h-40 object-cover rounded-xl border border-white/10 shadow-md"
                    />
                    <Badge className="absolute top-2 left-2" variant="secondary">Top Pick</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-emerald-200 truncate">
                        {recommendations.recommended.movie.title}
                      </span>
                      <span className="text-xs text-muted-foreground">({recommendations.recommended.movie.year})</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="secondary">
                        Compatibility {(recommendations.recommended.compatibility * 100).toFixed(0)}%
                      </Badge>
                      {recommendations.recommended.outsider ? (
                        <Badge variant="outline">Outsider (watchlist)</Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2 truncate">
                      {recommendations.recommended.reasons?.[0] ?? "Best overall balance"}
                    </div>
                    {recommendations.recommended.reasons?.length > 1 && (
                      <div className="text-xs text-emerald-300">
                        +{Math.max(0, recommendations.recommended.reasons.length - 1)} more reasons
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <MovieQuickActions movieId={normalizeMovieId(recommendations.recommended.movie.movieId)} />
                  </div>
                </Card>
              </div>
              <Card className="rounded-2xl border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {bucketEntries?.slice(0, 12).map((entry) => (
                      <MovieCard
                        key={entry.movie.movieId}
                        id={normalizeMovieId(entry.movie.movieId)}
                        title={entry.movie.title}
                        poster={entry.movie.posterPath}
                        year={entry.movie.year}
                        rating={entry.movie.voteAverage}
                        reason={entry.reasons?.[0] ?? "Strong overlap across the group"}
                        meta={
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <Badge variant="secondary">
                              {(entry.compatibility * 100).toFixed(0)}%
                            </Badge>
                            {entry.outsider ? (
                              <Badge variant="outline">Outsider (watchlist)</Badge>
                            ) : null}
                            {entry.reasons?.length ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 cursor-default">
                                    +{Math.max(0, entry.reasons.length - 1)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="max-w-xs space-y-1">
                                    <p className="text-xs font-medium">Why this movie:</p>
                                    <ul className="text-xs list-disc pl-4">
                                      {entry.reasons.slice(0, 4).map((r, idx) => (
                                        <li key={idx}>{r}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        }
                        children={
                          <MovieQuickActions movieId={normalizeMovieId(entry.movie.movieId)} />
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
