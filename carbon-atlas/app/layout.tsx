import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"
import { QueryProvider } from "@/providers/QueryProvider"
import { PolicyNetworkProvider } from "@/providers/PolicyNetworkProvider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Carbon Atlas",
    template: "%s · Carbon Atlas",
  },
  description:
    "Carbon Atlas – Explore comprehensive voluntary carbon market data across major registries. Discover 10,000+ carbon credit projects from Verra, Gold Standard, ACR, CAR, and ART TREES, and access digitized methodologies with transparent, auditable trails on the Hedera blockchain.",
  icons: {
    icon: "/hedera-logo.png",
  },
  openGraph: {
    title: "Carbon Atlas",
    description:
      "Carbon Atlas – Explore comprehensive voluntary carbon market data across major registries. Discover 10,000+ carbon credit projects from Verra, Gold Standard, ACR, CAR, and ART TREES, and access digitized methodologies with transparent, auditable trails on the Hedera blockchain.",
    siteName: "Carbon Atlas · CarbonMarketsHQ",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PolicyNetworkProvider>
            <QueryProvider>{children}</QueryProvider>
          </PolicyNetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
