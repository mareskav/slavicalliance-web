import { SlavicAllianceSpinner } from "@/components/ui/SlavicAllianceSpinner"

const cardItems = [0, 1, 2, 3]

export const StaticPageLoadingState = ({ label = "Načítání stránky" }: { label?: string }) => (
  <div className="space-y-8 pb-16 font-sans sm:pb-24" aria-busy="true" aria-label={label}>
    <section className="min-h-[220px]">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 text-center">
        <SlavicAllianceSpinner label={label} />
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

    <section className="landing-skeleton-reveal grid gap-5 sm:grid-cols-2">
      {cardItems.map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/5"
        >
          <div className="landing-skeleton aspect-[16/9] w-full rounded-none" />
          <div className="space-y-4 p-5">
            <div className="landing-skeleton h-4 w-36 rounded-full" />
            <div className="landing-skeleton h-6 w-10/12 rounded-full" />
            <div className="space-y-3">
              <div className="landing-skeleton h-4 rounded-full" />
              <div className="landing-skeleton h-4 w-9/12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </section>
  </div>
)
