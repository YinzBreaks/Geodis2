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
  title: "Kinetic OS — Kinetic Workforce Velocity Platform",
  description:
    "Enterprise 3PL Logistics Operations & Workforce Acceleration Operating System (GEODIS Tier-1 Certified)",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${uiFont.variable} ${monoFont.variable} ${plexMonoFont.variable} ${interFont.variable}`}
      style={{ background: "#07090e" }}
    >
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <SiteNav />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  )
}
