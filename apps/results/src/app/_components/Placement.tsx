const placeBadgeClassNames: Record<number, string> = {
  1: "border-amber-200/85 bg-amber-400/38 text-amber-50 shadow-amber-300/20",
  2: "border-zinc-100/75 bg-zinc-200/34 text-white shadow-zinc-100/16",
  3: "border-orange-300/75 bg-orange-500/34 text-orange-50 shadow-orange-300/18"
}

export const Placement = ({ place }: { place: number | null }) => {
  if (!place) {
    return (
      <>
        <span className="flex h-7 w-7 items-center justify-center text-lg font-semibold text-white">
          -
        </span>
        <span className="w-6" aria-hidden="true" />
      </>
    )
  }

  if (place <= 3) {
    return (
      <>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold shadow-lg ${placeBadgeClassNames[place]}`}
          aria-label={`${place}. místo`}
        >
          {place}
        </span>
        <span className="w-6" aria-hidden="true" />
        <span className="sr-only">{place}. místo</span>
      </>
    )
  }

  return (
    <>
      <span className="flex h-7 w-7 items-center justify-center text-lg font-semibold text-white">
        {place}.
      </span>
      <span className="w-6" aria-hidden="true" />
    </>
  )
}
