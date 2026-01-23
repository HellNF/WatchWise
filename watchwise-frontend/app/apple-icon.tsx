import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090b', // Sfondo scuro (zinc-950)
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 140 80"
          style={{ width: '80%', height: '80%' }} // Margine per non toccare i bordi
          fill="none"
        >
          <defs>
            <linearGradient id="magic-grad-apple" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          <path
            d="M10 15 L30 65 L50 25 L70 65 L90 25"
            stroke="url(#magic-grad-apple)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g transform="translate(90, 10) scale(1.5)">
            <path
              d="M15 0 C15 0 18 10 28 15 C 18 20 15 30 15 30 C 15 30 12 20 2 15 C 12 10 15 0 15 0 Z"
              fill="#f59e0b"
            />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}