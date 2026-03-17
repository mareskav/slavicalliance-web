import Image from "next/image"
import Link from "next/link"
import { BarChart3, CalendarDays, Menu, Trophy } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@repo/ui/components/ui/sheet"

const navItems = [
  { href: "/", label: "Domů", icon: Trophy },
  { href: "/kvizy", label: "Kvízy", icon: CalendarDays },
  { href: "/statistiky", label: "Statistiky", icon: BarChart3 },
]

function TeamMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,197,253,0.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(244,114,182,0.18),transparent_40%)]" />
        <Image
          src="/slavic_alliance-spin.svg"
          alt="Slavic Alliance"
          width={44}
          height={44}
          className="relative z-10 h-9 w-9 object-contain"
          priority
        />
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium uppercase tracking-[0.24em] text-white/55">
          Quiz team
        </div>
        <div className="truncate text-lg font-semibold tracking-tight text-white">
          Slavic Alliance
        </div>
      </div>
    </div>
  )
}

export default function SlavicAllianceHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/65">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="transition-transform hover:scale-[1.01]">
          <TeamMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="h-10 rounded-xl px-4 text-sm text-white/75 hover:bg-white/10 hover:text-white"
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="outline"
            className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            Poslední kvíz
          </Button>
          <Button className="rounded-xl bg-white text-slate-950 hover:bg-white/90">
            Profil týmu
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl text-white hover:bg-white/10 hover:text-white"
              aria-label="Otevřít navigaci"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-white/10 bg-slate-950/95 text-white"
          >
            <div className="mt-6 flex flex-col gap-6">
              <TeamMark />

              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className="justify-start rounded-xl text-base text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  )
                })}
              </div>

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <Button
                  variant="outline"
                  className="justify-start rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Poslední kvíz
                </Button>
                <Button className="justify-start rounded-xl bg-white text-slate-950 hover:bg-white/90">
                  Profil týmu
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
