import "./globals.css"
import SlavicAllianceHeader from "@/components/layout/header"

export default function RootLayout({
                                       children,
                                   }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="cs">
        <body className="min-h-screen bg-slate-950 text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(96,165,250,0.18),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(244,114,182,0.12),transparent_28%),linear-gradient(160deg,#0b1020,#0f1a38)]" />
        <SlavicAllianceHeader />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
        </main>
        </body>
        </html>
    )
}