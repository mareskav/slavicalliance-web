"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Loader2 } from "lucide-react"
import { useTransition } from "react"

type PageSizeSelectProps = {
  pageSize: number
  options: number[]
}

export const PageSizeSelect = ({ pageSize, options }: PageSizeSelectProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-2 text-sm text-white/58">
      <span>Zobrazit</span>
      <span className="relative">
        <select
          value={pageSize}
          disabled={isPending}
          onChange={(event) => {
            const params = new URLSearchParams(searchParams)
            params.set("page", "1")
            params.set("pageSize", event.target.value)

            startTransition(() => {
              router.push(`/vysledky?${params.toString()}`)
            })
          }}
          className="h-9 appearance-none rounded-lg border border-white/10 bg-slate-950/55 px-3 pr-9 text-sm font-semibold text-white outline-none transition hover:border-sky-200/25 focus:border-sky-200/45 focus:ring-3 focus:ring-sky-200/15 disabled:cursor-wait disabled:opacity-70"
        >
          {options.map((option) => (
            <option key={option} value={option} className="bg-slate-950 text-white">
              {option}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-white/54">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </span>
      <span>na stránku</span>
    </label>
  )
}
