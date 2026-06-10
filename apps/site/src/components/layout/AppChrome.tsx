"use client"

import { usePathname } from "next/navigation"

import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { LandingFireworks } from "@/components/effects/LandingFireworks"
import { SlavicAllianceHeader } from "@/components/layout/Header"
import type { LandingContentSource } from "@/lib/landing"
import type { CurrentHighlightsSection } from "@/lib/landing-parser"

export const AppChrome = ({
  children,
  fireworksHighlights,
  fireworksContentSource
}: Readonly<{
  children: React.ReactNode
  fireworksHighlights: CurrentHighlightsSection
  fireworksContentSource: LandingContentSource
}>) => {
  const pathname = usePathname()
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")
  const resultsHref =
    process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001/vysledky" : "/vysledky")

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <LandingFireworks
        initialHighlights={fireworksHighlights}
        contentSource={fireworksContentSource}
      />
      <SlavicAllianceHeader />
      <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <SlavicAllianceFooter resultsHref={resultsHref} />
    </>
  )
}
