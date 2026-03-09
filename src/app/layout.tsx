import type { Metadata } from "next"
import "./globals.css"
import SiteNav from "@/components/shared/SiteNav"

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
    <html lang="en" style={{ background: "#0d1117" }}>
      <head>
        {/* Google Fonts — Barlow Condensed, DM Sans, JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ backgroundColor: "var(--color-base)", color: "var(--color-text-primary)" }}>
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
