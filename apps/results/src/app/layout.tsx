import type { Metadata } from "next"
import { SlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"

import "./globals.css"

export const metadata: Metadata = {
  title: "Výsledky kvízů | Slavic Alliance",
  description: "Týmový přehled výsledků hospodských kvízů.",
}

const getSiteHref = () => {
  return process.env.NEXT_PUBLIC_SITE_APP_URL?.trim() || process.env.SITE_APP_URL?.trim() || "http://localhost:3000"
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />

        <SlavicAllianceHeader siteHref={getSiteHref()} resultsHref="/vysledky?team=Slavic%20Alliance" />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  )
}

export default RootLayout
