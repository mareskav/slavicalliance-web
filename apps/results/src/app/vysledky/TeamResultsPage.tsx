import Link from "next/link"
import { ArrowUpRight, ListChecks, MapPin, Star } from "lucide-react"

import type { QuizResult, TeamSummary } from "@/lib/quiz-results"
import { PageSizeSelect } from "./PageSizeSelect"
import {
  formatCompactDate,
  formatDate,
  formatNumber,
  getPaginationHref,
  getTeamSortHref,
  getVisiblePages,
  pageSizeOptions,
  parsePositiveInt,
  Placement,
  type SortDirection,
  SortHeader,
  sortTeamResults,
  StatCard,
  type TeamSortKey,
  ViewSwitch,
} from "./ResultsShared"
import { TeamSelect } from "./TeamSelect"

const hasTip56Question = (value: string | null) => value === "1"

export const TeamResultsPage = ({
  teams,
  selectedSummary,
  results,
  page,
  pageSize: requestedPageSizeValue,
  sort,
  direction,
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
  const teamSortDescription =
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
      <div className="space-y-8 font-sans">
        <ViewSwitch activeView="team" />
        <section className="rounded-lg border border-white/10 bg-white/4.5 p-8">
          <h1 className="text-3xl font-bold text-white">Výsledky kvízů</h1>
          <p className="mt-3 text-white/65">V tabulce public.quiz_results zatím nejsou žádná data.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-10 font-sans">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-8">
        <div className="order-2 lg:order-1">
          <ViewSwitch activeView="team" teamName={selectedSummary.teamName} />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-4xl">{selectedSummary.teamName}</h1>
          <p className="mt-3 max-w-3xl text-base font-medium leading-6 text-white/58 sm:text-lg">
            Výsledky týmu u Hospodského kvízu
          </p>
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
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/4">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-sky-100/72" />
              <h2 className="text-2xl font-bold text-white">Odehrané kvízy</h2>
            </div>
            <p className="mt-1 text-sm text-white/58">{teamSortDescription}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm md:min-w-[1180px] md:text-base">
              <thead className="border-b border-white/10 text-xs uppercase text-white/45">
                <tr>
                  <th
                    className="w-16 px-1.5 py-3 font-semibold sm:px-2 md:w-20 md:px-3"
                    aria-sort={sort === "place" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "place", sort, direction, pageSize, "asc")}
                      label={
                        <>
                          <span className="md:hidden">Místo</span>
                          <span className="hidden md:inline">Pořadí</span>
                        </>
                      }
                      isActive={sort === "place"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-20 px-1.5 py-3 font-semibold sm:px-2 md:w-44 md:px-4"
                    aria-sort={sort === "date" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "date", sort, direction, pageSize, "desc")}
                      label="Datum"
                      isActive={sort === "date"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-24 md:px-4"
                    aria-sort={sort === "points" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "points", sort, direction, pageSize, "desc")}
                      label="Body"
                      align="right"
                      isActive={sort === "points"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-12 px-1 py-3 text-right font-semibold sm:px-1.5 md:w-16 md:px-2"
                    aria-sort={sort === "doplnovacek" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "doplnovacek", sort, direction, pageSize, "desc")}
                      label="Dopl."
                      align="right"
                      isActive={sort === "doplnovacek"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-12 px-1 py-3 text-right font-semibold sm:px-1.5 md:w-16 md:px-2"
                    aria-sort={sort === "tip56" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "tip56", sort, direction, pageSize, "asc")}
                      label="56. otázka"
                      align="right"
                      isActive={sort === "tip56"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-[384px] px-1.5 py-3 font-semibold sm:px-2 md:w-[620px] md:px-4"
                    aria-sort={sort === "pub" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "pub", sort, direction, pageSize, "asc")}
                      label="Hospoda"
                      isActive={sort === "pub"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-14 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-[72px] md:px-3"
                    aria-sort={sort === "maxPoints" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "maxPoints", sort, direction, pageSize, "desc")}
                      label="Max"
                      align="right"
                      isActive={sort === "maxPoints"}
                      direction={direction}
                    />
                  </th>
                  <th
                    className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-20 md:px-3"
                    aria-sort={sort === "members" ? (direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <SortHeader
                      href={getTeamSortHref(selectedSummary.teamName, "members", sort, direction, pageSize, "desc")}
                      label="Členové"
                      align="right"
                      isActive={sort === "members"}
                      direction={direction}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {paginatedResults.map((result) => (
                  <tr key={result.id} className="transition hover:bg-white/4">
                    <td className="px-1.5 py-2.5 sm:px-2 md:px-3 md:py-3">
                      <div className="flex items-center gap-2 text-white">
                        <Placement place={result.orderInQuiz} />
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 sm:px-2 md:px-5 md:py-3">
                      <p className="whitespace-nowrap font-semibold leading-5 text-white">
                        <span className="md:hidden">{formatCompactDate(result.quizDate)}</span>
                        <span className="hidden md:inline">{formatDate(result.quizDate)}</span>
                      </p>
                    </td>
                    <td className="px-1.5 py-2.5 text-right sm:px-2 md:px-4 md:py-3">
                      <span className="text-base font-bold text-white md:text-lg">{formatNumber(result.points)}</span>
                    </td>
                    <td className="px-1 py-2.5 text-right font-semibold text-white/76 sm:px-1.5 md:px-2 md:py-3">{formatNumber(result.doplnovacek)}</td>
                    <td className="px-1 py-2.5 text-right sm:px-1.5 md:px-2 md:py-3">
                      {hasTip56Question(result.tip56Question) ? (
                        <Star className="ml-auto h-6 w-6 fill-amber-200 text-amber-200" aria-label="Zodpovězená 56. otázka" />
                      ) : null}
                    </td>
                    <td className="px-1.5 py-2.5 sm:px-2 md:px-4 md:py-3">
                      <div className="flex min-w-0 flex-col items-start gap-2 md:grid md:grid-cols-[minmax(0,1fr)_206px] md:items-center md:gap-3">
                        <p className="min-w-0 whitespace-normal font-medium leading-5 text-white/84 md:whitespace-nowrap">{result.pub ?? "Místo neuvedeno"}</p>
                        <div className="grid shrink-0 grid-cols-[88px_110px] gap-2">
                          <a
                            href={result.pubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-full bg-white/5.5 px-2 text-xs text-white/62 hover:bg-white/10 hover:text-white"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Hospoda
                          </a>
                          {result.quizDetailsUrl ? (
                            <a
                              href={result.quizDetailsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-sky-100/10 px-2 text-xs text-sky-100/75 hover:bg-sky-100/15 hover:text-white"
                            >
                              Detail kola
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-3 md:py-3">{formatNumber(result.maxBodyVKole)}</td>
                    <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-3 md:py-3">{result.clenu ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <p className="text-sm text-white/52">
              {resultRangeStart}-{resultRangeEnd} z {totalResults}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <PageSizeSelect pageSize={pageSize} options={pageSizeOptions} />

              <nav className="flex items-center gap-1" aria-label="Stránkování výsledků">
                <Link
                  href={getPaginationHref(selectedSummary.teamName, Math.max(1, currentPage - 1), pageSize, sort, direction)}
                  aria-disabled={currentPage === 1}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
                    currentPage === 1 ? "pointer-events-none text-white/28" : "text-white/68 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  Předchozí
                </Link>

                {visiblePages.map((page) => (
                  <Link
                    key={page}
                    href={getPaginationHref(selectedSummary.teamName, page, pageSize, sort, direction)}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                      page === currentPage ? "bg-sky-100/14 text-white ring-1 ring-sky-100/20" : "text-white/58 hover:bg-white/7 hover:text-white"
                    }`}
                  >
                    {page}
                  </Link>
                ))}

                <Link
                  href={getPaginationHref(selectedSummary.teamName, Math.min(totalPages, currentPage + 1), pageSize, sort, direction)}
                  aria-disabled={currentPage === totalPages}
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
                    currentPage === totalPages ? "pointer-events-none text-white/28" : "text-white/68 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  Další
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
