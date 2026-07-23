import type { NetworkId } from '~/composables/useNetwork';

/**
 * Public Hedera Mirror Node REST base URLs — the same source HashScan itself
 * reads from. Mirrors `getDefaultMirrorNodeUrl` in
 * `src/shared/config/configuration.ts` (backend), duplicated here because the
 * frontend fetches this directly from the browser rather than through the API.
 */
const MIRROR_NODE_URLS: Record<string, string> = {
    mainnet: 'https://mainnet-public.mirrornode.hedera.com',
    testnet: 'https://testnet.mirrornode.hedera.com',
    previewnet: 'https://previewnet.mirrornode.hedera.com',
};

interface MirrorNodeTokenInfo {
    total_supply?: string | null;
}

/**
 * Fetches a token's CURRENT total supply straight from the Hedera Mirror Node
 * (client-side only), bypassing our own DB cache so the number is never
 * stale behind a worker sync lag. `liveSupply` is null whenever the fetch
 * hasn't completed yet or failed — callers should fall back to the DB value
 * (`credit.supply`) in that case, never block rendering on this.
 */
export function useLiveTokenSupply(
    tokenId: Ref<string | null | undefined>,
    network: Ref<NetworkId | string>,
) {
    const liveSupply = ref<number | null>(null);
    const isLive = ref(false);
    const pending = ref(false);

    async function fetchLive(): Promise<void> {
        liveSupply.value = null;
        isLive.value = false;

        const id = tokenId.value;
        if (!id || !import.meta.client) return;

        const baseUrl = MIRROR_NODE_URLS[network.value] ?? MIRROR_NODE_URLS.mainnet;
        pending.value = true;
        try {
            const res = await $fetch<MirrorNodeTokenInfo>(
                `${baseUrl}/api/v1/tokens/${encodeURIComponent(id)}`,
                { timeout: 8000 },
            );
            const raw = res?.total_supply;
            if (raw != null && raw !== '') {
                liveSupply.value = parseFloat(raw);
                isLive.value = true;
            }
        } catch {
            // Mirror Node unreachable/rate-limited/token not found — caller falls back to DB value.
            liveSupply.value = null;
            isLive.value = false;
        } finally {
            pending.value = false;
        }
    }

    if (import.meta.client) {
        watch([tokenId, network], fetchLive, { immediate: true });
    }

    return { liveSupply, isLive, pending, refresh: fetchLive };
}
