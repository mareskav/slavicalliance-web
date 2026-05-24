"use client"

import { useEffect } from "react"

const defaultTeam = "Slavic Alliance"

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
  const resultsUrl = getResultsUrl()

  useEffect(() => {
    window.location.replace(resultsUrl)
  }, [resultsUrl])

  return (
    <main className="font-sans text-white">
      <h1 className="text-3xl font-bold">Výsledky kvízů</h1>
      <p className="mt-3 text-white/70">
        Přesměrováváme do samostatné aplikace s výsledky.
      </p>
      <a className="mt-6 inline-flex text-sky-100 hover:text-white" href={resultsUrl}>
        Otevřít výsledky
      </a>
    </main>
  )
}

export default VysledkyPage
