import { BarChart3, CalendarDays, Trophy, type LucideIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { AchievementBadge } from "./achievement-badge"
import { TeamMark } from "./team-mark"

type NavItem = {
  id: "home" | "quizzes" | "results"
  href: string
  label: string
  icon: LucideIcon
}

const achievementLabel = "3. Jarní liga Prahy 2026"

export type SlavicAllianceHeaderProps = {
  siteHref?: string
  resultsHref?: string
  logoSrc?: string
  activeItem?: NavItem["id"]
}

const joinUrl = (base: string, pathname: string) => {
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return new URL(pathname, base).toString()
  }

  return pathname
}

export const SlavicAllianceHeader = ({
  siteHref = "/",
  resultsHref = "/vysledky",
  logoSrc,
  activeItem
}: SlavicAllianceHeaderProps) => {
  const navItems: NavItem[] = [
    { id: "home", href: joinUrl(siteHref, "/"), label: "Domů", icon: Trophy },
    { id: "results", href: resultsHref, label: "Výsledky", icon: BarChart3 },
    { id: "quizzes", href: joinUrl(siteHref, "/kvizy"), label: "Kvízy", icon: CalendarDays }
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070c]/82 backdrop-blur-xl supports-backdrop-filter:bg-[#05070c]/72">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-200/20 to-transparent" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6 md:h-18 md:flex-row md:items-center md:py-0 lg:px-8">
        <a
          href={joinUrl(siteHref, "/")}
          className="w-fit min-w-0 transition-transform hover:scale-[1.01]"
        >
          <TeamMark logoSrc={logoSrc} />
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeItem

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "h-10 rounded-xl px-4 text-sm text-white/75 hover:bg-sky-100/10 hover:text-white",
                  isActive && "bg-sky-100/12 text-white ring-1 ring-sky-100/20"
                )}
              >
                <a
                  href={item.href}
                  className="flex items-center gap-2"
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              </Button>
            )
          })}
        </nav>

        <nav className="flex w-fit gap-0.5 md:hidden" aria-label="Hlavní navigace">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeItem

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "h-10 min-w-0 rounded-lg px-2 text-white/78 hover:bg-sky-100/10 hover:text-white",
                  isActive && "bg-sky-100/12 text-white ring-1 ring-sky-100/20"
                )}
              >
                <a
                  href={item.href}
                  className="flex min-w-0 items-center gap-1.5 text-xs"
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              </Button>
            )
          })}
        </nav>

        <div className="relative w-fit max-w-full self-center md:ml-auto md:self-auto">
          <AchievementBadge label={achievementLabel} />
        </div>
      </div>
    </header>
  )
}
