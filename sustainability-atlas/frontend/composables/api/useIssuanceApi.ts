import type { NetworkId } from '~/composables/useNetwork';
import type {
    IssuanceSummary,
    IssuanceTokenInfo,
    MintSerials,
    MintTransactions,
    RelatedIssuances,
} from '~/types/models';

/**
 * The issuance detail page's data access.
 *
 * One call per section rather than one aggregate: the summary is small and
 * paints the page immediately, while token context and the three tables load
 * independently and page on their own. Bundling them is what made the old
 * token-keyed page slow.
 *
 * `useRuntimeConfig()` is resolved here, during setup. Resolving it inside the
 * returned functions would throw "nuxt instance unavailable" when they are
 * called from a click or watcher, which is outside the Nuxt context.
 */
export const useIssuanceApi = () => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const base = (network: NetworkId | string, mintTimestamp: string) =>
        `/api/v1/${network}/issuances/${encodeURIComponent(mintTimestamp)}`;

    const get = async <T>(url: string, query?: Record<string, unknown>): Promise<T | null> => {
        try {
            return await $fetch<T>(url, { baseURL, query });
        } catch (err) {
            console.error(`[useIssuanceApi] ${url} failed:`, err);
            return null;
        }
    };

    return {
        fetchSummary: (network: NetworkId | string, mintTimestamp: string) =>
            get<IssuanceSummary>(base(network, mintTimestamp)),

        fetchTokenInfo: (network: NetworkId | string, mintTimestamp: string) =>
            get<IssuanceTokenInfo>(`${base(network, mintTimestamp)}/token`),

        fetchSerials: (network: NetworkId | string, mintTimestamp: string, page = 1, limit = 20) =>
            get<MintSerials>(`${base(network, mintTimestamp)}/serials`, { page, limit }),

        fetchTransactions: (network: NetworkId | string, mintTimestamp: string, page = 1, limit = 20) =>
            get<MintTransactions>(`${base(network, mintTimestamp)}/transactions`, { page, limit }),

        fetchRelatedIssuances: (network: NetworkId | string, mintTimestamp: string, page = 1, limit = 10) =>
            get<RelatedIssuances>(`${base(network, mintTimestamp)}/related-issuances`, { page, limit }),
    };
};
