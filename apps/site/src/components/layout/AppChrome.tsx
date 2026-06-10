"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { LandingFireworks } from "@/components/effects/LandingFireworks"
import { SlavicAllianceHeader } from "@/components/layout/Header"
import type { LandingContentSource } from "@/lib/landing"
import {
  getActiveCelebratedHighlight,
  parseCurrentHighlights,
  type CurrentHighlightsSection
} from "@/lib/landing-parser"

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
  const [currentHighlights, setCurrentHighlights] = useState(fireworksHighlights)
  const [achievementLabel, setAchievementLabel] = useState<string | null>(null)
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")
  const resultsHref =
    process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001/vysledky" : "/vysledky")

  useEffect(() => {
    const readyTimer = window.setTimeout(() => {
      setAchievementLabel(getActiveCelebratedHighlight(currentHighlights))
    }, 0)

    return () => window.clearTimeout(readyTimer)
  }, [currentHighlights])

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    const controller = new AbortController()
    fetch("/api/content/pages/landing", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json() as Promise<{ raw?: string }>
      })
      .then((payload) => {
        if (typeof payload.raw === "string") {
          setCurrentHighlights(parseCurrentHighlights(payload.raw))
        }
      })
      .catch(() => {
        if (fireworksContentSource === "remote") return
        setCurrentHighlights(fireworksHighlights)
      })

    return () => controller.abort()
  }, [fireworksContentSource, fireworksHighlights])

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <LandingFireworks highlights={currentHighlights} />
      <SlavicAllianceHeader achievementLabel={achievementLabel} />
      <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <SlavicAllianceFooter resultsHref={resultsHref} />
    </>
  )
}
