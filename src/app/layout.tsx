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
    <html lang="en">
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
