import { NextRequest, NextResponse } from "next/server"

const TOKEN_COOKIE = "watchwise-token"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days — matches frontend auth TTL

export async function POST(request: NextRequest) {
  let token: unknown
  try {
    const body = await request.json()
    token = body?.token
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}
