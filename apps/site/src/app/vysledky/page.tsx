"use client"

import { useEffect, useMemo } from "react"

import { SlavicAllianceSpinner } from "@/components/ui/SlavicAllianceSpinner"

const defaultTeam = "Slavic Alliance"

const getResultsUrl = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() || "http://localhost:3001/vysledky"
  const url = new URL(baseUrl)

  if (url.pathname === "/") {
    url.pathname = "/vysledky"
  }

  url.searchParams.set("team", defaultTeam)

  return url.toString()
}

const VysledkyPage = () => {
  const resultsUrl = useMemo(() => getResultsUrl(), [])

  useEffect(() => {
    window.location.replace(resultsUrl)
  }, [resultsUrl])

  return (
    <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 text-white">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <SlavicAllianceSpinner label="Načítání výsledků" />

        <h1 className="mt-8 text-2xl font-semibold tracking-normal">Načítáme výsledky</h1>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-sm font-medium text-sky-100 transition hover:border-sky-200/30 hover:bg-sky-100/10 hover:text-white"
            href={resultsUrl}
          >
            Otevřít výsledky
          </a>
        </div>
      </div>
    </section>
  )
}

export default VysledkyPage
