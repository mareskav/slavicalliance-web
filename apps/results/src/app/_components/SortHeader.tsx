import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import type { SortDirection } from "../_lib/types"

const SortIndicator = ({
  isActive,
  direction
}: {
  isActive: boolean
  direction: SortDirection
}) => {
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown

  return (
    <Icon
      className={`h-3.5 w-3.5 ${isActive ? "text-sky-100/86" : "text-white/28"}`}
      aria-hidden="true"
    />
  )
}

export const SortHeader = ({
  href,
  label,
  title,
  align = "left",
  isActive,
  direction
}: {
  href: string
  label: ReactNode
  title?: string
  align?: "left" | "right"
  isActive: boolean
  direction: SortDirection
}) => (
  <Link
    href={href}
    title={title}
    aria-label={title}
    className={`inline-flex w-full items-center gap-1.5 transition hover:text-white ${align === "right" ? "justify-end" : "justify-start"}`}
  >
    <span>{label}</span>
    <SortIndicator isActive={isActive} direction={direction} />
  </Link>
)
