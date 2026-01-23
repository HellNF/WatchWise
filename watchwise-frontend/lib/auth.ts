export type OAuthProviderId = "google" | "github"

export type AuthIntent = {
  provider: OAuthProviderId
  redirectTo: string
  startedAt: string
}

type OAuthOptions = {
  redirectTo?: string
  callbackUrl?: string
}

const AUTH_INTENT_KEY = "watchwise-auth-intent"
const TOKEN_KEY = "watchwise-token"
const USER_KEY = "watchwise-user"
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function isBrowser() {
  return typeof window !== "undefined"
}

export function getOAuthBaseUrl() {
  return (process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "").replace(/\/$/, "")
}

export function buildOAuthUrl(provider: OAuthProviderId, options?: OAuthOptions) {
  if (!isBrowser()) return null
  const baseUrl = getOAuthBaseUrl()
  if (!baseUrl) return null

  const callbackUrl =
    options?.callbackUrl ??
    process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ??
    `${window.location.origin}/auth/callback`
  const redirectTo = options?.redirectTo ?? "/"

  const url = new URL(`${baseUrl}/oauth/${provider}`)
  url.searchParams.set("callbackUrl", callbackUrl)
  url.searchParams.set("redirectTo", redirectTo)

  return url.toString()
}

export function saveAuthIntent(intent: AuthIntent) {
  if (!isBrowser()) return
  localStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent))
}

export function readAuthIntent(): AuthIntent | null {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(AUTH_INTENT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthIntent
  } catch {
    return null
  }
}

export function clearAuthIntent() {
  if (!isBrowser()) return
  localStorage.removeItem(AUTH_INTENT_KEY)
}

export function startOAuth(provider: OAuthProviderId, options?: OAuthOptions) {
  if (!isBrowser()) return
  const redirectTo = options?.redirectTo ?? "/"

  saveAuthIntent({
    provider,
    redirectTo,
    startedAt: new Date().toISOString(),
  })

  const url = buildOAuthUrl(provider, options)
  window.location.href =
    url ?? `/auth/callback?provider=${provider}&status=missing-config`
}

export function storeSession(session: { token?: string; user?: unknown }) {
  if (!isBrowser()) return
  if (session.token) {
    localStorage.setItem(TOKEN_KEY, session.token)
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(session.token)}; Path=/; Max-Age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax`
  }
  if (session.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  }
}

export function getStoredToken() {
  if (!isBrowser()) return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser<T = unknown>() {
  if (!isBrowser()) return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function clearSession() {
  if (!isBrowser()) return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}
