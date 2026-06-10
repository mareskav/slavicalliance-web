import type { CSSProperties } from "react"

import { ACTIVE_MARKER_ANIMATION_MS } from "./constants"

export const TimelineMarker = ({ active }: { active: boolean }) => (
  <div
    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-visible"
    style={
      {
        "--active-marker-animation-ms": `${ACTIVE_MARKER_ANIMATION_MS}ms`
      } as CSSProperties
    }
  >
    {active && (
      <>
        <div className="timeline-marker-ring pointer-events-none absolute inset-0 m-auto h-8 w-8 rounded-full border md:h-10 md:w-10" />
        <div className="timeline-marker-halo pointer-events-none absolute inset-0 m-auto h-9 w-9 rounded-full bg-sky-300/20 blur-sm md:h-11 md:w-11" />
      </>
    )}
    <div
      className={`absolute inset-0 m-auto rounded-full ${active ? "h-7 w-7 bg-sky-300/20 blur-md md:h-8 md:w-8" : "h-6 w-6 bg-sky-400/10 blur-sm"}`}
    />
    <div
      className={`relative rounded-full transition-all duration-300 ${
        active
          ? "timeline-marker-core h-3.5 w-3.5 border border-sky-100/90 bg-sky-300/85 shadow-[0_0_14px_5px_rgba(125,211,252,0.52)] md:h-4 md:w-4 md:shadow-[0_0_16px_6px_rgba(125,211,252,0.56)]"
          : "h-3 w-3 border border-sky-400/70 bg-sky-400/30 shadow-[0_0_10px_3px_rgba(56,189,248,0.25)]"
      }`}
    />
  </div>
)
