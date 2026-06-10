"use client"

import { useEffect, useState } from "react"

import { FireworksCanvas } from "@repo/ui/components/effects/fireworks-canvas"

const celebrationEndDate = "23.06.2026"

const parseLocalEndOfDay = (value: string) => {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
}

export const ResultsFireworks = () => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const readyTimer = window.setTimeout(() => {
      const endDate = parseLocalEndOfDay(celebrationEndDate)
      setEnabled(endDate ? Date.now() <= endDate.getTime() : true)
    }, 0)
    return () => window.clearTimeout(readyTimer)
  }, [])

  return <FireworksCanvas enabled={enabled} />
}
