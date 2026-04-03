import { createClient } from "@supabase/supabase-js"

export type OAuthProviderId = "google" | "github"

const TOKEN_KEY = "watchwise-token"
const USER_KEY = "watchwise-user"
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function isBrowser() {
  return typeof window !== "undefined"
}

let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  _supabase = createClient(url, key)
  return _supabase
}

const AUTH_REDIRECT_KEY = "watchwise-auth-redirect"

export function saveAuthRedirect(path: string) {
  if (!isBrowser()) return
  localStorage.setItem(AUTH_REDIRECT_KEY, path)
}

export function getAuthRedirect(): string {
  if (!isBrowser()) return "/"
  return localStorage.getItem(AUTH_REDIRECT_KEY) ?? "/"
}

export function clearAuthRedirect() {
  if (!isBrowser()) return
  localStorage.removeItem(AUTH_REDIRECT_KEY)
}

export async function startOAuth(provider: OAuthProviderId, options?: { redirectTo?: string }) {
  if (!isBrowser()) return
  const supabase = getSupabaseClient()
  const callbackUrl =
    process.env.NEXT_PUBLIC_AUTH_CALLBACK_URL ??
    `${window.location.origin}/auth/callback`

  if (options?.redirectTo) {
    saveAuthRedirect(options.redirectTo)
  }

  await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl },
  })
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
  // Notify components (e.g. Header) that auth state has changed
  window.dispatchEvent(new Event("watchwise-auth-changed"))
}

export function getStoredToken() {
  if (!isBrowser()) return null
  return localStorage.getItem(TOKEN_KEY)
}

export async function getValidToken(): Promise<string | null> {
  if (!isBrowser()) return null
  const supabase = getSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    if (session.access_token !== localStorage.getItem(TOKEN_KEY)) {
      storeSession({ token: session.access_token })
    }
    return session.access_token
  }
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
  getSupabaseClient().auth.signOut()
}
