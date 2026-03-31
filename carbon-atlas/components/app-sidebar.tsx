"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  IconChartBar,
  IconChevronRight,
  IconDashboard,
  IconExternalLink,
  IconGlobe,
  IconList,
  IconSearch,
  IconSitemap,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"
import { getSupportedNetworks } from "@/lib/policies/registry"

const navMarket = [
  { title: "Market Overview", url: "/market", icon: IconGlobe },
  { title: "All Projects", url: "/market/projects", icon: IconSitemap },
  { title: "Project Developers", url: "/market/developers", icon: IconUsers },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { policy, policies } = usePolicyNetwork()
  const pathname = usePathname()
  const base = `/policy/${policy.slug}`

  const cmhqLogo =
    mounted && resolvedTheme === "dark"
      ? "/cmhq-logo-dark.png"
      : "/cmhq-logo-light.png"

  const navMain = [
    { title: "Dashboard", url: `${base}/dashboard`, icon: IconDashboard },
    { title: "Issuances", url: `${base}/issuances`, icon: IconList },
    { title: "Projects", url: `${base}/projects`, icon: IconSitemap },
    { title: "Analytics", url: `${base}/analytics`, icon: IconChartBar },
    { title: "Verify", url: `${base}/verify`, icon: IconSearch },
  ]

  const navSecondary = [
    {
      title: "Guardian",
      url: "https://github.com/hashgraph/guardian",
      icon: IconExternalLink,
    },
    {
      title: "Digitize Methodologies",
      url: "https://guardian.hedera.com/methodology-digitization/methodology-digitization-handbook",
      icon: IconExternalLink,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href={`${base}/dashboard`}>
                <Image
                  src="/hedera-logo.png"
                  alt="Hedera"
                  width={20}
                  height={20}
                  className="!size-5 rounded-full"
                />
                <span className="text-base font-semibold">Carbon Atlas</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Methodology selector */}
        <SidebarGroup>
          <SidebarGroupLabel>Methodologies</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {policies.map((p) => {
                const isActive = policy.slug === p.slug
                const nets = getSupportedNetworks(p)
                return (
                  <SidebarMenuItem key={p.slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={p.fullName}
                    >
                      <Link href={`/policy/${p.slug}/dashboard`}>
                        <div className="flex items-center gap-2 w-full min-w-0">
                          <span className="truncate font-medium">
                            {p.name}
                          </span>
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            {nets.map((n) => (
                              <span
                                key={n}
                                className={`inline-flex size-1.5 rounded-full ${
                                  n === "mainnet"
                                    ? "bg-green-500"
                                    : "bg-amber-500"
                                }`}
                                title={n}
                              />
                            ))}
                            {isActive && (
                              <IconChevronRight className="size-3 opacity-50" />
                            )}
                          </div>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain items={navMain} />

        {/* Market Explorer section */}
        <SidebarGroup>
          <SidebarGroupLabel>Market Explorer</SidebarGroupLabel>
          <SidebarMenu>
            {navMarket.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url || (item.url !== "/market" && pathname.startsWith(item.url))}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <NavSecondary items={navSecondary} className="mt-auto" />
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
