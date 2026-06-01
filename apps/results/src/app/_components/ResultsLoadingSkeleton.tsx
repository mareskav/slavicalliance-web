import type { ResultView } from "../_lib/types"
import { ViewSwitch } from "./ViewSwitch"

const pulseSurface = "animate-pulse rounded-lg border border-white/10 bg-white/[0.045]"

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`${pulseSurface} ${className}`} />
)

const SkeletonLine = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-full bg-white/10 ${className}`} />
)

const tableRows = Array.from({ length: 8 }, (_, index) => index)
const statCards = Array.from({ length: 4 }, (_, index) => index)

export const ResultsLoadingSkeleton = ({
  activeView = "team",
  title = "Výsledky kvízů",
  subtitle = "Výsledky týmu u Hospodského kvízu",
  teamName = "Slavic Alliance"
}: {
  activeView?: ResultView
  title?: string
  subtitle?: string
  teamName?: string
}) => (
  <div className="space-y-10 font-sans" aria-busy="true" aria-live="polite">
    <span className="sr-only">Načítám výsledky.</span>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_480px]">
      <div className="order-2 lg:order-1">
        <ViewSwitch activeView={activeView} teamName={teamName} />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base font-medium leading-6 text-white/58 sm:text-lg">
          {subtitle}
        </p>
      </div>
      <div className="order-1 lg:order-2">
        <SkeletonBlock className="h-14 w-full" />
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {statCards.map((card) => (
        <SkeletonBlock key={card} className="h-[92px]" />
      ))}
    </section>

    <section>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/4">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <SkeletonLine className="h-5 w-5" />
            <SkeletonLine className="h-7 w-44" />
          </div>
          <SkeletonLine className="mt-3 h-4 w-72 max-w-full" />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px] px-5">
            <div className="grid grid-cols-[80px_120px_80px_80px_minmax(180px,1fr)_100px] gap-4 border-b border-white/10 py-3">
              <SkeletonLine className="h-3 w-12" />
              <SkeletonLine className="h-3 w-16" />
              <SkeletonLine className="h-3 w-12 justify-self-end" />
              <SkeletonLine className="h-3 w-12 justify-self-end" />
              <SkeletonLine className="h-3 w-20" />
              <SkeletonLine className="h-3 w-16 justify-self-end" />
            </div>

            <div className="divide-y divide-white/8">
              {tableRows.map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[80px_120px_80px_80px_minmax(180px,1fr)_100px] gap-4 py-3"
                >
                  <SkeletonLine className="h-7 w-9" />
                  <SkeletonLine className="h-5 w-20" />
                  <SkeletonLine className="h-5 w-12 justify-self-end" />
                  <SkeletonLine className="h-5 w-10 justify-self-end" />
                  <SkeletonLine className="h-5 w-full max-w-72" />
                  <SkeletonLine className="h-5 w-14 justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <SkeletonLine className="h-4 w-52 max-w-full" />
          <div className="flex gap-2">
            <SkeletonLine className="h-9 w-24" />
            <SkeletonLine className="h-9 w-28" />
          </div>
        </div>
      </div>
    </section>
  </div>
)
