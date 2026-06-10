"use client"

import { useEffect, useState } from "react"

import { FireworksCanvas } from "@repo/ui/components/effects/fireworks-canvas"
import { shouldShowCelebratedHighlight, type CurrentHighlightsSection } from "@/lib/landing-parser"

export const LandingFireworks = ({
  highlights
}: {
  highlights: CurrentHighlightsSection
}) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setEnabled(shouldShowCelebratedHighlight(highlights)), 0)
    return () => window.clearTimeout(readyTimer)
  }, [highlights])

  return <FireworksCanvas enabled={enabled} />
}
