"use client"

import Link from "next/link"
import type { MouseEvent, ReactNode } from "react"

import { getViewHref } from "../_lib/navigation"
import { useResultsNavigation } from "./ResultsNavigationContext"

export const TeamLink = ({
  teamName,
  teamIdQuery,
  className,
  children
}: {
  teamName: string
  teamIdQuery: string | null
  className?: string
  children: ReactNode
}) => {
  const resultsNavigation = useResultsNavigation()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    resultsNavigation?.beginResultsNavigation({
      activeView: "team",
      title: teamName,
      subtitle: "Výsledky týmu u Hospodského kvízu",
      teamName
    })
  }

  return (
    <Link href={getViewHref("team", teamName, teamIdQuery)} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
