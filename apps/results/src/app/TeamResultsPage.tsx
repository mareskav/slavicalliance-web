import { ListChecks } from "lucide-react"

import type { QuizResult, TeamSummary } from "@/lib/quiz-results"
import { pageSizeOptions } from "./_lib/constants"
import { formatDate, formatNumber, parsePositiveInt } from "./_lib/formatters"
import { getPaginationHref, getVisiblePages } from "./_lib/navigation"
import { sortTeamResults } from "./_lib/sort"
import type { SortDirection, TeamSortKey } from "./_lib/types"
import { ResultsNavigationBoundary } from "./_components/ResultsNavigationBoundary"
import { StatCard } from "./_components/StatCard"
import { TableFooter } from "./_components/TableFooter"
import { TeamSelect } from "./_components/TeamSelect"
import { TeamTable } from "./_components/TeamTable"
import { ViewSwitch } from "./_components/ViewSwitch"

export const TeamResultsPage = ({
  teams,
  selectedSummary,
  results,
  page,
  pageSize: requestedPageSizeValue,
  sort,
  direction
}: {
  teams: TeamSummary[]
  selectedSummary?: TeamSummary
  results: QuizResult[]
  page?: string
  pageSize?: string
  sort: TeamSortKey
  direction: SortDirection
}) => {
  const sortedResults = sortTeamResults(results, sort, direction)
  const totalPoints = results.reduce((sum, result) => sum + (result.points ?? 0), 0)
  const requestedPageSize = parsePositiveInt(requestedPageSizeValue, pageSizeOptions[0])
  const pageSize = pageSizeOptions.includes(requestedPageSize) ? requestedPageSize : pageSizeOptions[0]
  const totalResults = results.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const currentPage = Math.min(parsePositiveInt(page, 1), totalPages)
  const visiblePages = getVisiblePages(currentPage, totalPages)
  const pageStartIndex = (currentPage - 1) * pageSize
  const paginatedResults = sortedResults.slice(pageStartIndex, pageStartIndex + pageSize)
  const resultRangeStart = totalResults === 0 ? 0 : pageStartIndex + 1
  const resultRangeEnd = Math.min(pageStartIndex + pageSize, totalResults)
  const selectedTeamIdQuery =
    selectedSummary?.teamId !== null && selectedSummary?.teamId !== undefined
      ? String(selectedSummary.teamId)
      : selectedSummary?.duplicateNameCount && selectedSummary.duplicateNameCount > 1
        ? "none"
        : null
  const navigationKey = selectedSummary
    ? [
        "team",
        selectedTeamIdQuery ?? "default",
        selectedSummary.teamName,
        page ?? "1",
        requestedPageSizeValue ?? "default",
        sort,
        direction
      ].join(":")
    : "team:none"
  const sortDescription =
    sort === "place"
      ? `Seřazeno podle umístění ${direction === "asc" ? "vzestupně" : "sestupně"}.`
      : sort === "points"
        ? `Seřazeno podle bodů ${direction === "asc" ? "vzestupně" : "sestupně"}.`
        : sort === "doplnovacek"
          ? `Seřazeno podle doplňovaček ${direction === "asc" ? "vzestupně" : "sestupně"}.`
          : sort === "tip56"
            ? `Seřazeno podle 56. otázky ${direction === "asc" ? "vzestupně" : "sestupně"}.`
            : sort === "pub"
              ? `Seřazeno podle hospody ${direction === "asc" ? "vzestupně" : "sestupně"}.`
              : sort === "maxPoints"
                ? `Seřazeno podle maxima bodů v kole ${direction === "asc" ? "vzestupně" : "sestupně"}.`
                : sort === "members"
                  ? `Seřazeno podle počtu členů ${direction === "asc" ? "vzestupně" : "sestupně"}.`
                  : `Seřazeno podle data ${direction === "asc" ? "od nejstaršího výsledku" : "od nejnovějšího výsledku"}.`

  if (!selectedSummary) {
    return (
      <ResultsNavigationBoundary key={navigationKey}>
        <div className="space-y-8 font-sans">
          <ViewSwitch activeView="team" />
          <section className="rounded-lg border border-white/10 bg-white/4.5 p-8">
            <h1 className="text-3xl font-bold text-white">Výsledky kvízů</h1>
            <p className="mt-3 text-white/65">
              V tabulce public.quiz_results zatím nejsou žádná data.
            </p>
          </section>
        </div>
      </ResultsNavigationBoundary>
    )
  }

  return (
    <ResultsNavigationBoundary key={navigationKey}>
      <div className="space-y-10 font-sans">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="order-2 lg:order-1">
            <ViewSwitch
              activeView="team"
              teamName={selectedSummary.teamName}
              teamIdQuery={selectedTeamIdQuery}
            />
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-4xl">
              {selectedSummary.teamName}
            </h1>
            <p className="mt-3 max-w-3xl text-base font-medium leading-6 text-white/58 sm:text-lg">
              Výsledky týmu u Hospodského kvízu
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <TeamSelect
              teams={teams}
              selectedTeamId={selectedSummary.teamId}
              selectedTeamName={selectedSummary.teamName}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Odehráno"
            value={`${selectedSummary.quizCount} kvízů`}
            detail={`${formatDate(selectedSummary.firstDate)} - ${formatDate(selectedSummary.lastDate)}`}
          />
          <StatCard label="Průměr bodů" value={formatNumber(selectedSummary.averagePoints)} />
          <StatCard
            label="Nejlepší výsledek"
            value={formatNumber(selectedSummary.bestPoints)}
            detail={`Nejlepší umístění: ${selectedSummary.bestPlace}. místo`}
          />
          <StatCard label="Celkový počet bodů" value={formatNumber(totalPoints)} />
        </section>

        <section>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/4">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-sky-100/72" />
                <h2 className="text-2xl font-bold text-white">Odehrané kvízy</h2>
              </div>
              <p className="mt-1 text-sm text-white/58">{sortDescription}</p>
            </div>
            <TeamTable
              results={paginatedResults}
              teamIdQuery={selectedTeamIdQuery}
              teamName={selectedSummary.teamName}
              sort={sort}
              direction={direction}
              pageSize={pageSize}
            />
            <TableFooter
              rangeStart={resultRangeStart}
              rangeEnd={resultRangeEnd}
              total={totalResults}
              pageSize={pageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              visiblePages={visiblePages}
              getPageHref={(p) =>
                getPaginationHref(
                  selectedSummary.teamName,
                  selectedTeamIdQuery,
                  p,
                  pageSize,
                  sort,
                  direction
                )
              }
            />
          </div>
        </section>
      </div>
    </ResultsNavigationBoundary>
  )
}
