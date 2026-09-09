import type { NetworkId } from '~/composables/useNetwork';

export interface SdgStatsDto {
    id: number;
    network: string;
    name: string;
    color: string;
    projects: number;
    issuances: number;
    credits: number;
    developers: number;
    countries: number;
    topMethodology: string | null;
}

export interface SdgStatsListResponse {
    data: SdgStatsDto[];
    totalProjects: number;
}

export interface UseSdgsApiOptions {
    network: Ref<NetworkId | string>;
}

const emptyResponse = (): SdgStatsListResponse => ({ data: [], totalProjects: 0 });

export const useSdgsApi = (opts: UseSdgsApiOptions) => {
    const config = useRuntimeConfig();
    // Server uses full API URL; client uses relative path (proxied by Nuxt)
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const url = computed(() => `/api/v1/${opts.network.value}/sdgs`);
    const key = computed(() => `sdgs:${opts.network.value}`);

    // Set when the request itself failed, so callers can tell "load failed"
    // apart from "loaded, but there is nothing to show".
    const failed = ref(false);

    const { data, pending, error, refresh } = useAsyncData<SdgStatsListResponse>(
        key.value,
        async () => {
            try {
                const res = await $fetch<SdgStatsListResponse>(url.value, { baseURL });
                failed.value = false;
                return res ?? emptyResponse();
            } catch (err) {
                console.error('[useSdgsApi] fetch failed:', err);
                failed.value = true;
                return emptyResponse();
            }
        },
        {
            default: () => emptyResponse(),
            watch: [opts.network],
        },
    );

    return { data, pending, error, failed, refresh };
};
