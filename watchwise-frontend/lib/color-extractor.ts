// Extracts dominant colors from an image using canvas
export interface ExtractedColors {
  primary: string
  secondary: string
  accent: string
  muted: string
}

const colorCache = new Map<string, ExtractedColors>()

export async function extractColorsFromImage(imageUrl: string): Promise<ExtractedColors> {
  if (!imageUrl || imageUrl.includes("/placeholder")) {
    return Promise.resolve(getDefaultColors())
  }

  const cached = colorCache.get(imageUrl)
  if (cached) {
    return Promise.resolve(cached)
  }

  return new Promise((resolve) => {
    const proxiedUrl = imageUrl.startsWith("http")
      ? `/api/image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(getDefaultColors())
        return
      }

      // Sample at smaller size for performance
      const sampleSize = 50
      canvas.width = sampleSize
      canvas.height = sampleSize

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize)

      let imageData: ImageData
      try {
        imageData = ctx.getImageData(0, 0, sampleSize, sampleSize)
      } catch {
        resolve(getDefaultColors())
        return
      }

      const pixels = imageData.data

      // Collect color samples
      const colorSamples: { r: number; g: number; b: number; saturation: number; lightness: number }[] = []

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]

        const { saturation, lightness } = rgbToHsl(r, g, b)

        // Only collect colors with some saturation and not too dark/light
        if (saturation > 0.15 && lightness > 0.15 && lightness < 0.85) {
          colorSamples.push({ r, g, b, saturation, lightness })
        }
      }

      if (colorSamples.length === 0) {
        resolve(getDefaultColors())
        return
      }

      // Sort by saturation to find vibrant colors
      colorSamples.sort((a, b) => b.saturation - a.saturation)

      // Get the most vibrant color as primary
      const primary = colorSamples[0]

      // Find a secondary color that's different enough
      const secondary = findDifferentColor(colorSamples, primary) || colorSamples[Math.floor(colorSamples.length / 3)]

      // Create accent by shifting hue and increasing saturation
      const accent = createAccentColor(primary)

      // Create muted version
      const muted = createMutedColor(primary)

      const extracted = {
        primary: rgbToOklch(primary.r, primary.g, primary.b, 0.85),
        secondary: rgbToOklch(secondary.r, secondary.g, secondary.b, 0.7),
        accent: rgbToOklch(accent.r, accent.g, accent.b, 0.9),
        muted: rgbToOklch(muted.r, muted.g, muted.b, 0.5),
      }

      colorCache.set(imageUrl, extracted)
      resolve(extracted)
    }

    img.onerror = () => {
      resolve(getDefaultColors())
    }

    img.src = proxiedUrl
  })
}

function rgbToHsl(r: number, g: number, b: number): { hue: number; saturation: number; lightness: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  let hue = 0
  let saturation = 0

  if (max !== min) {
    const d = max - min
    saturation = lightness > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        hue = ((b - r) / d + 2) / 6
        break
      case b:
        hue = ((r - g) / d + 4) / 6
        break
    }
  }

  return { hue, saturation, lightness }
}

function findDifferentColor(
  colors: { r: number; g: number; b: number; saturation: number; lightness: number }[],
  reference: { r: number; g: number; b: number },
): { r: number; g: number; b: number; saturation: number; lightness: number } | null {
  const refHsl = rgbToHsl(reference.r, reference.g, reference.b)

  for (const color of colors) {
    const hsl = rgbToHsl(color.r, color.g, color.b)
    const hueDiff = Math.abs(hsl.hue - refHsl.hue)

    // Look for colors with significantly different hue
    if (hueDiff > 0.15 || (hueDiff < 0.85 && hueDiff > 0.15)) {
      return color
    }
  }

  return null
}

function createAccentColor(color: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  // Increase brightness and saturation for accent
  const factor = 1.3
  return {
    r: Math.min(255, Math.round(color.r * factor)),
    g: Math.min(255, Math.round(color.g * factor)),
    b: Math.min(255, Math.round(color.b * factor)),
  }
}

function createMutedColor(color: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  // Desaturate by mixing with gray
  const gray = (color.r + color.g + color.b) / 3
  const mixFactor = 0.5
  return {
    r: Math.round(color.r * (1 - mixFactor) + gray * mixFactor),
    g: Math.round(color.g * (1 - mixFactor) + gray * mixFactor),
    b: Math.round(color.b * (1 - mixFactor) + gray * mixFactor),
  }
}

function rgbToOklch(r: number, g: number, b: number, targetLightness: number): string {
  // Convert RGB to approximate OKLCH
  // This is a simplified conversion for CSS output
  const { hue, saturation } = rgbToHsl(r, g, b)

  // Map to OKLCH values
  const l = targetLightness
  const c = saturation * 0.2 // OKLCH chroma is typically 0-0.4
  const h = hue * 360

  return `oklch(${l} ${c.toFixed(3)} ${h.toFixed(1)})`
}

function getDefaultColors(): ExtractedColors {
  return {
    primary: "oklch(0.85 0.15 175)",
    secondary: "oklch(0.7 0.1 200)",
    accent: "oklch(0.88 0.18 130)",
    muted: "oklch(0.5 0.05 175)",
  }
}
