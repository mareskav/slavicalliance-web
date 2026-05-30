import type { LeagueCutCount } from "../_lib/constants"
import { formatDate, formatDroppedPoints, formatNumber } from "../_lib/formatters"
import { getLeagueSortHref } from "../_lib/navigation"
import type { LeagueStandingDisplayTeam, LeagueSortKey, SortDirection } from "../_lib/types"
import { Placement } from "./Placement"
import { SortHeader } from "./SortHeader"

export const LeagueTable = ({
  teams,
  sort,
  direction,
  cutCount,
  teamName,
  pageSize,
  selectedRoundCount
}: {
  teams: LeagueStandingDisplayTeam[]
  sort: LeagueSortKey
  direction: SortDirection
  cutCount: LeagueCutCount
  teamName: string | undefined
  pageSize: number
  selectedRoundCount: number
}) => {
  const useCuts = cutCount > 0

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full ${useCuts ? "min-w-[552px]" : "min-w-[440px]"} table-fixed text-left text-sm md:min-w-[820px] md:table-auto md:text-base`}
      >
        <thead className="border-b border-white/10 text-xs uppercase text-white/45">
          <tr>
            <th
              className="w-14 px-1.5 py-3 font-semibold sm:px-2 md:w-28 md:px-5"
              aria-sort={sort === "placement" ? (direction === "asc" ? "ascending" : "descending") : undefined}
            >
              <SortHeader
                href={getLeagueSortHref(teamName, "placement", sort, direction, pageSize, cutCount, selectedRoundCount, "asc")}
                label="Pořadí"
                isActive={sort === "placement"}
                direction={direction}
              />
            </th>
            <th
              className="px-1.5 py-3 font-semibold sm:px-2 md:px-5"
              aria-sort={sort === "team" ? (direction === "asc" ? "ascending" : "descending") : undefined}
            >
              <SortHeader
                href={getLeagueSortHref(teamName, "team", sort, direction, pageSize, cutCount, selectedRoundCount, "asc")}
                label="Tým"
                isActive={sort === "team"}
                direction={direction}
              />
            </th>
            <th
              className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-36 md:px-5"
              aria-sort={sort === "points" ? (direction === "asc" ? "ascending" : "descending") : undefined}
            >
              <SortHeader
                href={getLeagueSortHref(teamName, "points", sort, direction, pageSize, cutCount, selectedRoundCount, "desc")}
                label={
                  <>
                    <span className="md:hidden">Body</span>
                    <span className="hidden md:inline">{useCuts ? "Body po škrtech" : "Body"}</span>
                  </>
                }
                align="right"
                isActive={sort === "points"}
                direction={direction}
              />
            </th>
            <th className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-36 md:px-5">
              <span className="md:hidden">Posl. kvíz</span>
              <span className="hidden md:inline">Poslední kvíz</span>
            </th>
            {useCuts ? (
              <th className="w-28 px-2 py-3 text-right font-semibold md:w-44 md:px-5">
                <span className="md:hidden">Škrt.</span>
                <span className="hidden md:inline">Škrtnuto</span>
              </th>
            ) : null}
            <th
              className="w-20 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-44 md:px-5"
              aria-sort={sort === "rounds" ? (direction === "asc" ? "ascending" : "descending") : undefined}
            >
              <SortHeader
                href={getLeagueSortHref(teamName, "rounds", sort, direction, pageSize, cutCount, selectedRoundCount, "desc")}
                label={
                  <>
                    <span className="md:hidden">Kola</span>
                    <span className="hidden md:inline">Odehraná kola</span>
                  </>
                }
                align="right"
                isActive={sort === "rounds"}
                direction={direction}
              />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {teams.map((team) => (
            <tr key={team.teamName} className="transition hover:bg-white/4">
              <td className="px-1 py-2.5 sm:px-2 md:px-5 md:py-3">
                <div className="flex justify-center md:justify-start">
                  <Placement place={team.placement} />
                </div>
              </td>
              <td className="min-w-0 truncate px-1.5 py-2.5 font-semibold text-white sm:px-2 md:px-5 md:py-3">
                {team.teamName}
              </td>
              <td className="px-1.5 py-2.5 text-right text-base font-bold text-white sm:px-2 md:px-5 md:py-3 md:text-lg">
                {formatNumber(team.displayPoints)}
              </td>
              <td
                className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-5 md:py-3"
                title={team.displayLastQuizDate ? `Kvíz hrán: ${formatDate(team.displayLastQuizDate)}` : undefined}
              >
                {formatNumber(team.displayLastQuizPoints)}
              </td>
              {useCuts ? (
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-white/76 md:px-5 md:py-3">
                  {formatDroppedPoints(team.droppedPoints)}
                </td>
              ) : null}
              <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-5 md:py-3">
                {team.displayQuizCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
