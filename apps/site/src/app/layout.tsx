import type { Metadata } from "next"

import "./globals.css"
import { SlavicAllianceFooter } from "@repo/ui/components/layout/slavic-alliance-footer"
import { SlavicAllianceHeader } from "@/components/layout/Header"

export const metadata: Metadata = {
    icons: {
        icon: "/icon.png",
    },
}

const RootLayout = ({
                        children,
                    }: Readonly<{ children: React.ReactNode }>) => {
    return (
        <html lang="cs">
        <body className="flex min-h-screen flex-col bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />
        <SlavicAllianceHeader />
        <main className="mx-auto w-full max-w-7xl grow px-4 py-8 sm:px-6 lg:px-8">
            {children}
        </main>
        <SlavicAllianceFooter />
        </body>
        </html>
    )
}

export default RootLayout
