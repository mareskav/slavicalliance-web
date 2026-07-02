"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"

import { ResultsNavigationProvider, type PendingResultsNavigation } from "./ResultsNavigationContext"
import { ResultsLoadingSkeleton } from "./ResultsLoadingSkeleton"

export const ResultsNavigationBoundary = ({ children }: { children: ReactNode }) => {
  const [pendingNavigation, setPendingNavigation] = useState<PendingResultsNavigation | null>(null)
  const previousChildren = useRef(children)

  useEffect(() => {
    if (previousChildren.current === children) {
      return
    }

    previousChildren.current = children

    if (!pendingNavigation) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPendingNavigation(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [children, pendingNavigation])

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
