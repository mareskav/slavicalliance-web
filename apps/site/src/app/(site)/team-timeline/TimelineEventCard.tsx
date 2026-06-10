import type { CSSProperties } from "react"

import { Placement } from "@repo/ui/components/Placement"
import { renderInlineMarkdown } from "@/lib/landing-markdown"
import type { TimelineEvent } from "@/lib/landing-parser"

import { CARD_WIDTH } from "./constants"
import { TimelineMarker } from "./TimelineMarker"
import { parsePlacement } from "./timeline-utils"

export const TimelineEventCard = ({
  event,
  index,
  active
}: {
  event: TimelineEvent
  index: number
  active: boolean
}) => (
  <div
    className="landing-reveal-item flex shrink-0 flex-col items-center [scroll-snap-align:start]"
    style={
      {
        "--landing-reveal-delay": `${Math.min(280 + index * 80, 920)}ms`,
        width: `min(${CARD_WIDTH}px, calc(100vw - 2rem))`
      } as CSSProperties
    }
  >
    <div className="relative flex h-12 w-full items-center">
      <div className="h-px flex-1 bg-gradient-to-r from-sky-400/10 to-sky-400/25" />
      <TimelineMarker active={active} />
      <div className="h-px flex-1 bg-linear-to-l from-sky-400/10 to-sky-400/25" />
    </div>

    <div className="w-full px-5 pt-5 pb-3">
      <span className="mb-3 block text-2xl font-bold text-sky-300/80">
        {event.displayYear}
      </span>
      <div className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-white/2 px-5 py-5 shadow-lg shadow-black/20">
        <ul className="space-y-2.5">
          {event.highlights.map((item, highlightIndex) => {
            const { place, label } = parsePlacement(item)

            return (
              <li
                key={`${event.year}-${highlightIndex}-${item}`}
                className="flex items-start gap-3 text-base leading-7 text-white/75"
              >
                <span className={`${place !== null ? "-mt-1" : ""} shrink-0`}>
                  {place !== null ? (
                    <Placement place={place} size="md" />
                  ) : (
                    <span className="flex h-7 w-9 items-center justify-center">
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
)
