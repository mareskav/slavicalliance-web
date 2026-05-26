"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw } from "lucide-react"

const ResultsErrorPage = ({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-lg border border-white/10 bg-white/4.5 p-8 text-center shadow-2xl shadow-sky-950/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-100/20 bg-amber-100/10 text-amber-100">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">Výsledky se nepodařilo načíst</h1>
        <p className="mt-3 text-white/65">
          Databáze nebo server výsledků teď neodpovídá. Zkuste načtení znovu za chvíli.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-100 px-4 text-sm font-semibold text-slate-950 transition hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            Zkusit znovu
          </button>
          <Link
            href="/vysledky?team=Slavic%20Alliance"
            className="inline-flex h-10 items-center rounded-lg border border-white/10 px-4 text-sm font-medium text-sky-100 transition hover:border-sky-200/30 hover:bg-sky-100/10 hover:text-white"
          >
            Zpět na výsledky
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ResultsErrorPage
