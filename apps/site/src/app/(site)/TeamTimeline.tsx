"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Placement } from "@repo/ui/components/Placement"
import type { TimelineEvent } from "@/lib/landing"

const isSafeLink = (href: string) =>
  href.startsWith("https://") ||
  href.startsWith("http://") ||
  href.startsWith("mailto:") ||
  href.startsWith("/") ||
  href.startsWith("./") ||
  href.startsWith("../") ||
  href.startsWith("#")

const normaliseHref = (href: string) => {
  if (href.startsWith("/vysledky")) {
    const resultsHref =
      process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3001/vysledky" : "/vysledky")

    try {
      const base = new URL(resultsHref, "http://localhost")
      const target = new URL(href, "http://localhost")
      base.search = target.search
      if (resultsHref.startsWith("http://") || resultsHref.startsWith("https://")) {
        return `${base.origin}${base.pathname}${base.search}`
      }
      return `${base.pathname}${base.search}`
    } catch {
      return href
    }
  }

  return href
}

const renderInlineMarkdown = (text: string) => {
  return text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)

    if (link) {
      const [, label, href] = link
      const normalisedHref = normaliseHref(href)

      if (!isSafeLink(normalisedHref)) {
        return label
      }

      return (
        <a
          key={index}
          href={normalisedHref}
          className="font-semibold text-sky-200 underline decoration-sky-200/40 underline-offset-4 hover:text-white"
        >
          {label}
        </a>
      )
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }

    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={index} className="text-white/95">
          {part.slice(1, -1)}
        </em>
      )
    }

    return part
  })
}

const parsePlacement = (text: string): { place: number | null; label: string } => {
  if (text.startsWith("🥇")) return { place: 1, label: text.replace(/^🥇\s*/, "") }
  if (text.startsWith("🥈")) return { place: 2, label: text.replace(/^🥈\s*/, "") }
  if (text.startsWith("🥉")) return { place: 3, label: text.replace(/^🥉\s*/, "") }
  // Supports:
  // - "4. - Kvízový maraton 2025" (preferred)
  // - "4. místo na Kvízovém maratonu 2025" (legacy)
  const m = text.match(/^(\d+)\.\s*(?:-\s*)?(.*)$/)
  if (m) {
    const place = parseInt(m[1], 10)
    const label = (m[2] || "").replace(/^místo\s+(?:na|v)\s+/i, "").trim()
    return { place, label }
  }
  return { place: null, label: text }
}

const CARD_WIDTH = 380
const PAUSE_AFTER_INTERACT_MS = 18000
const AUTO_BASE_MS = 5200
const AUTO_PER_CHAR_MS = 16
const AUTO_MAX_MS = 11500

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getAutoDelayMs = (event: TimelineEvent): number => {
  const textLength = event.highlights.join(" ").length
  return clamp(AUTO_BASE_MS + textLength * AUTO_PER_CHAR_MS, AUTO_BASE_MS, AUTO_MAX_MS)
}

