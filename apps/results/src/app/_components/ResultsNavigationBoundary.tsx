"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { ResultsNavigationProvider, type PendingResultsNavigation } from "./ResultsNavigationContext"
import { ResultsLoadingSkeleton } from "./ResultsLoadingSkeleton"

export const ResultsNavigationBoundary = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pendingNavigation, setPendingNavigation] = useState<PendingResultsNavigation | null>(null)
  const currentUrl = `${pathname}?${searchParams.toString()}`

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPendingNavigation(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentUrl])

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
