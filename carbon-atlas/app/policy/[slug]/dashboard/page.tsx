"use client"

import * as React from "react"
import { SectionCards } from "@/components/section-cards"
import { DashboardCharts } from "@/components/dashboard-charts"
import { RecentIssuancesTable } from "./recent-issuances"
import { RecentProjectsTable } from "./recent-projects"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

export default function Page() {
  const { policy } = usePolicyNetwork()
  const recentTable = policy.dashboard.recentTable ?? "issuances"

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <DashboardCharts />
      <div className="px-4 lg:px-6">
        {recentTable === "projects" ? <RecentProjectsTable /> : <RecentIssuancesTable />}
      </div>
    </div>
  )
}
