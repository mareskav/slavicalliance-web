import type { Metadata } from "next"
import { Suspense } from "react"

import { ResultsLoadingSkeleton } from "./_components/ResultsLoadingSkeleton"
import { ResultsRoute } from "./ResultsRoute"

export const metadata: Metadata = {
  title: "Výsledky kvízů",
  description: "Týmový přehled výsledků hospodských kvízů.",
  alternates: { canonical: "/vysledky" }
}

const ResultsPage = () => (
  <Suspense fallback={<ResultsLoadingSkeleton activeView="league" title="Dlouhodobé soutěže" />}>
    <ResultsRoute />
  </Suspense>
)

export default ResultsPage
