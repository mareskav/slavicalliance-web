const badgeClass: Record<number, string> = {
  1: "border-amber-200/85 bg-amber-400/38 text-amber-50 shadow-amber-300/20",
  2: "border-zinc-100/75 bg-zinc-200/34 text-white shadow-zinc-100/16",
  3: "border-orange-300/75 bg-orange-500/34 text-orange-50 shadow-orange-300/18",
}

const sizeClass = {
  sm: { badge: "h-7 w-7 text-sm", plain: "h-7 w-7 text-lg" },
  md: { badge: "h-9 w-9 text-base", plain: "h-9 w-9 text-xl" },
}

export const Placement = ({
  place,
  size = "sm",
}: {
  place: number | null
  size?: "sm" | "md"
}) => {
  const sz = sizeClass[size]

  if (!place) {
    return <span className={`flex items-center justify-center font-semibold text-white ${sz.plain}`}>-</span>
  }

  if (place <= 3) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full border font-bold shadow-lg ${badgeClass[place]} ${sz.badge}`}
        aria-label={`${place}. místo`}
      >
        {place}
      </span>
    )
  }

  return (
    <span className={`flex shrink-0 items-center justify-center font-semibold text-white/70 ${sz.plain}`}>
      {place}.
    </span>
  )
}
