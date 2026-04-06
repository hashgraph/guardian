import type { NetworkId } from '~/composables/useNetwork';

export type RegistrySortKey =
    | 'displayName'
    | 'registryDid'
    | 'createdAt'
    | 'updatedAt'
    | 'sourceTimestamp'
    | 'geography'
    | 'law'
    | 'tags'
    | 'policies'
    | 'projects'
    | 'issuances';

export type RegistrySortDir = 'asc' | 'desc';

export interface RegistryStats {
    policyCount: number;
    projectCount: number;
    issuanceCount: number;
    userCount: number;
}

export interface RegistryDto {
    id: string;
    network: string;
    did: string;
    name: string;
    topicId: string | null;
    geography: string | null;
    law: string | null;
    tags: string | null;
    action: string | null;
    lang: string | null;
    sourceTimestamp: string | null;
    createdAt: string;
    updatedAt: string;
    stats: RegistryStats;
}

export interface RegistriesMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface RegistriesResponse {
    data: RegistryDto[];
    meta: RegistriesMeta;
}

export interface UseRegistriesApiOptions {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    network: Ref<NetworkId | string>;
    sortBy: Ref<RegistrySortKey | null>;
    sortDir: Ref<RegistrySortDir | null>;
    geography?: Ref<string | null>;
    did?: Ref<string | null>;
}

const emptyResponse = (limit: number): RegistriesResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
});

export const useRegistriesApi = (opts: UseRegistriesApiOptions) => {
    const config = useRuntimeConfig();
    // Server uses full API URL; client uses relative path (proxied by Nuxt)
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const buildQuery = (): Record<string, string | number> => {
        const q: Record<string, string | number> = {
            page: opts.page.value,
            limit: opts.limit.value,
            network: opts.network.value,
        };
        const search = opts.search.value?.trim();
        if (search) q.search = search;
        if (opts.sortBy.value && opts.sortDir.value) {
            q.sortBy = opts.sortBy.value;
            q.sortDir = opts.sortDir.value;
        }
        if (opts.geography?.value) q.geography = opts.geography.value;
        if (opts.did?.value) q.did = opts.did.value;
        return q;
    };

    // Use useAsyncData with a stable key so SSR payload is transferred to client
    const key = computed(() => {
        const q = buildQuery();
        return `registries:${JSON.stringify(q)}`;
    });

    const { data, pending, error, refresh } = useAsyncData<RegistriesResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<RegistriesResponse>('/api/v1/registries', {
                    baseURL,
                    query: buildQuery(),
                });
                return res ?? emptyResponse(opts.limit.value);
            } catch (err) {
                console.error('[useRegistriesApi] fetch failed:', err);
                return emptyResponse(opts.limit.value);
            }
        },
        {
            default: () => emptyResponse(opts.limit.value),
            watch: [
                opts.page,
                opts.limit,
                opts.search,
                opts.network,
                opts.sortBy,
                opts.sortDir,
            ],
        },
    );

    return { data, pending, error, refresh };
};
