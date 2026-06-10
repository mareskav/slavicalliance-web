import type { Metadata } from "next"
import Script from "next/script"
import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { SlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"
import {
  getActiveCelebratedHighlight,
  parseCurrentHighlights,
  type CurrentHighlightsSection
} from "@repo/ui/lib/celebration"

import { ResultsFireworks } from "./_components/ResultsFireworks"
import "./globals.css"

export const metadata: Metadata = {
  title: "Výsledky kvízů | Slavic Alliance",
  description: "Týmový přehled výsledků hospodských kvízů.",
  icons: {
    icon: "/vysledky/icon.png",
  },
}

const getSiteHref = () => {
  return (
    process.env.NEXT_PUBLIC_SITE_APP_URL?.trim() ||
    process.env.SITE_APP_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://slavicalliance.cz")
  )
}

const emptyCurrentHighlights: CurrentHighlightsSection = {
  heading: "Aktuálně",
  items: [],
  endDate: null
}

const getCurrentHighlights = async (siteHref: string): Promise<CurrentHighlightsSection> => {
  try {
    const response = await fetch(`${siteHref.replace(/\/$/, "")}/api/content/pages/landing`, {
      cache: "no-store"
    })
    if (!response.ok) return emptyCurrentHighlights

    const payload = (await response.json()) as { raw?: string }
    return typeof payload.raw === "string" ? parseCurrentHighlights(payload.raw) : emptyCurrentHighlights
  } catch {
    return emptyCurrentHighlights
  }
}

const RESULTS_LOGO_SRC = "/vysledky/slavic_alliance.svg?v=20260527"

const RootLayout = async ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const siteHref = getSiteHref()
  const currentHighlights = await getCurrentHighlights(siteHref)
  const achievementLabel = getActiveCelebratedHighlight(currentHighlights)

  return (
    <html lang="cs">
      <body className="flex min-h-screen flex-col bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />
        <ResultsFireworks highlights={currentHighlights} />

        <SlavicAllianceHeader
          achievementLabel={achievementLabel}
          siteHref={siteHref}
          resultsHref="/vysledky?team=Slavic%20Alliance"
          logoSrc={RESULTS_LOGO_SRC}
          activeItem="results"
        />

        <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">{children}</main>

        <SlavicAllianceFooter siteHref={siteHref} resultsHref="/vysledky?team=Slavic%20Alliance" />
        {process.env.NODE_ENV === "production" && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "612819a09d8543f4b7d7336c0f84e53c"}'
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}

export default RootLayout
