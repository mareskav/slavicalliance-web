import type { Metadata } from "next"

import "./globals.css"
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
        <body className="min-h-screen bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />
        <SlavicAllianceHeader />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
        </main>
        </body>
        </html>
    )
}

export default RootLayout
