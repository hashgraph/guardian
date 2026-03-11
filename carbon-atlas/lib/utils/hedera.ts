const NETWORK = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet"

/** Build a Hashscan explorer URL for a given consensus timestamp. */
export function hederaExplorerUrl(consensusTimestamp: string): string {
  return `https://hashscan.io/${NETWORK}/transaction/${consensusTimestamp}`
}

/** Build a Hashscan topic URL. */
export function hederaTopicUrl(topicId: string): string {
  return `https://hashscan.io/${NETWORK}/topic/${topicId}`
}
