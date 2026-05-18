"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import type { NetworkId, NetworkDeployment, PolicyConfig } from "@/lib/policies/types"
import {
  POLICIES,
  getPolicyBySlug,
  getDefaultPolicy,
  getSupportedNetworks,
  supportsNetwork,
  getDeployment,
} from "@/lib/policies/registry"

interface PolicyNetworkContextValue {
  policy: PolicyConfig
  setPolicy: (slug: string) => void

  network: NetworkId
  setNetwork: (id: NetworkId) => void

  deployment: NetworkDeployment | undefined
  supportedNetworks: NetworkId[]
  policies: PolicyConfig[]
}

const PolicyNetworkContext =
  React.createContext<PolicyNetworkContextValue | null>(null)

const NETWORK_KEY = "carbon-atlas-network"

const defaultPolicy = getDefaultPolicy()
const defaultNetwork: NetworkId = "mainnet"

/** Extract policy slug from pathname: /policy/<slug>/... → slug */
function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/policy\/([^/]+)/)
  return match?.[1] ?? null
}

/**
 * Resolve the initial network for a policy on mount.
 *
 * Mainnet is the default for all policies. Testnet is only loaded if the user
 * previously explicitly selected it (stored in localStorage) AND the policy
 * supports testnet AND mainnet is not supported by the policy.
 *
 * In practice: testnet is only auto-restored for policies that are testnet-only.
 * For dual-network policies (e.g. MECD), mainnet is always the starting network;
 * the user must manually switch to testnet each session.
 */
function resolveNetwork(policy: PolicyConfig): NetworkId {
  if (typeof window === "undefined") return defaultNetwork
  // If mainnet is supported, always default to mainnet (ignore localStorage)
  if (supportsNetwork(policy, "mainnet")) return "mainnet"
  // Policy is testnet-only — use the stored value or first supported network
  const stored = localStorage.getItem(NETWORK_KEY) as NetworkId | null
  if (stored && supportsNetwork(policy, stored)) return stored
  return getSupportedNetworks(policy)[0] ?? defaultNetwork
}

export function PolicyNetworkProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // URL is the source of truth for the active policy
  const policy = React.useMemo(() => {
    const urlSlug = slugFromPath(pathname)
    if (urlSlug) {
      const p = getPolicyBySlug(urlSlug)
      if (p) return p
    }
    return defaultPolicy
  }, [pathname])

  // Network state — initialized to defaultNetwork (for SSR match), then
  // hydrated from localStorage via effect.
  const [network, setNetworkState] = React.useState<NetworkId>(defaultNetwork)

  // On mount, restore network from localStorage
  React.useEffect(() => {
    setNetworkState(resolveNetwork(policy))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When policy changes via URL navigation, reset to the policy's default network
  const prevPolicyRef = React.useRef(policy.slug)
  React.useEffect(() => {
    if (prevPolicyRef.current === policy.slug) return
    prevPolicyRef.current = policy.slug
    // Always use resolveNetwork so mainnet is preferred where available
    setNetworkState(resolveNetwork(policy))
  }, [policy])

  const setPolicy = React.useCallback(
    (_slug: string) => {
      // No-op: policy is derived from the URL.
      // Navigation (router.push / Link) is the way to change it.
    },
    []
  )

  const setNetwork = React.useCallback(
    (id: NetworkId) => {
      setNetworkState(id)
      localStorage.setItem(NETWORK_KEY, id)
    },
    []
  )

  const value = React.useMemo<PolicyNetworkContextValue>(
    () => ({
      policy,
      setPolicy,
      network,
      setNetwork,
      deployment: getDeployment(policy, network),
      supportedNetworks: getSupportedNetworks(policy),
      policies: POLICIES,
    }),
    [policy, network, setPolicy, setNetwork]
  )

  return (
    <PolicyNetworkContext.Provider value={value}>
      {children}
    </PolicyNetworkContext.Provider>
  )
}

export function usePolicyNetwork(): PolicyNetworkContextValue {
  const ctx = React.useContext(PolicyNetworkContext)
  if (!ctx)
    throw new Error(
      "usePolicyNetwork must be used within PolicyNetworkProvider"
    )
  return ctx
}

/** Convenience shorthand — returns just the active policy. */
export function usePolicy(): PolicyConfig {
  return usePolicyNetwork().policy
}

/** Convenience shorthand — returns network + setter. */
export function useNetwork() {
  const { network, setNetwork } = usePolicyNetwork()
  return { network, setNetwork }
}

/** Returns the current deployment (policyHederaId, tokenId, etc.) */
export function useDeployment(): NetworkDeployment | undefined {
  return usePolicyNetwork().deployment
}
