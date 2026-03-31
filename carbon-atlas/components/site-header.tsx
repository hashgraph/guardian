"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  IconBrandGithub,
  IconChevronDown,
  IconMoon,
  IconSun,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"
import type { NetworkId } from "@/lib/policies/types"
import { supportsNetwork } from "@/lib/policies/registry"

const ALL_NETWORKS: NetworkId[] = ["mainnet", "testnet"]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {mounted && resolvedTheme === "dark" ? (
        <IconSun className="size-4" />
      ) : (
        <IconMoon className="size-4" />
      )}
    </Button>
  )
}

function NetworkSelector() {
  const { network, setNetwork, policy } = usePolicyNetwork()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5">
          <span
            className={`inline-flex size-2 rounded-full ${
              network === "mainnet" ? "bg-green-500" : "bg-amber-500"
            }`}
          />
          Hedera {network === "mainnet" ? "Mainnet" : "Testnet"}
          <IconChevronDown className="size-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={network}
          onValueChange={(v) => setNetwork(v as NetworkId)}
        >
          {ALL_NETWORKS.map((net) => {
            const supported = supportsNetwork(policy, net)
            return (
              <DropdownMenuRadioItem
                key={net}
                value={net}
                disabled={!supported}
                className={!supported ? "opacity-50" : ""}
              >
                <span
                  className={`inline-flex size-2 rounded-full mr-2 ${
                    net === "mainnet" ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {net === "mainnet" ? "Mainnet" : "Testnet"}
                {!supported && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({policy.name} not deployed)
                  </span>
                )}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteHeader() {
  const { policy } = usePolicyNetwork()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-col min-w-0">
          <h1 className="text-base font-medium leading-tight truncate">
            {policy.fullName}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {policy.standard} {policy.name}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <NetworkSelector />
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <a
              href="https://github.com/hashgraph/guardian"
              rel="noopener noreferrer"
              target="_blank"
              aria-label="GitHub"
            >
              <IconBrandGithub className="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
