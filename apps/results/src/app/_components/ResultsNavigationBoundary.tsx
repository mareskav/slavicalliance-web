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

  // Show the skeleton only while we are still on the page the navigation
  // started from. As soon as the URL changes the destination has committed, so
  // we fall back to `children`. Deriving this during render (instead of
  // resetting via an effect) means the skeleton clears reliably even when the
  // boundary is not remounted by a changing `key` - e.g. redirects to a
  // canonical team URL, or landing on a page with the same navigation key.
  const showSkeleton = pending !== null && pending.origin === currentLocation

  // Drop stale pending state once navigation has completed, so navigating back
  // to the origin URL later does not re-trigger the skeleton. Deferred to keep
  // it out of the synchronous effect body; the skeleton is already hidden via
  // `showSkeleton`, so this has no visual effect.
  useEffect(() => {
    if (!pending || pending.origin === currentLocation) {
      return
    }

    const timeoutId = window.setTimeout(() => setPending(null), 0)

    return () => window.clearTimeout(timeoutId)
  }, [pending, currentLocation])

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
