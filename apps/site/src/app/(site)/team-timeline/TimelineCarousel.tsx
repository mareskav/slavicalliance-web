import type { CSSProperties, RefObject } from "react"

import type { TimelineEvent } from "@/lib/landing-parser"

import { TimelineControlButton } from "./TimelineControlButton"
import { TimelineEventCard } from "./TimelineEventCard"

export const TimelineCarousel = ({
  activeIndex,
  canLeft,
  canRight,
  events,
  onScrollLeft,
  onScrollRight,
  scrollRef
}: {
  activeIndex: number
  canLeft: boolean
  canRight: boolean
  events: TimelineEvent[]
  onScrollLeft: () => void
  onScrollRight: () => void
  scrollRef: RefObject<HTMLDivElement | null>
}) => (
  <div
    className="landing-reveal-item relative rounded-3xl border border-white/6 bg-white/2 shadow-xl shadow-black/30"
    style={{ "--landing-reveal-delay": "180ms" } as CSSProperties}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />

    <TimelineControlButton direction="left" disabled={!canLeft} onClick={onScrollLeft} />
    <TimelineControlButton direction="right" disabled={!canRight} onClick={onScrollRight} />

    <div className="relative overflow-hidden rounded-3xl pt-9 pb-5 sm:pt-10 sm:pb-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#05070c]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#05070c]/60 to-transparent" />

      <div
        ref={scrollRef}
        className="-my-5 flex overflow-x-auto py-5 [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((event, index) => (
          <TimelineEventCard
            key={`${event.year}-${index}`}
            event={event}
            index={index}
            active={index === activeIndex}
          />
        ))}
      </div>
    </div>
  </div>
)
