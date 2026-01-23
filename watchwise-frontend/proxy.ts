import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/auth/callback"])
const PUBLIC_PREFIXES = ["/_next", "/api", "/favicon.ico", "/robots.txt", "/sitemap.xml"]

function isMovieDetail(pathname: string) {
  if (!pathname.startsWith("/movie/")) return false
  const remainder = pathname.slice("/movie/".length)
  return remainder.length > 0 && !remainder.includes("/")
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes(".") ||
    isMovieDetail(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("watchwise-token")?.value
  if (token) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/login"
  loginUrl.searchParams.set("redirectTo", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
