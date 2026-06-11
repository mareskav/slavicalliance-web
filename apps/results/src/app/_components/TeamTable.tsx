import { ArrowUpRight, MapPin, Star } from "lucide-react"

import type { QuizResult } from "@/lib/quiz-results"
import { formatCompactDate, formatDate, formatNumber } from "../_lib/formatters"
import { getTeamSortHref } from "../_lib/navigation"
import type { SortDirection, TeamSortKey } from "../_lib/types"
import { Placement } from "./Placement"
import { SortHeader } from "./SortHeader"

const hasTip56Question = (value: string | null) => value === "1"

export const TeamTable = ({
  results,
  teamIdQuery,
  teamName,
  sort,
  direction,
  pageSize
}: {
  results: QuizResult[]
  teamIdQuery: string | null
  teamName: string
  sort: TeamSortKey
  direction: SortDirection
  pageSize: number
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-182.5 table-fixed text-left text-sm md:min-w-280 md:text-base xl:min-w-full">
      <thead className="border-b border-white/10 text-xs uppercase text-white/45">
        <tr>
          <th
            className="w-18 px-1.5 py-3 font-semibold sm:px-2 md:w-18 md:px-2"
            aria-sort={sort === "place" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "place", sort, direction, pageSize, "asc")}
              label={<><span className="md:hidden">Místo</span><span className="hidden md:inline">Pořadí</span></>}
              isActive={sort === "place"}
              direction={direction}
            />
          </th>
          <th
            className="w-20 px-1 py-3 font-semibold sm:px-1.5 md:w-36 md:px-4"
            aria-sort={sort === "date" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "date", sort, direction, pageSize, "desc")}
              label="Datum"
              isActive={sort === "date"}
              direction={direction}
            />
          </th>
          <th
            className="w-14 px-1 py-3 text-right font-semibold sm:px-1.5 md:w-20 md:px-3"
            aria-sort={sort === "points" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "points", sort, direction, pageSize, "desc")}
              label="Body"
              align="right"
              isActive={sort === "points"}
              direction={direction}
            />
          </th>
          <th
            className="w-12 px-1 py-3 text-right font-semibold sm:px-1.5 md:w-14 md:px-2"
            aria-sort={sort === "doplnovacek" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "doplnovacek", sort, direction, pageSize, "desc")}
              label="Dopl."
              title="Doplňovačky"
              align="right"
              isActive={sort === "doplnovacek"}
              direction={direction}
            />
          </th>
          <th
            className="w-14 px-1 py-3 text-right font-semibold sm:px-1.5 md:w-16 md:px-2"
            aria-sort={sort === "tip56" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "tip56", sort, direction, pageSize, "asc")}
              label="56. otázka"
              title="56. otázka"
              align="right"
              isActive={sort === "tip56"}
              direction={direction}
            />
          </th>
          <th
            className="w-57.5 px-1.5 py-3 font-semibold sm:w-65 sm:px-2 md:w-auto md:px-3"
            aria-sort={sort === "pub" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "pub", sort, direction, pageSize, "asc")}
              label="Hospoda"
              isActive={sort === "pub"}
              direction={direction}
            />
          </th>
          <th
            className="w-14 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-16 md:px-2"
            aria-sort={sort === "maxPoints" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "maxPoints", sort, direction, pageSize, "desc")}
              label="MAX"
              title="MAX bodů v kole"
              align="right"
              isActive={sort === "maxPoints"}
              direction={direction}
            />
          </th>
          <th
            className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-18 md:px-2"
            aria-sort={sort === "members" ? (direction === "asc" ? "ascending" : "descending") : undefined}
          >
              <SortHeader
                href={getTeamSortHref(teamName, teamIdQuery, "members", sort, direction, pageSize, "desc")}
              label="Členové"
              align="right"
              isActive={sort === "members"}
              direction={direction}
            />
          </th>
          <th className="w-24 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-32 md:px-3">
            Speciály
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/8">
        {results.map((result) => (
          <tr key={result.id} className="transition hover:bg-white/4">
            <td className="px-2 py-2.5 sm:px-2 md:px-2 md:py-3">
              <div className="flex items-center gap-1 text-white">
                <Placement place={result.orderInQuiz} />
              </div>
            </td>
            <td className="px-1 py-2.5 sm:px-1.5 md:px-4 md:py-3">
              <p className="whitespace-nowrap font-semibold leading-5 text-white">
                <span className="md:hidden">{formatCompactDate(result.quizDate)}</span>
                <span className="hidden md:inline">{formatDate(result.quizDate)}</span>
              </p>
            </td>
            <td className="px-1 py-2.5 text-right sm:px-1.5 md:px-3 md:py-3">
              <span className="text-base font-bold text-white md:text-lg">
                {formatNumber(result.points)}
              </span>
            </td>
            <td className="px-1 py-2.5 text-right font-semibold text-white/76 sm:px-1.5 md:px-2 md:py-3">
              {formatNumber(result.doplnovacek)}
            </td>
            <td className="px-1 py-2.5 text-right sm:px-1.5 md:px-2 md:py-3">
              {hasTip56Question(result.tip56Question) ? (
                <Star
                  className="ml-auto h-4 w-4 fill-amber-200 text-amber-200 md:h-5 md:w-5"
                  aria-label="Zodpovězená 56. otázka"
                />
              ) : null}
            </td>
            <td className="min-w-0 px-1.5 py-2.5 sm:px-2 md:px-3 md:py-3">
              <div className="flex min-w-0 flex-col items-start gap-2 md:grid md:grid-cols-[minmax(0,1fr)_190px] md:items-center md:gap-2">
                <p className="min-w-0 whitespace-normal font-medium leading-5 text-white/84 md:truncate">
                  {result.pub ?? "Místo neuvedeno"}
                </p>
                <div className="grid shrink-0 grid-cols-[82px_102px] gap-1.5">
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
            <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-2 md:py-3">
              {formatNumber(result.maxBodyVKole)}
            </td>
            <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-2 md:py-3">
              {result.clenu ?? "-"}
            </td>
            <td className="px-1.5 py-2.5 text-right text-[10px] font-semibold leading-4 text-white/56 sm:px-2 md:px-3 md:py-3 md:text-xs">
              {result.specialName}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
