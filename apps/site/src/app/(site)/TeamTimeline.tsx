"use client"

import type { CSSProperties } from "react"

import type { LandingContentSource } from "@/lib/landing"
import type { TimelineEvent } from "@/lib/landing-parser"
import { LandingTimelineLoadingState } from "./LandingLoadingState"
import { TimelineCarousel } from "./team-timeline/TimelineCarousel"
import { timelineMarkerStyles } from "./team-timeline/timeline-marker-styles"
import { useTimelineCarousel } from "./team-timeline/useTimelineCarousel"
import { useTimelineEvents } from "./team-timeline/useTimelineEvents"

export const TeamTimeline = ({
  events: initialEvents,
  contentSource
}: {
  events: TimelineEvent[]
  contentSource: LandingContentSource
}) => {
  const events = useTimelineEvents(initialEvents, contentSource)
  const { activeIndex, canLeft, canRight, scroll, scrollRef } = useTimelineCarousel(events)

  if (events.length === 0) {
    return <LandingTimelineLoadingState />
  }

  return (
    <section className="landing-section-reveal mx-auto max-w-6xl">
      <style>{timelineMarkerStyles}</style>
      <h2
        className="landing-reveal-item mb-5 text-center text-2xl font-bold text-white"
        style={{ "--landing-reveal-delay": "80ms" } as CSSProperties}
      >
        🏆 Naše cesta
      </h2>

      <TimelineCarousel
        activeIndex={activeIndex}
        canLeft={canLeft}
        canRight={canRight}
        events={events}
        onScrollLeft={() => scroll("left")}
        onScrollRight={() => scroll("right")}
        scrollRef={scrollRef}
      />
    </section>
  )
}
