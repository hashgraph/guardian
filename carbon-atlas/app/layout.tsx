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
  title: "Carbon Atlas",
  description:
    "Traceable record of verified emission reductions under Gold Standard MECD v1.2 — Metered & Measured Energy Cooking Devices, anchored on Hedera via Guardian",
  icons: {
    icon: "/hedera-logo.png",
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
