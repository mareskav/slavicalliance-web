"use client"

import { createContext, useContext } from "react"

import type { ResultView } from "../_lib/types"

export type PendingResultsNavigation = {
  activeView: ResultView
  title: string
  subtitle?: string
  teamName?: string
}

type ResultsNavigationContextValue = {
  beginResultsNavigation: (navigation: PendingResultsNavigation) => void
}

const ResultsNavigationContext = createContext<ResultsNavigationContextValue | null>(null)

export const ResultsNavigationProvider = ResultsNavigationContext.Provider

export const useResultsNavigation = () => useContext(ResultsNavigationContext)
