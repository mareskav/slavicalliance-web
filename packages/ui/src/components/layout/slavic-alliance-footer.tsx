import { BarChart3, CalendarDays, Heart, Trophy } from "lucide-react"

export type SlavicAllianceFooterProps = {
  siteHref?: string
  resultsHref?: string
  logoSrc?: string
}

const joinUrl = (base: string, pathname: string) => {
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return new URL(pathname, base).toString()
  }

  return pathname
}

export const SlavicAllianceFooter = ({
  siteHref = "/",
  resultsHref = "/vysledky",
  logoSrc = "/slavic_alliance.svg"
}: SlavicAllianceFooterProps) => {
  const navItems = [
    { href: joinUrl(siteHref, "/"), label: "Domů", icon: Trophy },
    { href: joinUrl(siteHref, "/kvizy"), label: "Kvízy", icon: CalendarDays },
    { href: resultsHref, label: "Výsledky", icon: BarChart3 }
  ]

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/10 bg-[#05070c]">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-200/28 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-sky-300/8 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="max-w-2xl">
            <a
              href={joinUrl(siteHref, "/")}
              className="flex w-fit items-center gap-3 transition-opacity hover:opacity-85"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(14,165,233,0.16)]">
                <img
                  src={logoSrc}
                  alt="Slavic Alliance"
                  width={42}
                  height={42}
                  className="h-10 w-10 object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tracking-tight text-white">
                  Slavic Alliance
                </span>
                <span className="block text-xs font-medium uppercase tracking-[0.18em] text-sky-200/58">
                  kvízový tým
                </span>
              </span>
            </a>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/54">
              Oficiální týmový web Slavic Alliance. Výsledky a statistiky sbíráme z veřejných
              kvízových dat a vlastních záznamů.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Archiv výsledků", "Týmové statistiky", "Hospodské kvízy"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/58"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <nav
            className="grid w-full gap-2 sm:grid-cols-3 md:w-auto md:min-w-72 md:grid-cols-1"
            aria-label="Patičková navigace"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-white/68 transition-colors hover:border-sky-200/24 hover:bg-sky-100/8 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-sky-100/62 transition-colors group-hover:text-sky-100" />
                    {item.label}
                  </span>
                  <span className="text-white/24 transition-colors group-hover:text-white/56">
                    /
                  </span>
                </a>
              )
            })}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/38">
            © {new Date().getFullYear()} Slavic Alliance. Všechna práva vyhrazena.
          </p>
          <p className="flex items-center gap-1.5 text-white/34">
            Vyrobeno s <Heart className="h-3 w-3 fill-red-400/60 text-red-400/60" /> pro náš tým
          </p>
        </div>
      </div>
    </footer>
  )
}
