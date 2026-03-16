"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"

export function ProjectDeveloperBadge({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const logo = mounted && resolvedTheme === "dark"
    ? "/atec-dark.png"
    : "/atec-light.png"

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">Project Developer</span>
      <a
        href="https://www.atecglobal.io"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={logo}
          alt="ATEC Global"
          width={200}
          height={200}
          className="h-20 w-auto"
        />
      </a>
    </div>
  )
}
