import { ChevronIcon } from "./ChevronIcon"

export const TimelineControlButton = ({
  direction,
  disabled,
  onClick
}: {
  direction: "left" | "right"
  disabled: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === "left" ? "Předchozí" : "Další"}
    className={`${direction === "left" ? "left-3" : "right-3"} absolute top-15 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#08111b]/95 text-white/60 transition hover:border-sky-400/40 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:top-16`}
  >
    <ChevronIcon direction={direction} />
  </button>
)
