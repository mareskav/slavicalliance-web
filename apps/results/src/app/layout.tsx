import type { Metadata, Viewport } from "next"
import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { SlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"

import "./globals.css"
import { PwaInstallBanner } from "./_components/PwaInstallBanner"
import { ServiceWorkerRegistration } from "./_components/ServiceWorkerRegistration"

export const viewport: Viewport = {
  themeColor: "#08111b"
}

export const metadata: Metadata = {
  title: "Výsledky kvízů | Slavic Alliance",
  description: "Týmový přehled výsledků hospodských kvízů.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Slavic Alliance"
  },
  icons: {
    icon: "/vysledky/icon.png",
    apple: "/apple-touch-icon.png"
  }
}

const getSiteHref = () => {
  return process.env.NEXT_PUBLIC_SITE_APP_URL?.trim() || process.env.SITE_APP_URL?.trim() || "http://localhost:3000"
}

const RESULTS_LOGO_SRC = "/vysledky/slavic_alliance.svg?v=20260527"

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="cs">
      {/* Manifest lives at root origin (apps/site). Hardcode path to avoid basePath prefix. */}
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="flex min-h-screen flex-col bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />

        <SlavicAllianceHeader
          siteHref={getSiteHref()}
          resultsHref="/vysledky?team=Slavic%20Alliance"
          logoSrc={RESULTS_LOGO_SRC}
          activeItem="results"
        />

        <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">{children}</main>

        <SlavicAllianceFooter siteHref={getSiteHref()} resultsHref="/vysledky?team=Slavic%20Alliance" />

        <ServiceWorkerRegistration />
        <PwaInstallBanner />
      </body>
    </html>
  )
}

export default RootLayout
