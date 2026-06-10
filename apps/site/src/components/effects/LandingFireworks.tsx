"use client"

import { useEffect, useState } from "react"

import { FireworksCanvas } from "@repo/ui/components/effects/fireworks-canvas"
import type { LandingContentSource } from "@/lib/landing"
import { parseCurrentHighlights, type CurrentHighlightsSection } from "@/lib/landing-parser"

const celebratedHighlight = "3. Jarní liga Prahy 2026"

const normalise = (value: string) => value.trim().toLocaleLowerCase("cs-CZ")

const parseLocalEndOfDay = (value: string | null) => {
  if (!value) return null

  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
}

const shouldShowFireworks = (section: CurrentHighlightsSection) => {
  const hasCelebratedHighlight = section.items.some(
    (item) => normalise(item) === normalise(celebratedHighlight)
  )

  if (!hasCelebratedHighlight) return false

  const endDate = parseLocalEndOfDay(section.endDate)
  return endDate ? Date.now() <= endDate.getTime() : true
}

export const LandingFireworks = ({
  initialHighlights,
  contentSource
}: {
  initialHighlights: CurrentHighlightsSection
  contentSource: LandingContentSource
}) => {
  const [highlights, setHighlights] = useState(initialHighlights)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setEnabled(shouldShowFireworks(highlights)), 0)
    return () => window.clearTimeout(readyTimer)
  }, [highlights])

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
          setHighlights(parseCurrentHighlights(payload.raw))
        }
      })
      .catch(() => {
        if (contentSource === "remote") return
        setHighlights(initialHighlights)
      })

    return () => controller.abort()
  }, [contentSource, initialHighlights])

  return <FireworksCanvas enabled={enabled} />
}
