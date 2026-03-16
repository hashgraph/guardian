"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import {
  IconChartBar,
  IconDashboard,
  IconExternalLink,
  IconList,
  IconSearch,
  IconSitemap,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    { title: "Issuances", url: "/issuances", icon: IconList },
    { title: "Projects", url: "/projects", icon: IconSitemap },
    { title: "Analytics", url: "/analytics", icon: IconChartBar },
    { title: "Verify", url: "/verify", icon: IconSearch },
  ],
  navSecondary: [
    {
      title: "Methodology",
      url: "https://globalgoals.goldstandard.org/431_ee_ics_methodology-for-metered-measured-energy-cooking-devices/",
      icon: IconExternalLink,
    },
    {
      title: "Guardian",
      url: "https://github.com/hashgraph/guardian",
      icon: IconExternalLink,
    },
    {
      title: "Hedera Policy",
      url: "https://docs.hedera.com/guardian/guardian/demo-guide/carbon-offsets/metered-energy-cooking-device-mecd-methodology",
      icon: IconExternalLink,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const cmhqLogo = mounted && resolvedTheme === "dark"
    ? "/cmhq-logo-dark.png"
    : "/cmhq-logo-light.png"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <Image src="/hedera-logo.png" alt="Hedera" width={20} height={20} className="!size-5 rounded-full" />
                <span className="text-base font-semibold">MECD Indexer</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Built by</span>
          <a
            href="https://carbonmarketshq.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cmhqLogo}
              alt="CarbonMarketsHQ"
              width={120}
              height={24}
              className="h-5 w-auto"
            />
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
