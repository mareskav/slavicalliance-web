"use client"

import { usePathname } from "next/navigation"

import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { SlavicAllianceHeader } from "@/components/layout/Header"

export const AppChrome = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const pathname = usePathname()
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <SlavicAllianceHeader />
      <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <SlavicAllianceFooter />
    </>
  )
}
