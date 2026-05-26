"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { SlavicAllianceSpinner } from "@/components/ui/SlavicAllianceSpinner"

const defaultTeam = "Slavic Alliance"
const resultsHealthCheckTimeoutMs = 4000

const getResultsUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() || "http://localhost:3001/vysledky"
  const url = new URL(baseUrl)

  if (url.pathname === "/") {
    url.pathname = "/vysledky"
  }

  url.searchParams.set("team", defaultTeam)

  return url.toString()
}

const VysledkyPage = () => {
  const resultsUrl = useMemo(() => getResultsUrl(), [])
  const [isUnavailable, setIsUnavailable] = useState(false)

  const redirectWhenAvailable = useCallback(async () => {
    setIsUnavailable(false)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), resultsHealthCheckTimeoutMs)

    try {
      await fetch(resultsUrl, {
        cache: "no-store",
        mode: "no-cors",
        signal: controller.signal,
      })
      window.location.replace(resultsUrl)
    } catch {
      setIsUnavailable(true)
    } finally {
      window.clearTimeout(timeout)
    }
  }, [resultsUrl])

  useEffect(() => {
    void redirectWhenAvailable()
  }, [redirectWhenAvailable])

  return (
    <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 text-white">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <SlavicAllianceSpinner label="Načítání výsledků" />

        <h1 className="mt-8 text-2xl font-semibold tracking-normal">
          {isUnavailable ? "Výsledky nejsou dostupné" : "Načítáme výsledky"}
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-white/62">
          {isUnavailable
            ? "Samostatná aplikace s výsledky teď neodpovídá. Lokálně zkontrolujte, že běží na portu 3001."
            : "Přesměrováváme vás do tabulky výsledků kvízů."}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {isUnavailable ? (
            <button
              className="inline-flex h-10 items-center rounded-lg bg-sky-100 px-4 text-sm font-semibold text-slate-950 transition hover:bg-white"
              type="button"
              onClick={() => void redirectWhenAvailable()}
            >
              Zkusit znovu
            </button>
          ) : null}
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
