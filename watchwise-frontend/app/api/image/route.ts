export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")

  if (!url) {
    return new Response("Missing url", { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new Response("Invalid url", { status: 400 })
  }

  if (parsed.hostname !== "image.tmdb.org") {
    return new Response("Unsupported host", { status: 400 })
  }

  const response = await fetch(parsed.toString())
  if (!response.ok) {
    return new Response("Failed to fetch image", { status: 502 })
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg"
  const buffer = await response.arrayBuffer()

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  })
}
