import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeviceDataTable } from "@/components/shared/DeviceDataTable"
import { formatRawVc } from "@/lib/utils/format"
import type { DeviceRecord } from "@/lib/types/indexer"

interface DeviceDataViewProps {
  credentialSubject: Record<string, unknown>
  rawDocuments?: string[]
}

export function DeviceDataView({ credentialSubject, rawDocuments }: DeviceDataViewProps) {
  const devices: DeviceRecord[] = Array.isArray(credentialSubject.field0)
    ? (credentialSubject.field0 as DeviceRecord[])
    : []

  return (
    <Tabs defaultValue="devices">
      <TabsList>
        <TabsTrigger value="devices">Device Records ({devices.length.toLocaleString()})</TabsTrigger>
        {rawDocuments && <TabsTrigger value="raw">Raw VC</TabsTrigger>}
      </TabsList>

      <TabsContent value="devices" className="pt-4">
        {devices.length > 0 ? (
          <DeviceDataTable devices={devices} />
        ) : (
          <p className="text-muted-foreground text-sm">No device records found in this VC.</p>
        )}
      </TabsContent>

      {rawDocuments && (
        <TabsContent value="raw" className="pt-4">
          <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96">
            {formatRawVc(rawDocuments[0])}
          </pre>
        </TabsContent>
      )}
    </Tabs>
  )
}
