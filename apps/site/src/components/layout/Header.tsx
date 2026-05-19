import Link from "next/link"
import { BarChart3, CalendarDays, Menu, Trophy } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@repo/ui/components/ui/sheet"
import { TeamMark } from "@/components/layout/TeamMark"

const navItems = [
  { href: "/", label: "Domů", icon: Trophy },
  { href: "/kvizy", label: "Kvízy", icon: CalendarDays },
  { href: "/statistiky", label: "Statistiky", icon: BarChart3 },
]

export const SlavicAllianceHeader = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070c]/82 backdrop-blur-xl supports-[backdrop-filter]:bg-[#05070c]/72">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/20 to-transparent" />

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

        <div className="hidden items-center gap-2 md:flex">
          {/*<Button*/}
          {/*  variant="outline"*/}
          {/*  className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-sky-100/10 hover:text-white"*/}
          {/*>*/}
          {/*  Poslední kvíz*/}
          {/*</Button>*/}
          <Button className="rounded-xl bg-white text-neutral-950 hover:bg-white/90">
            Profil týmu
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl text-white hover:bg-sky-100/10 hover:text-white"
              aria-label="Otevřít navigaci"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="border-white/10 bg-[#05070c]/95 text-white"
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
                      className="justify-start rounded-xl text-base text-white/80 hover:bg-sky-100/10 hover:text-white"
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
                  className="justify-start rounded-xl border-white/15 bg-white/5 text-white hover:bg-sky-100/10 hover:text-white"
                >
                  Poslední kvíz
                </Button>
                <Button className="justify-start rounded-xl bg-white text-neutral-950 hover:bg-white/90">
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
