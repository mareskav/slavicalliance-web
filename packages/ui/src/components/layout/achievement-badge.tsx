import { Placement } from "../Placement"

const getAchievementParts = (label: string) => {
  return {
    place: Number(label.match(/^\s*(\d+)\./)?.[1] ?? 0) || null,
    text: label.replace(/^\s*\d+\.\s*/, "")
  }
}

export const AchievementBadge = ({ label }: { label: string }) => {
  const { place, text } = getAchievementParts(label)

  return (
    <div className="relative w-fit max-w-full">
      <style>{`
        @keyframes slavic-achievement-shimmer {
          0%,
          62% {
            transform: translateX(-120%) rotate(12deg);
            opacity: 0.2;
          }
          70% {
            opacity: 0.5;
          }
          86% {
            opacity: 0.5;
          }
          100% {
            transform: translateX(600%) rotate(12deg);
            opacity: 0;
          }
        }

        .slavic-achievement-shimmer {
          animation: slavic-achievement-shimmer 2.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .slavic-achievement-shimmer {
            animation: none;
          }
        }
      `}</style>
      <span className="pointer-events-none absolute -inset-4 rounded-2xl bg-amber-200/10 blur-2xl" />
      <div className="relative z-10 flex min-h-10 max-w-full items-center gap-2 overflow-hidden rounded-xl border border-transparent bg-amber-300/7.5 px-3 py-1.5 shadow-[0_10px_26px_rgba(245,158,11,0.13)] ring-0 ring-amber-100/5">
        <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-amber-100/6 via-yellow-100/12 to-amber-500/6" />
        <span className="pointer-events-none absolute -inset-px rounded-xl shadow-[inset_0_0_22px_rgba(253,230,138,0.08)]" />
        <span className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rounded-full bg-amber-200/14 blur-xl" />
        <span className="pointer-events-none absolute left-10 top-0 h-px w-24 bg-linear-to-r from-transparent via-yellow-100/45 to-transparent" />
        <span className="slavic-achievement-shimmer pointer-events-none absolute -inset-y-7 -left-10 w-9 bg-linear-to-r from-transparent via-yellow-100/45 to-transparent blur-[1px]" />
        <span className="relative" aria-hidden="true">
          <Placement place={place} />
        </span>
        <span className="relative min-w-0 truncate text-xs font-semibold tracking-normal text-amber-50/90 sm:text-sm">
          {text}
        </span>
      </div>
    </div>
  )
}
