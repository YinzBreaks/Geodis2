import type { Metadata } from "next"
import {
  Barlow_Condensed,
  DM_Sans,
  IBM_Plex_Mono,
  Inter,
  JetBrains_Mono,
} from "next/font/google"
import "./globals.css"
import SiteNav from "@/components/shared/SiteNav"

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
})
const uiFont = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
})
const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
})
const plexMonoFont = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
})
const interFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "WarehousePro — GEODIS Picker Training",
  description: "Warehouse picker training and simulation platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // style={{ background }} is a literal color (not a CSS var) so the very
    // first paint matches the app background — prevents white/black flash
    // before the stylesheet resolves --color-base. #0d1117 = --color-base.
    <html
      lang="en"
      className={`${displayFont.variable} ${uiFont.variable} ${monoFont.variable} ${plexMonoFont.variable} ${interFont.variable}`}
      style={{ background: "#0d1117" }}
    >
      <body style={{ backgroundColor: "var(--color-base)", color: "var(--color-text-primary)" }}>
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
