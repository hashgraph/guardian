import * as React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SectionCards } from "@/components/section-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import { RecentIssuancesTable } from "./recent-issuances"

export default function Page() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <DashboardCharts />
        <div className="px-4 lg:px-6">
          <RecentIssuancesTable />
        </div>
      </div>
    </DashboardLayout>
  )
}
