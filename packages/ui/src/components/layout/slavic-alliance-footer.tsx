import { BarChart3, CalendarDays, Heart, Trophy } from "lucide-react"

export type SlavicAllianceFooterProps = {
  siteHref?: string
  resultsHref?: string
}

const joinUrl = (base: string, pathname: string) => {
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return new URL(pathname, base).toString()
  }

  return pathname
}

export const SlavicAllianceFooter = ({
  siteHref = "/",
  resultsHref = "/vysledky"
}: SlavicAllianceFooterProps) => {
  const navItems = [
    { href: joinUrl(siteHref, "/"), label: "Domů", icon: Trophy },
    { href: joinUrl(siteHref, "/kvizy"), label: "Kvízy", icon: CalendarDays },
    { href: resultsHref, label: "Výsledky", icon: BarChart3 }
  ]

  return (
    <footer className="relative mt-auto border-t border-white/10 bg-[#05070c]/82 backdrop-blur-xl supports-backdrop-filter:bg-[#05070c]/72">
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-sky-200/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <a
              href={joinUrl(siteHref, "/")}
              className="w-fit text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
            >
              Slavic Alliance
            </a>
            <p className="text-xs text-white/44">
              Oficiální týmový web Slavic Alliance. Výsledky a statistiky sbíráme z veřejných
              kvízových dat a vlastních záznamů.
            </p>
          </div>

          <nav className="flex items-center gap-4" aria-label="Patičková navigace">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 text-sm text-white/56 transition-colors hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              )
            })}
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Slavic Alliance. Všechna práva vyhrazena.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-white/28">
            Vyrobeno s <Heart className="h-3 w-3 fill-red-400/60 text-red-400/60" /> pro náš tým
          </p>
        </div>
      </div>
    </footer>
  )
}
