"use client"

import { useEffect, useState } from "react"

import type { LandingContentSource } from "@/lib/landing"
import { parseTimelineEvents, type TimelineEvent } from "@/lib/landing-parser"

export const useTimelineEvents = (
  initialEvents: TimelineEvent[],
  contentSource: LandingContentSource
) => {
  const deferInitialEvents = process.env.NODE_ENV === "production" && contentSource !== "remote"
  const [events, setEvents] = useState<TimelineEvent[]>(deferInitialEvents ? [] : initialEvents)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    const controller = new AbortController()

    fetch("/api/content/pages/landing", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((payload: { raw?: string }) => {
        if (typeof payload.raw === "string") {
          const parsed = parseTimelineEvents(payload.raw)
          if (parsed.length > 0) {
            setEvents(parsed)
            return
          }
        }

        if (deferInitialEvents) {
          setEvents(initialEvents)
        }
      })
      .catch(() => {
        if (deferInitialEvents) {
          setEvents(initialEvents)
        }
      })

    return () => controller.abort()
  }, [deferInitialEvents, initialEvents])

  return events
}
