/** @type {import('next').NextConfig} */

// Domains that the app legitimately contacts.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_HOST = SUPABASE_URL ? new URL(SUPABASE_URL).host : ""

const supabaseConnect = SUPABASE_HOST
  ? `https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`
  : ""

// Backend API URL — extract only the origin (protocol+host+port) for CSP.
// A path like "/api" in connect-src would only match that exact path, not sub-paths.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
const API_ORIGIN = (() => {
  try { return API_BASE_URL ? new URL(API_BASE_URL).origin : "" } catch { return "" }
})()

const ContentSecurityPolicy = `
  default-src 'self';
  script-src  'self' 'unsafe-eval' 'unsafe-inline'
              https://va.vercel-scripts.com;
  style-src   'self' 'unsafe-inline';
  img-src     'self' blob: data:
              https://image.tmdb.org
              https://*.supabase.co;
  font-src    'self';
  connect-src 'self'
              ${API_ORIGIN}
              ${supabaseConnect}
              https://*.supabase.co
              wss://*.supabase.co
              https://api.themoviedb.org
              https://va.vercel-scripts.com;
  frame-src   https://www.youtube-nocookie.com
              https://www.youtube.com;
  object-src  'none';
  base-uri    'self';
  form-action 'self';
`
  .replace(/\n/g, " ")
  .trim()

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
