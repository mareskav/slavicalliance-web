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
      </div>
    </section>
  )
}

export default VysledkyPage
