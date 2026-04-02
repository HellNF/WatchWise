"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getStoredToken } from "@/lib/auth"

/**
 * Redirects to /login?redirectTo=<current path> if there is no stored token.
 * Returns `checking = true` while the check is running so callers can render
 * a skeleton instead of a flash of unauthorised content.
 */
export function useRequireAuth(): boolean {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      router.replace(`/login?redirectTo=${encodeURIComponent(pathname ?? "/")}`)
      // keep checking = true so the page stays blank while we redirect
    } else {
      setChecking(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return checking
}
