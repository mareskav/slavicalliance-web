"use client"

import { useRouter } from "next/navigation"
import { ChevronDown, Loader2, Users } from "lucide-react"
import { useTransition } from "react"

type TeamSelectOption = {
  teamName: string
  quizCount: number
}

type TeamSelectProps = {
  teams: TeamSelectOption[]
  selectedTeamName: string
}

export const TeamSelect = ({ teams, selectedTeamName }: TeamSelectProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/4.5 p-4 shadow-2xl shadow-sky-950/10 sm:flex-row sm:items-center">
      <label htmlFor="team-select" className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/68">
        <Users className="h-4 w-4 text-sky-100/72" />
        Zobrazit tým
      </label>

      <div className="relative min-w-0 flex-1">
        <select
          id="team-select"
          value={selectedTeamName}
          disabled={isPending}
          onChange={(event) => {
            const nextTeamName = event.target.value

            startTransition(() => {
              router.push(`/vysledky?team=${encodeURIComponent(nextTeamName)}`)
            })
          }}
          className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-slate-950/55 px-3 pr-10 text-sm font-semibold text-white outline-none transition hover:border-sky-200/25 focus:border-sky-200/45 focus:ring-3 focus:ring-sky-200/15 disabled:cursor-wait disabled:opacity-70"
        >
          {teams.map((team) => (
            <option key={team.teamName} value={team.teamName} className="bg-slate-950 text-white">
              {team.teamName}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/54">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
    </div>
  )
}
