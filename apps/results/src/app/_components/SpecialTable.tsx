import type { LeagueStandingDisplayTeam } from "../_lib/types"
import { formatDate, formatNumber } from "../_lib/formatters"
import { Placement } from "./Placement"

export const SpecialTable = ({ teams }: { teams: LeagueStandingDisplayTeam[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[440px] table-fixed text-left text-sm md:min-w-[720px] md:table-auto md:text-base">
      <thead className="border-b border-white/10 text-xs uppercase text-white/45">
        <tr>
          <th className="w-14 px-1.5 py-3 font-semibold sm:px-2 md:w-28 md:px-5">Pořadí</th>
          <th className="px-1.5 py-3 font-semibold sm:px-2 md:px-5">Tým</th>
          <th className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-36 md:px-5">Body</th>
          <th className="w-16 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-44 md:px-5">
            <span className="md:hidden">Posl. kvíz</span>
            <span className="hidden md:inline">Poslední kvíz</span>
          </th>
          <th className="w-20 px-1.5 py-3 text-right font-semibold sm:px-2 md:w-36 md:px-5">
            <span className="md:hidden">Kola</span>
            <span className="hidden md:inline">Odehraná kola</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/8">
        {teams.map((team) => (
          <tr key={team.teamKey} className="transition hover:bg-white/4">
            <td className="px-1 py-2.5 sm:px-2 md:px-5 md:py-3">
              <div className="flex justify-center md:justify-start">
                <Placement place={team.placement} />
              </div>
            </td>
            <td className="min-w-0 px-1.5 py-2.5 sm:px-2 md:px-5 md:py-3">
              <span className="block truncate font-semibold text-white">{team.teamName}</span>
              {team.duplicateNameCount > 1 ? (
                <span className="block truncate text-xs font-medium text-white/42">
                  {team.teamPub ?? "hospoda neuvedena"}
                </span>
              ) : null}
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
            <td className="px-1.5 py-2.5 text-right font-semibold text-white/76 sm:px-2 md:px-5 md:py-3">
              {team.displayQuizCount}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
