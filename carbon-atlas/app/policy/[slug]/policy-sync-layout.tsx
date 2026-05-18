"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export function PolicySyncLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Policy is now derived from the URL by PolicyNetworkProvider (usePathname).
  // No sync needed — just wrap in DashboardLayout.
  return <DashboardLayout>{children}</DashboardLayout>
}
