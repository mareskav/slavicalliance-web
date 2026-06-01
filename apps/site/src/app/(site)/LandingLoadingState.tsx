import { SlavicAllianceSpinner } from "@/components/ui/SlavicAllianceSpinner"

export const LandingIntroLoadingState = () => (
  <section className="mb-14 min-h-[220px]" aria-busy="true" aria-label="Načítání úvodu">
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 text-center">
      <SlavicAllianceSpinner label="Načítání úvodu" />
      <div className="landing-skeleton-reveal w-full max-w-3xl space-y-5">
        <div className="landing-skeleton mx-auto h-10 w-11/12 rounded-full sm:h-12" />
        <div className="mx-auto space-y-3">
          <div className="landing-skeleton h-4 rounded-full" />
          <div className="landing-skeleton mx-auto h-4 w-10/12 rounded-full" />
          <div className="landing-skeleton mx-auto h-4 w-8/12 rounded-full" />
        </div>
      </div>
    </div>
  </section>
)

export const LandingTimelineLoadingState = () => (
  <section
    className="mx-auto min-h-[520px] max-w-6xl"
    aria-busy="true"
    aria-label="Načítání týmové cesty"
  >
    <div className="landing-skeleton-reveal">
      <div className="landing-skeleton mx-auto mb-5 h-8 w-44 rounded-full" />
      <div className="relative overflow-hidden rounded-3xl border border-white/6 bg-white/2 px-5 py-9 shadow-xl shadow-black/30 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
        <div className="mb-5 flex items-center">
          <div className="h-px flex-1 bg-gradient-to-r from-sky-400/10 to-sky-400/25" />
          <div className="landing-skeleton mx-4 h-5 w-5 rounded-full" />
          <div className="h-px flex-1 bg-gradient-to-l from-sky-400/10 to-sky-400/25" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-white/2 p-5"
            >
              <div className="landing-skeleton mb-4 h-7 w-20 rounded-full" />
              <div className="space-y-3">
                <div className="landing-skeleton h-4 rounded-full" />
                <div className="landing-skeleton h-4 w-10/12 rounded-full" />
                <div className="landing-skeleton h-4 w-8/12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)
