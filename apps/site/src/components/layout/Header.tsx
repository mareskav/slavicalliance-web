"use client"

import { SlavicAllianceHeader as SharedSlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"
import { usePathname } from "next/navigation"

export const SlavicAllianceHeader = ({ achievementLabel }: { achievementLabel?: string | null }) => {
  const pathname = usePathname()
  const activeItem = pathname.startsWith("/kvizy")
    ? "quizzes"
    : pathname.startsWith("/vysledky")
      ? "results"
      : pathname.startsWith("/napsali-o-nas")
        ? "press"
        : "home"
  const resultsHref = "/vysledky?team=Slavic%20Alliance"

  return (
    <SharedSlavicAllianceHeader
      achievementLabel={achievementLabel}
      activeItem={activeItem}
      resultsHref={resultsHref}
    />
  )
}
