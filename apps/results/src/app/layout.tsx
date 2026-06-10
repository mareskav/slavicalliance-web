import type { Metadata } from "next"
import Script from "next/script"
import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { SlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"

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
  return process.env.NEXT_PUBLIC_SITE_APP_URL?.trim() || process.env.SITE_APP_URL?.trim() || "http://localhost:3000"
}

const RESULTS_LOGO_SRC = "/vysledky/slavic_alliance.svg?v=20260527"

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="cs">
      <body className="flex min-h-screen flex-col bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />
        <ResultsFireworks />

        <SlavicAllianceHeader
          siteHref={getSiteHref()}
          resultsHref="/vysledky?team=Slavic%20Alliance"
          logoSrc={RESULTS_LOGO_SRC}
          activeItem="results"
        />

        <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">{children}</main>

        <SlavicAllianceFooter siteHref={getSiteHref()} resultsHref="/vysledky?team=Slavic%20Alliance" />
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
