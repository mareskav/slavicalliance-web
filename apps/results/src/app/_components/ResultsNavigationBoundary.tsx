"use client"

import { ReactNode, useMemo, useState } from "react"

import { ResultsNavigationProvider, type PendingResultsNavigation } from "./ResultsNavigationContext"
import { ResultsLoadingSkeleton } from "./ResultsLoadingSkeleton"

export const ResultsNavigationBoundary = ({ children }: { children: ReactNode }) => {
  const [pendingNavigation, setPendingNavigation] = useState<PendingResultsNavigation | null>(null)

  const contextValue = useMemo(
    () => ({
      beginResultsNavigation: setPendingNavigation
    }),
    []
  )

  return (
    <ResultsNavigationProvider value={contextValue}>
      {pendingNavigation ? (
        <ResultsLoadingSkeleton
          activeView={pendingNavigation.activeView}
          title={pendingNavigation.title}
          subtitle={pendingNavigation.subtitle}
          teamName={pendingNavigation.teamName}
        />
      ) : (
        children
      )}
    </ResultsNavigationProvider>
  )
}
