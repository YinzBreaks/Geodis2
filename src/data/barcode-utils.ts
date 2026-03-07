/**
 * barcode-utils.ts — Barcode visual generator for training simulation
 *
 * Generates SVG barcode representations for display on the Warehouse Floor
 * and Scanner Panel. These are visual-only (not machine-scannable) but
 * look realistic for training fidelity.
 *
 * Per CLAUDE.md §Seed Data: barcode formats from SOP screenshots.
 *   Cart:     C + 9 digits   → C000000083
 *   Tote:     T + 14 digits  → T00000000011692
 *   Item UPC: 12-digit UPC-A
 *   Location: AAA-NNN-NN     → 316-001-A1
 */

// ─────────────────────────────────────────────────────────────────────────────
// SVG BARCODE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a barcode-like SVG as a data: URL for use in <img> src attributes.
 *
 * @param value     The barcode string to visualise
 * @param width     SVG width in px  (default 200)
 * @param height    SVG height in px (default 60)
 */
export function generateBarcodeDataUrl(
  value: string,
  width = 200,
  height = 60
): string {
  const svg = generateBarcodeSVG(value, width, height)
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Generate barcode SVG markup string.
 * The bar pattern is deterministic per-value (seeded from char codes).
 */
export function generateBarcodeSVG(
  value: string,
  width = 200,
  height = 60
): string {
  const bars = valueToBars(value)
  const barWidth = width / bars.length
  const barHeight = height - 16 // leave room for label text

  const rects = bars
    .map((bar, i) =>
      bar
        ? `<rect x="${(i * barWidth).toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${barHeight}" fill="#000"/>`
        : ""
    )
    .join("")

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect width="${width}" height="${height}" fill="#fff"/>`,
    rects,
    `<text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="monospace" font-size="10" fill="#000">${escapeXml(value)}</text>`,
    `</svg>`,
  ].join("")
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a string value to an array of bar/space booleans.
 * Uses character codes to build a deterministic but realistic-looking pattern.
 */
function valueToBars(value: string): boolean[] {
  const bars: boolean[] = []

  // Start guard pattern (like Code 128)
  bars.push(true, true, false, true, false, true)

  for (const char of value) {
    const code = char.charCodeAt(0)
    // Generate a 9-element pattern per character from bit positions
    bars.push(
      (code & 0x40) !== 0,
      true,
      (code & 0x20) !== 0,
      (code & 0x10) !== 0,
      true,
      (code & 0x08) !== 0,
      (code & 0x04) !== 0,
      (code & 0x02) !== 0,
      false
    )
  }

  // End guard pattern
  bars.push(true, true, false, true, true, false, true)

  return bars
}

/** Escape XML special characters for safe SVG embedding. */
function escapeXml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      case "'":
        return "&apos;"
      default:
        return c
    }
  })
}
