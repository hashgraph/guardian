"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { IconSearch } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vcId, setVcId] = React.useState(searchParams.get("ts") ?? "")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = vcId.trim()
    if (!trimmed) return
    router.push(`/documents/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold">Verify Document</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Look up any VC document by its Hedera consensus timestamp
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Look up a VC</CardTitle>
          <CardDescription>
            Enter the Hedera consensus timestamp (e.g. 1767600748.312578844) of any VC in this policy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="e.g. 1767600748.312578844"
              value={vcId}
              onChange={(e) => setVcId(e.target.value)}
              className="font-mono"
            />
            <Button type="submit" disabled={!vcId.trim()}>
              <IconSearch className="size-4 mr-1" />
              Go
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <DashboardLayout>
      <React.Suspense>
        <VerifyContent />
      </React.Suspense>
    </DashboardLayout>
  )
}
