import { ImageResponse } from 'next/og'

// Dimensioni standard favicon
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 140 80"
          style={{ width: '100%', height: '100%' }}
          fill="none"
        >
          <defs>
            <linearGradient id="magic-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" /> {/* Violet */}
              <stop offset="50%" stopColor="#2dd4bf" /> {/* Mint */}
              <stop offset="100%" stopColor="#f59e0b" /> {/* Amber */}
            </linearGradient>
          </defs>

          {/* La W "Chunky" */}
          <path
            d="M10 15 L30 65 L50 25 L70 65 L90 25"
            stroke="url(#magic-grad)"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* La Scintilla Finale */}
          {/* Nota: In Satori/ImageResponse usiamo 'transform' come attributo stringa o style */}
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