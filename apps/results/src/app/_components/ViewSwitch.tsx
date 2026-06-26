import Link from "next/link"
import { Trophy, Users } from "lucide-react"

import type { ResultView } from "../_lib/types"
import { getViewHref } from "../_lib/navigation"

export const ViewSwitch = ({
  activeView,
  teamName,
  teamIdQuery
}: {
  activeView: ResultView
  teamName?: string
  teamIdQuery?: string | null
  leagueLabel?: string
}) => (
  <nav
    className="inline-flex rounded-lg border border-white/10 bg-white/4 p-1"
    aria-label="Přepnutí výsledků"
  >
    <Link
      href={getViewHref("team", teamName, teamIdQuery)}
      className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        activeView === "team"
          ? "bg-sky-100/14 text-white ring-1 ring-sky-100/18"
          : "text-white/62 hover:bg-white/7 hover:text-white"
      }`}
    >
      <Users className="h-4 w-4" />
      Tým
    </Link>
    <Link
      href={getViewHref("league", teamName)}
      className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        activeView === "league"
          ? "bg-sky-100/14 text-white ring-1 ring-sky-100/18"
          : "text-white/62 hover:bg-white/7 hover:text-white"
      }`}
    >
      <Trophy className="h-4 w-4 shrink-0" />
      Soutěže
    </Link>
  </nav>
)
