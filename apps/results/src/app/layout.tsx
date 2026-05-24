import type { Metadata } from "next"
import Link from "next/link"

import "./globals.css"

export const metadata: Metadata = {
  title: "Výsledky kvízů | Slavic Alliance",
  description: "Týmový přehled výsledků hospodských kvízů.",
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />

        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070c]/82 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-lg font-bold tracking-tight text-white">
              Slavic Alliance
            </Link>
            <span className="rounded-full border border-sky-100/15 bg-sky-100/10 px-3 py-1 text-sm text-sky-100/82">
              Výsledky
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  )
}

export default RootLayout
