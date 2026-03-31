import type { NetworkId, PolicyConfig } from "./types"
import { mecd } from "./mecd"
import { vm0033 } from "./vm0033"

export const POLICIES: PolicyConfig[] = [mecd, vm0033]

export const POLICY_MAP = new Map(POLICIES.map((p) => [p.slug, p]))

export function getPolicyBySlug(slug: string): PolicyConfig | undefined {
  return POLICY_MAP.get(slug)
}

export function getSupportedNetworks(policy: PolicyConfig): NetworkId[] {
  return Object.keys(policy.networks) as NetworkId[]
}

export function supportsNetwork(
  policy: PolicyConfig,
  network: NetworkId
): boolean {
  return network in policy.networks
}

export function getDeployment(policy: PolicyConfig, network: NetworkId) {
  return policy.networks[network]
}

export function getPoliciesForNetwork(network: NetworkId): PolicyConfig[] {
  return POLICIES.filter((p) => supportsNetwork(p, network))
}

export function getDefaultPolicy(): PolicyConfig {
  return mecd
}
