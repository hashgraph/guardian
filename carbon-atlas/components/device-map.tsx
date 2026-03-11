"use client"

import { useMemo } from "react"
import {
  Map,
  MapControlContainer,
  MapMarker,
  MapTileLayer,
} from "@/components/ui/map"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { LatLngExpression } from "leaflet"
import { useDashboardStats } from "@/hooks/useDashboardStats"

// Known project deployment locations with approximate coordinates
// These are derived from PDD host country fields in the Guardian VC data
const PROJECT_LOCATIONS: {
  id: string
  country: string
  coordinates: LatLngExpression
  label: string
}[] = [
  {
    id: "bangladesh-vpa02",
    country: "Bangladesh",
    coordinates: [23.685, 90.356],
    label: "VPA02 — Bangladesh",
  },
]

// Map center: zoomed to show South/Southeast Asia
const MAP_CENTER: LatLngExpression = [23.685, 90.356]
const MAP_ZOOM = 6

function PulsingDot({ count }: { count: number | null }) {
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute inline-flex size-8 animate-ping rounded-full bg-primary opacity-20" />
      <span className="absolute inline-flex size-5 animate-pulse rounded-full bg-primary opacity-30" />
      <span className="relative inline-flex size-3 rounded-full bg-primary shadow-lg" />
      {count !== null && count > 0 && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-md">
          {count.toLocaleString()}
        </span>
      )}
    </div>
  )
}

export function DeviceMap() {
  const { totalDevices, isLoading } = useDashboardStats()

  const locations = useMemo(
    () =>
      PROJECT_LOCATIONS.map((loc) => ({
        ...loc,
        devices: totalDevices,
      })),
    [totalDevices]
  )

  return (
    <Card className="@container/card overflow-hidden">
      <CardHeader>
        <CardTitle>Device Locations</CardTitle>
        <CardDescription>
          Active dMRV cooking devices by deployment region
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px] w-full">
          <Map
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            className="h-full w-full rounded-b-lg !rounded-t-none !min-h-0"
            scrollWheelZoom={false}
          >
            <MapTileLayer />
            {locations.map((location) => (
              <MapMarker
                key={location.id}
                position={location.coordinates}
                icon={
                  <PulsingDot count={isLoading ? null : location.devices} />
                }
                iconAnchor={[16, 16]}
              />
            ))}
            <MapControlContainer className="bg-popover text-popover-foreground bottom-2 left-2 flex flex-col gap-1 rounded-md border px-3 py-2 shadow-md">
              <p className="text-xs font-medium">Deployment Sites</p>
              {locations.map((loc) => (
                <p key={loc.id} className="flex items-center gap-2 text-xs">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  {loc.label}
                </p>
              ))}
            </MapControlContainer>
          </Map>
        </div>
      </CardContent>
    </Card>
  )
}
