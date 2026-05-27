"use client"

import { SlavicAllianceHeader as SharedSlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"
import { usePathname } from "next/navigation"

export const SlavicAllianceHeader = () => {
  const pathname = usePathname()
  const activeItem = pathname.startsWith("/kvizy") ? "quizzes" : pathname.startsWith("/vysledky") ? "results" : "home"
  const resultsHref =
    process.env.NEXT_PUBLIC_RESULTS_APP_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001/vysledky" : "/vysledky")

  return <SharedSlavicAllianceHeader activeItem={activeItem} resultsHref={resultsHref} />
}
