import type { Metadata } from "next"

import "./globals.css"
import { AppChrome } from "@/components/layout/AppChrome"

const siteUrl = "https://slavicalliance.cz"
const siteDescription =
  "Slavic Alliance je kvízový tým s úspěchy v pražských ligách, finále Hospodského kvízu i celostátních soutěžích."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Slavic Alliance",
    template: "%s | Slavic Alliance"
  },
  description: siteDescription,
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  verification: {
    google: "eJyrMkDw10BlQCODsac716DMRyQQLAi3CH5nyqWACHA"
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: siteUrl,
    siteName: "Slavic Alliance",
    title: "Slavic Alliance",
    description: siteDescription,
    images: [
      {
        url: "/icon.png",
        width: 1024,
        height: 1024,
        alt: "Slavic Alliance"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Slavic Alliance",
    description: siteDescription,
    images: ["/icon.png"]
  },
  icons: {
    icon: "/icon.png"
  }
}

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="cs">
      <body className="flex min-h-screen flex-col bg-[#05070c] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(38,87,124,0.24),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(30,58,84,0.18),transparent_32%),linear-gradient(160deg,#040507,#08111b_46%,#111315)]" />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  )
}

export default RootLayout
