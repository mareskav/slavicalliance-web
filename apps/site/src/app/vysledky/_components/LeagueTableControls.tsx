import Link from "next/link"

import { leagueCutOptions, type LeagueCutCount } from "../_lib/constants"
import { getLeagueCutsHref } from "../_lib/navigation"
import type { LeagueSortKey, SortDirection } from "../_lib/types"
import { LeagueRoundSelect } from "./LeagueRoundSelect"

export const LeagueTableControls = ({
  teamName,
  pageSize,
  sort,
  direction,
  cutCount,
  selectedRoundCount,
  playedRounds,
  currentPage,
  leagueId
}: {
  teamName: string | undefined
  pageSize: number
  sort: LeagueSortKey
  direction: SortDirection
  cutCount: LeagueCutCount
  selectedRoundCount: number
  playedRounds: number
  currentPage: number
  leagueId?: string
}) => {
  const useCuts = cutCount > 0

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[230px]">
        <p className="text-sm font-semibold text-white">Odehraná kola</p>
        <LeagueRoundSelect selectedRoundCount={selectedRoundCount} playedRounds={playedRounds} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[460px]">
        <div>
          <p className="text-sm font-semibold text-white">Škrtání výsledků</p>
          <p className="mt-1 text-sm text-white/56">
            {useCuts
              ? `Škrtá se ${cutCount === 1 ? "1 nejhorší výsledek" : `${cutCount} nejhorší výsledky`}`
              : "Počítají se všechny výsledky"}
          </p>
        </div>
        <div
          className="inline-flex h-10 shrink-0 rounded-lg border border-white/10 bg-white/5 p-1"
          aria-label="Počet škrtaných výsledků"
        >
          {leagueCutOptions.map((option) => (
            <Link
              key={option}
              href={getLeagueCutsHref(teamName, pageSize, sort, direction, option, selectedRoundCount, currentPage, leagueId)}
              scroll={false}
              aria-current={option === cutCount ? "true" : undefined}
              className={`inline-flex min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold transition ${
                option === cutCount
                  ? "bg-sky-300/28 text-white shadow-sm shadow-sky-950/30 ring-1 ring-sky-100/38"
                  : "text-white/58 hover:bg-white/7 hover:text-white"
              }`}
            >
              {option === 0 ? "Vyp." : option}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
