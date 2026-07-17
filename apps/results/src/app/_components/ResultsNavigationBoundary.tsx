"use client"

import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { ResultsNavigationProvider, type PendingResultsNavigation } from "./ResultsNavigationContext"
import { ResultsLoadingSkeleton } from "./ResultsLoadingSkeleton"

type PendingState = PendingResultsNavigation & { origin: string }

const getDefaultPendingNavigation = (searchParams: URLSearchParams): PendingResultsNavigation => {
  const activeView = searchParams.get("view") === "league" ? "league" : "team"

  if (activeView === "league") {
    return {
      activeView,
      title: "Dlouhodobé soutěže",
      teamName: searchParams.get("team") ?? undefined
    }
  }

  const teamName = searchParams.get("team") ?? "Slavic Alliance"

  return {
    activeView,
    title: teamName,
    subtitle: "Výsledky týmu u Hospodského kvízu",
    teamName
  }
}

export const ResultsNavigationBoundary = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState<PendingState | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentLocation = `${pathname}?${searchParams.toString()}`

  // Keep the freshest location available to the click handler without
  // recreating the context value (which would re-render every consumer).
  const locationRef = useRef(currentLocation)
  const searchParamsRef = useRef(searchParams)
  useEffect(() => {
    locationRef.current = currentLocation
    searchParamsRef.current = searchParams
  }, [currentLocation, searchParams])

  const contextValue = useMemo(
    () => ({
      beginResultsNavigation: (navigation: PendingResultsNavigation) => {
        setPending({ ...navigation, origin: locationRef.current })
      },
      beginDefaultResultsNavigation: (navigation: Partial<PendingResultsNavigation> = {}) => {
        setPending({
          ...getDefaultPendingNavigation(new URLSearchParams(searchParamsRef.current)),
          ...navigation,
          origin: locationRef.current
        })
      }
    }),
    []
  )

  // Keep the skeleton visible for the whole client navigation. The URL can
  // update before the server payload has committed; hiding on URL change causes
  // a blank gap between the skeleton and the next page. Successful navigations
  // remount this boundary via its page-level `key`, which clears `pending`.
  const showSkeleton = pending !== null

  return (
    <ResultsNavigationProvider value={contextValue}>
      {showSkeleton && pending ? (
        <ResultsLoadingSkeleton
          activeView={pending.activeView}
          title={pending.title}
          subtitle={pending.subtitle}
          teamName={pending.teamName}
        />
      ) : (
        children
      )}
    </ResultsNavigationProvider>
  )
}
