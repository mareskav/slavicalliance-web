"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { TimelineEvent } from "@/lib/landing-parser"

import { DESKTOP_ACTIVE_MARKER_QUERY, PAUSE_AFTER_INTERACT_MS } from "./constants"
import { getAutoDelayMs, getCardStep, getCurrentIndex } from "./timeline-utils"

export const useTimelineCarousel = (events: TimelineEvent[]) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedUntilRef = useRef(0)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [centerActiveMarker, setCenterActiveMarker] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_ACTIVE_MARKER_QUERY)
    const syncMarkerMode = () => setCenterActiveMarker(mediaQuery.matches)

    syncMarkerMode()
    mediaQuery.addEventListener("change", syncMarkerMode)
    return () => mediaQuery.removeEventListener("change", syncMarkerMode)
  }, [])

  const sync = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)

    const nextIndex = getCurrentIndex(el, centerActiveMarker)
    setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex))
  }, [centerActiveMarker])

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return

    const step = getCardStep(el)
    el.scrollBy({ left: dir === "right" ? step : -step, behavior: "smooth" })
    pausedUntilRef.current = Date.now() + PAUSE_AFTER_INTERACT_MS
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    sync()
    el.addEventListener("scroll", sync, { passive: true })
    return () => el.removeEventListener("scroll", sync)
  }, [events.length, sync])

  useEffect(() => {
    if (events.length === 0) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const schedule = (delayMs: number) => {
      if (cancelled) return
      timer = setTimeout(tick, delayMs)
    }

    const tick = () => {
      if (cancelled) return

      const el = scrollRef.current
      if (!el) return

      const pauseRemaining = pausedUntilRef.current - Date.now()
      if (pauseRemaining > 0) {
        schedule(pauseRemaining)
        return
      }

      const currentIndex = getCurrentIndex(el, centerActiveMarker)
      const step = getCardStep(el)

      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        el.scrollBy({ left: step, behavior: "smooth" })
      }

      const nextIndex = (currentIndex + 1) % events.length
      schedule(getAutoDelayMs(events[nextIndex]))
    }

    schedule(getAutoDelayMs(events[0]))

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [centerActiveMarker, events])

  return {
    activeIndex,
    canLeft,
    canRight,
    scroll,
    scrollRef
  }
}
