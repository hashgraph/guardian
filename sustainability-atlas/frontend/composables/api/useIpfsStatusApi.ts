import type { NetworkId } from '~/composables/useNetwork';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface IpfsCidStatusDto {
    cid: string;
    cidV1: string;
    topicId: string | null;
    messageType: string | null;
    status: 'fetched' | 'failed' | 'pending';
    lastError: string | null;
    errorCategory: string | null;
    attemptCount: number | null;
    manualRetryCount: number | null;
    firstFailedAt: string | null;
    lastFailedAt: string | null;
}

export interface IpfsCidStatusListResponse {
    data: IpfsCidStatusDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Empty factory ────────────────────────────────────────────────────────────

const emptyList = (): IpfsCidStatusListResponse => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
});

// ─── useIpfsCidStatusApi ──────────────────────────────────────────────────────

export const useIpfsCidStatusApi = (opts: {
    network: Ref<NetworkId | string>;
    topicId: Ref<string>;
    includeChildTopics?: Ref<boolean>;
    messageType?: Ref<string>;
    page: Ref<number>;
    limit: Ref<number>;
    errorCategory?: Ref<string>;
    status?: Ref<string>;
}) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const errorCategory = opts.errorCategory ?? ref('');
    const status = opts.status ?? ref('');
    const includeChildTopics = opts.includeChildTopics ?? ref(false);
    const messageType = opts.messageType ?? ref('');

    const key = computed(
        () =>
            `ipfs-status:${opts.network.value}:${opts.topicId.value}:${includeChildTopics.value}:${messageType.value}:${errorCategory.value}:${status.value}:${opts.page.value}:${opts.limit.value}`,
    );

    const { data, pending, error, refresh } = useAsyncData<IpfsCidStatusListResponse>(
        () => key.value,
        async () => {
            try {
                const query: Record<string, string | number | boolean> = {
                    page: opts.page.value,
                    limit: opts.limit.value,
                };
                if (opts.topicId.value) query.topicId = opts.topicId.value;
                if (includeChildTopics.value) query.includeChildTopics = true;
                if (messageType.value) query.messageType = messageType.value;
                if (errorCategory.value) query.errorCategory = errorCategory.value;
                if (status.value) query.status = status.value;

                const res = await $fetch<IpfsCidStatusListResponse>(
                    `/api/v1/${opts.network.value}/ipfs-status`,
                    { baseURL, query },
                );
                return res ?? emptyList();
            } catch (err: any) {
                const msg: string = err?.message ?? String(err);
                if (!msg.includes('ECONNREFUSED') && !msg.includes('no response')) {
                    console.error('[useIpfsCidStatusApi] fetch failed:', msg);
                }
                return emptyList();
            }
        },
        {
            default: () => emptyList(),
            watch: [opts.network, opts.topicId, includeChildTopics, messageType, errorCategory, status, opts.page, opts.limit],
        },
    );

    return { data, pending, error, refresh };
};
