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
import { useNetwork } from "@/providers/NetworkProvider"
import type { NetworkId } from "@/lib/config/networks"

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
  const { network, setNetwork } = useNetwork()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5">
          <span className={`inline-flex size-2 rounded-full ${network === "mainnet" ? "bg-green-500" : "bg-amber-500"}`} />
          Hedera {network === "mainnet" ? "Mainnet" : "Testnet"}
          <IconChevronDown className="size-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={network} onValueChange={(v) => setNetwork(v as NetworkId)}>
          <DropdownMenuRadioItem value="mainnet">
            Mainnet
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="testnet">
            Testnet
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-col">
          <h1 className="text-base font-medium leading-tight">
            Methodology for Metered & Measured Energy Cooking Devices
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Gold Standard MECD v1.2 — ICVCM CCP-approved methodology
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
