import type { NetworkId } from '~/composables/useNetwork';

/**
 * Public Hedera Mirror Node REST base URLs — the same source HashScan itself
 * reads from. Mirrors `getDefaultMirrorNodeUrl` in
 * `src/shared/config/configuration.ts` (backend); duplicated here because the
 * frontend fetches this directly from the browser rather than through the API.
 */
export const MIRROR_NODE_URLS: Record<string, string> = {
    mainnet: 'https://mainnet-public.mirrornode.hedera.com',
    testnet: 'https://testnet.mirrornode.hedera.com',
    previewnet: 'https://previewnet.mirrornode.hedera.com',
};

export function mirrorNodeBaseUrl(network: NetworkId | string): string {
    return MIRROR_NODE_URLS[network] ?? MIRROR_NODE_URLS.mainnet;
}

/** Converts a Hedera transaction id from `0.0.x@sec.nanos` (HashScan/user form) to the Mirror Node path form `0.0.x-sec-nanos`. */
export function toMirrorTransactionId(id: string): string {
    const match = id.trim().match(/^(\d+\.\d+\.\d+)@(\d+)\.(\d+)$/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : id.trim();
}
