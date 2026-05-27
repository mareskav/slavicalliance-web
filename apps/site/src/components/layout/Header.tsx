"use client"

import { SlavicAllianceHeader as SharedSlavicAllianceHeader } from "@repo/ui/components/layout/slavic-alliance-header"
import { usePathname } from "next/navigation"

export const SlavicAllianceHeader = () => {
  const pathname = usePathname()
  const activeItem = pathname.startsWith("/kvizy") ? "quizzes" : pathname.startsWith("/vysledky") ? "results" : "home"

  return <SharedSlavicAllianceHeader activeItem={activeItem} />
}
