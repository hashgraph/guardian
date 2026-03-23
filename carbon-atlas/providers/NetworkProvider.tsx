"use client"

import * as React from "react"
import {
  type NetworkId,
  type NetworkConfig,
  type PolicyConfig,
  NETWORKS,
  DEFAULT_NETWORK,
  getActivePolicy,
} from "@/lib/config/networks"

interface NetworkContextValue {
  network: NetworkId
  config: NetworkConfig
  activePolicy: PolicyConfig
  setNetwork: (id: NetworkId) => void
}

const NetworkContext = React.createContext<NetworkContextValue | null>(null)

const STORAGE_KEY = "carbon-atlas-network"

function readStoredNetwork(): NetworkId {
  if (typeof window === "undefined") return DEFAULT_NETWORK
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "mainnet" || stored === "testnet") return stored
  return DEFAULT_NETWORK
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = React.useState<NetworkId>(DEFAULT_NETWORK)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setNetworkState(readStoredNetwork())
    setMounted(true)
  }, [])

  const setNetwork = React.useCallback((id: NetworkId) => {
    setNetworkState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const value = React.useMemo<NetworkContextValue>(
    () => ({
      network: mounted ? network : DEFAULT_NETWORK,
      config: NETWORKS[mounted ? network : DEFAULT_NETWORK],
      activePolicy: getActivePolicy(mounted ? network : DEFAULT_NETWORK),
      setNetwork,
    }),
    [network, mounted, setNetwork]
  )

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork(): NetworkContextValue {
  const ctx = React.useContext(NetworkContext)
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider")
  return ctx
}
