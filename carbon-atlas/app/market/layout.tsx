import type { Metadata } from "next"
import * as React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

export const metadata: Metadata = {
  title: "Market Explorer",
  description:
    "Browse 10,570+ carbon offset projects across Verra, Gold Standard, ACR, CAR and ART TREES. Filter by registry, country, category, and CORSIA eligibility. Explore 3,700+ project developers and 2.47B credits issued.",
  openGraph: {
    title: "Market Explorer · Carbon Atlas",
    description:
      "Browse 10,570+ carbon offset projects across Verra, Gold Standard, ACR, CAR and ART TREES. Filter by registry, country, category, and CORSIA eligibility.",
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
      <div className="border-t px-4 py-3 lg:px-6">
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Data is sourced from public registry records and provided on an as-is
          basis. The authoritative source of truth for all project and credit
          information is the issuing registry. CarbonMarketsHQ, Hedera, and
          Guardian are not liable for any inaccuracies, omissions, or
          interpretations derived from this data.
        </p>
      </div>
    </DashboardLayout>
  )
}