const getCurrentIndex = (el: HTMLDivElement): number => {
  const children = Array.from(el.children) as HTMLElement[]
  if (children.length === 0) return 0

  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  children.forEach((child, index) => {
    const distance = Math.abs(child.offsetLeft - el.scrollLeft)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  return closestIndex
}

const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
)

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const TeamTimeline = ({ events }: { events: TimelineEvent[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const pausedUntilRef = useRef(0)

  const sync = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    const nextIndex = getCurrentIndex(el)
    setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex))
  }, [])

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === "right" ? CARD_WIDTH : -CARD_WIDTH, behavior: "smooth" })
    pausedUntilRef.current = Date.now() + PAUSE_AFTER_INTERACT_MS
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    sync()
    el.addEventListener("scroll", sync, { passive: true })
    return () => el.removeEventListener("scroll", sync)
  }, [sync])

  useEffect(() => {
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

      const currentIndex = getCurrentIndex(el)

      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        el.scrollBy({ left: CARD_WIDTH, behavior: "smooth" })
      }

      const nextIndex = (currentIndex + 1) % events.length
      schedule(getAutoDelayMs(events[nextIndex]))
    }

    schedule(getAutoDelayMs(events[0]))

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [events])

  if (events.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl">
      <h2 className="mb-10 text-center text-2xl font-bold text-white">🏆 Naše cesta</h2>

      {/* Outer container: border + background + shadow, bez overflow-hidden aby šipky nebyly ořezané */}
      <div className="relative rounded-3xl border border-white/6 bg-white/2 shadow-xl shadow-black/30">
        {/* Top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />

        {/* Šipky jsou v outer containeru — mimo clip oblast */}
        <button
          onClick={() => scroll("left")}
          disabled={!canLeft}
          aria-label="Předchozí"
          className="absolute left-3 top-8 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#08111b] text-white/60 transition hover:border-sky-400/40 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canRight}
          aria-label="Další"
          className="absolute right-3 top-8 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#08111b] text-white/60 transition hover:border-sky-400/40 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight />
        </button>

        {/* Inner wrapper: overflow-hidden ořezává scroll content na zaoblené rohy */}
        <div className="relative overflow-hidden rounded-3xl pt-10 pb-5 sm:pt-12 sm:pb-6">
          {/* Fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#05070c]/60 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#05070c]/60 to-transparent" />

          {/* Scroll track */}
          <div
            ref={scrollRef}
            className="flex overflow-x-auto [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
          >
            {events.map((event, i) => (
              <div
                key={event.year}
                className="flex shrink-0 flex-col items-center [scroll-snap-align:start]"
                style={{ width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))` }}
              >
                {/* Timeline line + dot */}
                <div className="relative flex w-full items-center">
                  <div className={`h-px flex-1 ${i === 0 ? "bg-transparent" : "bg-gradient-to-r from-sky-400/10 to-sky-400/25"}`} />
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-visible">
                    {i === activeIndex && (
                      <div className="pointer-events-none absolute inset-0 m-auto hidden h-8 w-8 rounded-full border border-sky-200/55 md:block md:h-9 md:w-9 md:animate-pulse" />
                    )}
                    <div
                      className={`absolute inset-0 m-auto rounded-full ${i === activeIndex ? "h-7 w-7 bg-sky-300/20 blur-md md:h-8 md:w-8" : "h-6 w-6 bg-sky-400/10 blur-sm"}`}
                    />
                    <div
                      className={`relative rounded-full transition-all duration-300 ${i === activeIndex
                        ? "h-3.5 w-3.5 border border-sky-100/90 bg-sky-300/80 shadow-[0_0_12px_4px_rgba(125,211,252,0.45)] md:h-4 md:w-4 md:shadow-[0_0_14px_5px_rgba(125,211,252,0.48)]"
                        : "h-3 w-3 border border-sky-400/70 bg-sky-400/30 shadow-[0_0_10px_3px_rgba(56,189,248,0.25)]"}`}
                    />
                  </div>
                  <div className={`h-px flex-1 ${i === events.length - 1 ? "bg-transparent" : "bg-linear-to-l from-sky-400/10 to-sky-400/25"}`} />
                </div>

                {/* Content */}
                <div className="w-full px-5 pt-5 pb-3">
                  <span className="mb-3 block text-2xl font-bold text-sky-300/80">
                    {event.displayYear}
                  </span>
                  <div className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-white/2 px-5 py-5 shadow-lg shadow-black/20">
                    <ul className="space-y-2.5">
                      {event.highlights.map((item, index) => {
                        const { place, label } = parsePlacement(item)
                        return (
                          <li key={`${event.year}-${index}-${item}`} className="flex items-start gap-3 text-base leading-7 text-white/75">
                            <span className="mt-0.5 shrink-0">
                              {place !== null ? (
                                <Placement place={place} size="md" />
                              ) : (
                                <span className="flex h-9 w-9 items-center justify-center">
                                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400/60" />
                                </span>
                              )}
                            </span>
                            <span>{renderInlineMarkdown(label)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
