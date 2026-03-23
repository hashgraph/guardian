export type NetworkId = "mainnet" | "testnet"

export interface PolicyConfig {
  name: string
  policyHederaId: string
  tokenId: string
  policyTopicId: string
}

export interface NetworkConfig {
  label: string
  indexerPath: string
  hashscanBase: string
  policies: PolicyConfig[]
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    label: "Mainnet",
    indexerPath: "mainnet",
    hashscanBase: "https://hashscan.io/mainnet",
    policies: [
      {
        name: "MECD-v1.2",
        policyHederaId: "1774178235.879591074",
        tokenId: "0.0.10387214",
        policyTopicId: "0.0.10387225",
      },
    ],
  },
  testnet: {
    label: "Testnet",
    indexerPath: "testnet",
    hashscanBase: "https://hashscan.io/testnet",
    policies: [
      {
        name: "MECD-v1.1",
        policyHederaId: "1767599197.624837133",
        tokenId: "0.0.5922943",
        policyTopicId: "0.0.5922890",
      },
    ],
  },
}

export const DEFAULT_NETWORK: NetworkId = "mainnet"

export function getActivePolicy(networkId: NetworkId): PolicyConfig {
  return NETWORKS[networkId].policies[0]
}
