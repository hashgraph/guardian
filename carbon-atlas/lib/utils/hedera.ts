/** Build a Hashscan explorer URL for a given consensus timestamp. */
export function hederaExplorerUrl(consensusTimestamp: string, network: string): string {
  return `https://hashscan.io/${network}/transaction/${consensusTimestamp}`
}

/** Build a Hashscan topic URL. */
export function hederaTopicUrl(topicId: string, network: string): string {
  return `https://hashscan.io/${network}/topic/${topicId}`
}

/** Build a Hashscan token URL. */
export function hederaTokenUrl(tokenId: string, network: string): string {
  return `https://hashscan.io/${network}/token/${tokenId}`
}
