import Link from "next/link"
import { ArrowUpRight, MapPin, Medal, Trophy } from "lucide-react"

import { getTeamResults, getTeamSummaries } from "@/lib/quiz-results"

export const dynamic = "force-dynamic"

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const formatDate = (value: string) => dateFormatter.format(new Date(value))

const formatNumber = (value: number | null) => {
  if (value === null) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 }).format(value)
}

const StatCard = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="rounded-lg border border-white/10 bg-white/4.5 p-5 shadow-2xl shadow-sky-950/10">
    <p className="text-sm text-white/55">{label}</p>
    <p className="mt-1 text-3xl font-bold tracking-tight text-white">{value}</p>
    <p className="mt-2 text-sm text-white/58">{detail}</p>
  </div>
)

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
  const latestResult = results[0]
  const previousResult = results[1]
  const pointsDelta =
    latestResult?.points !== null && latestResult?.points !== undefined && previousResult?.points !== null && previousResult?.points !== undefined
      ? latestResult.points - previousResult.points
      : null

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
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-sky-100/15 bg-sky-100/10 px-3 py-1 text-sm font-medium text-sky-100/82">
            <Trophy className="h-4 w-4" />
            Výsledky kvízů
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{selectedSummary.teamName}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">
            Přehled odehraných kvízů pro jeden tým: body, umístění, místo konání a odkazy na detail kola.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/4.5 p-4">
          <p className="mb-3 text-sm font-medium text-white/62">Zobrazit tým</p>
          <div className="grid gap-2">
            {teams.map((team) => (
              <Link
                key={team.teamName}
                href={`/vysledky?team=${encodeURIComponent(team.teamName)}`}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  team.teamName === selectedSummary.teamName
                    ? "bg-sky-100/15 text-white"
                    : "bg-white/[0.035] text-white/65 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  {team.teamName}
                  <span className="text-white/45">{team.quizCount}x</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Odehráno" value={`${selectedSummary.quizCount}x`} detail={`${formatDate(selectedSummary.firstDate)} - ${formatDate(selectedSummary.lastDate)}`} />
        <StatCard label="Průměr bodů" value={formatNumber(selectedSummary.averagePoints)} detail="Průměr ze všech uložených kvízů" />
        <StatCard label="Nejlepší výsledek" value={formatNumber(selectedSummary.bestPoints)} detail={`Nejlepší umístění: ${selectedSummary.bestPlace}. místo`} />
        <StatCard
          label="Poslední změna"
          value={pointsDelta === null ? "-" : `${pointsDelta > 0 ? "+" : ""}${formatNumber(pointsDelta)}`}
          detail={latestResult ? `Poslední kvíz: ${formatDate(latestResult.quizDate)}` : "Bez posledního výsledku"}
        />
      </section>

      <section>
        <div className="rounded-lg border border-white/10 bg-white/4">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-2xl font-bold text-white">Odehrané kvízy</h2>
            <p className="mt-1 text-sm text-white/58">Seřazeno od nejnovějšího výsledku.</p>
          </div>

          <div className="divide-y divide-white/8">
            {results.map((result) => (
              <article key={result.id} className="grid gap-3 px-5 py-3.5 md:grid-cols-[132px_minmax(0,1fr)_132px_84px] md:items-center">
                <div>
                  <p className="font-semibold text-white">{formatDate(result.quizDate)}</p>
                  <p className="mt-1 text-sm text-white/48">{result.clenu ? `${result.clenu} členů` : "Počet členů neuveden"}</p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-white/84">{result.pub ?? "Místo neuvedeno"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={result.pubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-white/5.5 px-2.5 py-1 text-xs text-white/62 hover:bg-white/10 hover:text-white"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Hospoda
                    </a>
                    {result.quizDetailsUrl ? (
                      <a
                        href={result.quizDetailsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100/10 px-2.5 py-1 text-xs text-sky-100/75 hover:bg-sky-100/15 hover:text-white"
                      >
                        Detail kola
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-white/42">Body</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">{formatNumber(result.points)}</p>
                  {result.maxBodyVKole ? <p className="text-sm text-white/45">max v kole {formatNumber(result.maxBodyVKole)}</p> : null}
                </div>

                <div className="flex items-center gap-2 text-white">
                  <Medal className="h-5 w-5 text-amber-100/85" />
                  <span className="text-lg font-semibold">{result.orderInQuiz ? `${result.orderInQuiz}.` : "-"}</span>
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
