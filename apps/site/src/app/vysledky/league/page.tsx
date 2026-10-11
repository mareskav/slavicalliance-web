import type { Metadata } from "next"
import { Suspense } from "react"

import { ResultsLoadingSkeleton } from "../_components/ResultsLoadingSkeleton"
import { ResultsRoute } from "../ResultsRoute"

export const metadata: Metadata = {
  title: "Výsledky kvízů – liga",
  alternates: { canonical: "/vysledky" }
}

const LeaguePage = () => (
  <Suspense fallback={<ResultsLoadingSkeleton activeView="league" title="Liga" />}>
    <ResultsRoute forceView="league" />
  </Suspense>
)

export default LeaguePage
