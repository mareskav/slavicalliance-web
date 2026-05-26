import { ArrowUpRight, MapPin } from "lucide-react"

import { getTeamResults, getTeamSummaries } from "@/lib/quiz-results"
import { TeamSelect } from "./TeamSelect"

export const dynamic = "force-dynamic"

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const compactDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
})

const formatDate = (value: string) => dateFormatter.format(new Date(value))
const formatCompactDate = (value: string) => compactDateFormatter.format(new Date(value)).replace(/\s/g, "")

const formatNumber = (value: number | null) => {
  if (value === null) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(value)
}

const StatCard = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="min-w-0 rounded-lg border border-white/10 bg-white/4.5 px-3 py-3.5 shadow-2xl shadow-sky-950/10 sm:px-4">
    <p className="text-xs font-medium leading-4 text-white/52">{label}</p>
    <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{value}</p>
    <p className="mt-1.5 text-xs leading-5 text-white/56">{detail}</p>
  </div>
)

const placeBadgeClassNames: Record<number, string> = {
  1: "border-amber-200/55 bg-amber-300/18 text-amber-100 shadow-amber-300/10",
  2: "border-slate-200/45 bg-slate-200/14 text-slate-100 shadow-slate-200/10",
  3: "border-orange-300/45 bg-orange-400/14 text-orange-100 shadow-orange-300/10",
}

const Placement = ({ place }: { place: number | null }) => {
  if (!place) {
    return (
      <>
        <span className="h-7 w-7" aria-hidden="true" />
        <span className="text-lg font-semibold text-white">-</span>
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
        <span className="sr-only">{place}. místo</span>
      </>
    )
  }

  if (place === 4) {
    return (
      <>
        <span className="flex h-7 w-7 items-center justify-center text-lg leading-none" aria-hidden="true">
          🥔
        </span>
        <span className="text-lg font-semibold text-white">{place}.</span>
      </>
    )
  }

  return (
    <>
      <span className="h-7 w-7" aria-hidden="true" />
      <span className="text-lg font-semibold text-white">{place}.</span>
    </>
  )
}

const ResultsPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ team?: string }>
}) => {
  const params = await searchParams
  const teams = await getTeamSummaries()
  const selectedTeam = params?.team && teams.some((team) => team.teamName === params.team) ? params.team : teams[0]?.teamName
  const selectedSummary = teams.find((team) => team.teamName === selectedTeam)
  const results = selectedTeam ? await getTeamResults(selectedTeam) : []
  const totalPoints = results.reduce((sum, result) => sum + (result.points ?? 0), 0)

  if (!selectedSummary) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/4.5 p-8">
        <h1 className="text-3xl font-bold text-white">Výsledky kvízů</h1>
        <p className="mt-3 text-white/65">V tabulce public.quiz_results zatím nejsou žádná data.</p>
      </section>
    )
  }

  return (
    <div className="space-y-10 font-sans">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-8">
        <div className="order-2 lg:order-1">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-4xl">{selectedSummary.teamName}</h1>
          {/*<p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">*/}
          {/*  Přehled odehraných kvízů pro jeden tým: body, umístění, místo konání a odkazy na detail kola.*/}
          {/*</p>*/}
        </div>

        <div className="order-1 lg:order-2">
          <TeamSelect teams={teams} selectedTeamName={selectedSummary.teamName} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Odehráno"
          value={`${selectedSummary.quizCount} kvízů`}
          detail={`${formatCompactDate(selectedSummary.firstDate)} - ${formatCompactDate(selectedSummary.lastDate)}`}
        />
        <StatCard label="Průměr bodů" value={formatNumber(selectedSummary.averagePoints)} detail="" />
        <StatCard label="Nejlepší výsledek" value={formatNumber(selectedSummary.bestPoints)} detail={`Nejlepší umístění: ${selectedSummary.bestPlace}. místo`} />
        <StatCard label="Celkový počet bodů" value={formatNumber(totalPoints)} detail="" />
      </section>

      <section>
        <div className="rounded-lg border border-white/10 bg-white/4">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-2xl font-bold text-white">Odehrané kvízy</h2>
            <p className="mt-1 text-sm text-white/58">Seřazeno od nejnovějšího výsledku.</p>
          </div>

          <div className="divide-y divide-white/8">
            {results.map((result) => (
              <article key={result.id} className="grid gap-2 px-4 py-2.5 md:grid-cols-[72px_148px_196px_minmax(0,1fr)] md:items-center md:gap-4 md:px-5">
                <div className="flex items-center gap-2 text-white">
                  <Placement place={result.orderInQuiz} />
                </div>

                <div>
                  <p className="font-semibold text-white">{formatDate(result.quizDate)}</p>
                  <p className="text-sm text-white/48">{result.clenu ? `${result.clenu} členů` : "Počet členů neuveden"}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold leading-none text-white">{formatNumber(result.points)}</p>
                  <p className="text-sm text-white/45">bodů{result.maxBodyVKole ? ` / max ${formatNumber(result.maxBodyVKole)}` : null}</p>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 max-w-full truncate font-medium text-white/84 md:flex-1">{result.pub ?? "Místo neuvedeno"}</p>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={result.pubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-full bg-white/5.5 px-2.5 text-xs text-white/62 hover:bg-white/10 hover:text-white"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Hospoda
                    </a>
                    {result.quizDetailsUrl ? (
                      <a
                        href={result.quizDetailsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded-full bg-sky-100/10 px-2.5 text-xs text-sky-100/75 hover:bg-sky-100/15 hover:text-white"
                      >
                        Detail kola
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ResultsPage
