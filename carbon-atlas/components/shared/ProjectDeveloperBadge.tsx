"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { usePolicyNetwork } from "@/providers/PolicyNetworkProvider"

export function ProjectDeveloperBadge({ className }: { className?: string }) {
  const { policy } = usePolicyNetwork()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!policy.projectDeveloper) return null

  const { name, url, logoDark, logoLight } = policy.projectDeveloper
  const logo = mounted && resolvedTheme === "dark" ? logoDark : logoLight

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">Project Developer</span>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Image
          src={logo}
          alt={name}
          width={240}
          height={80}
          className="h-10 w-auto rounded"
          style={mounted && resolvedTheme === "dark" ? { background: "white", padding: "3px 6px" } : undefined}
        />
      </a>
    </div>
  )
}
