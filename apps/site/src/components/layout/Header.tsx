import Link from "next/link"
import { BarChart3, CalendarDays, Trophy } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"
import { TeamMark } from "@/components/layout/TeamMark"

const navItems = [
  { href: "/", label: "Domů", icon: Trophy },
  { href: "/kvizy", label: "Kvízy", icon: CalendarDays },
  { href: "/vysledky", label: "Výsledky", icon: BarChart3 },
]

export const SlavicAllianceHeader = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070c]/82 backdrop-blur-xl supports-backdrop-filter:bg-[#05070c]/72">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-200/20 to-transparent" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 md:h-18 md:flex-row md:items-center md:py-0 lg:px-8">
        <Link href="/" className="w-fit min-w-0 transition-transform hover:scale-[1.01]">
          <TeamMark />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="h-10 rounded-xl px-4 text-sm text-white/75 hover:bg-sky-100/10 hover:text-white"
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>

        <nav className="flex w-fit gap-0.5 md:hidden" aria-label="Hlavní navigace">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="h-10 min-w-0 rounded-lg px-2 text-white/78 hover:bg-sky-100/10 hover:text-white"
              >
                <Link href={item.href} className="flex min-w-0 items-center gap-1.5 text-xs">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
