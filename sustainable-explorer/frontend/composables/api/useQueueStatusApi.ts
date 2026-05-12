import type { NetworkId } from '~/composables/useNetwork';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface QueueCounts {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}

export interface QueueConfig {
    concurrency: number;
    attempts: number;
    backoffType: string;
    backoffDelay: number;
}

export interface QueueStatusItemDto {
    baseName: string;
    fullName: string;
    counts: QueueCounts;
    config: QueueConfig;
    isPaused: boolean;
}

export interface FailedJobDto {
    id: string;
    name: string;
    data: any;
    failedReason: string;
    stacktrace: string[];
    attemptsMade: number;
    manualRetryCount: number;
    timestamp: number;
    processedOn: number;
    finishedOn: number;
}

export interface FailedJobListDto {
    total: number;
    items: FailedJobDto[];
}

export interface FailedJobGroupDto {
    reason: string;
    count: number;
    sampleJobIds: string[];
}

export interface FailedJobGroupListDto {
    total: number;
    page: number;
    pageSize: number;
    groups: FailedJobGroupDto[];
}

export interface SyncTopicDto {
    topicId: string;
    messageCount: number;
    hasNext: boolean;
    lastUpdate: string;
    status: string;
}

export interface SyncTokenDto {
    tokenId: string;
    serialNumber: number;
    hasNext: boolean;
    type: string;
}

export interface SyncStatusDto {
    lastSyncedAt: string | null;
    lagSeconds: number;
    totalTopics: number;
    syncedTopics: number;
    totalMessages: number;
    topicPage: number;
    topicPageSize: number;
    topics: SyncTopicDto[];
    tokenTotal: number;
    tokenPage: number;
    tokenPageSize: number;
    tokens: SyncTokenDto[];
}

// ─── Empty factories ─────────────────────────────────────────────────────────

const emptyFailedJobList = (): FailedJobListDto => ({ total: 0, items: [] });
const emptySyncStatus = (): SyncStatusDto => ({
    lastSyncedAt: null,
    lagSeconds: 0,
    totalTopics: 0,
    syncedTopics: 0,
    totalMessages: 0,
    topicPage: 1,
    topicPageSize: 10,
    topics: [],
    tokenTotal: 0,
    tokenPage: 1,
    tokenPageSize: 10,
    tokens: [],
});

// ─── useQueueListApi ──────────────────────────────────────────────────────────

export const useQueueListApi = (opts: { network: Ref<NetworkId | string> }) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const url = computed(() => `/api/v1/${opts.network.value}/queues`);
    const key = computed(() => `queue-list:${opts.network.value}`);

    const { data, pending, error, refresh } = useAsyncData<QueueStatusItemDto[]>(
        key.value,
        async () => {
            try {
                const res = await $fetch<QueueStatusItemDto[]>(url.value, { baseURL });
                return res ?? [];
            } catch (err: any) {
                const msg: string = err?.message ?? String(err);
                if (!msg.includes('ECONNREFUSED') && !msg.includes('no response')) {
                    console.error('[useQueueListApi] fetch failed:', msg);
                }
                return [];
            }
        },
        {
            default: () => [] as QueueStatusItemDto[],
            watch: [opts.network],
        },
    );

    return { data, pending, error, refresh };
};

// ─── useQueueFailedJobsApi ────────────────────────────────────────────────────

export const useQueueFailedJobsApi = (opts: {
    network: Ref<NetworkId | string>;
    baseName: Ref<string | null>;
    limit?: Ref<number>;
    offset?: Ref<number>;
}) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const limit = opts.limit ?? ref(50);
    const offset = opts.offset ?? ref(0);

    const key = computed(
        () => `queue-failed:${opts.network.value}:${opts.baseName.value}:${offset.value}:${limit.value}`,
    );

    const { data, pending, error, refresh } = useAsyncData<FailedJobListDto>(
        () => key.value,
        async () => {
            if (!opts.baseName.value) return emptyFailedJobList();
            try {
                const res = await $fetch<FailedJobListDto>(
                    `/api/v1/${opts.network.value}/queues/${opts.baseName.value}/failed`,
                    {
                        baseURL,
                        query: { limit: limit.value, offset: offset.value, groupByReason: false },
                    },
                );
                return res ?? emptyFailedJobList();
            } catch (err: any) {
                const msg: string = err?.message ?? String(err);
                if (!msg.includes('ECONNREFUSED') && !msg.includes('no response')) {
                    console.error('[useQueueFailedJobsApi] fetch failed:', msg);
                }
                return emptyFailedJobList();
            }
        },
        {
            default: () => emptyFailedJobList(),
            watch: [opts.network, opts.baseName, limit, offset],
        },
    );

    return { data, pending, error, refresh };
};

// ─── useQueueFailedGroupsApi ──────────────────────────────────────────────────

const emptyGroupList = (): FailedJobGroupListDto => ({ total: 0, page: 1, pageSize: 10, groups: [] });

export const useQueueFailedGroupsApi = (opts: {
    network: Ref<NetworkId | string>;
    baseName: Ref<string | null>;
    groupPage?: Ref<number>;
    groupPageSize?: Ref<number>;
}) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const groupPage = opts.groupPage ?? ref(1);
    const groupPageSize = opts.groupPageSize ?? ref(10);

    const key = computed(
        () => `queue-failed-groups:${opts.network.value}:${opts.baseName.value}:${groupPage.value}:${groupPageSize.value}`,
    );

    const { data, pending, error, refresh } = useAsyncData<FailedJobGroupListDto>(
        () => key.value,
        async () => {
            if (!opts.baseName.value) return emptyGroupList();
            try {
                const res = await $fetch<FailedJobGroupListDto>(
                    `/api/v1/${opts.network.value}/queues/${opts.baseName.value}/failed`,
                    {
                        baseURL,
                        query: { groupByReason: true, groupPage: groupPage.value, groupPageSize: groupPageSize.value },
                    },
                );
                return res ?? emptyGroupList();
            } catch (err: any) {
                const msg: string = err?.message ?? String(err);
                if (!msg.includes('ECONNREFUSED') && !msg.includes('no response')) {
                    console.error('[useQueueFailedGroupsApi] fetch failed:', msg);
                }
                return emptyGroupList();
            }
        },
        {
            default: () => emptyGroupList(),
            watch: [opts.network, opts.baseName, groupPage, groupPageSize],
        },
    );

    return { data, pending, error, refresh };
};

// ─── useSyncStatusApi ─────────────────────────────────────────────────────────

export const useSyncStatusApi = (opts: {
    network: Ref<NetworkId | string>;
    topicPage?: Ref<number>;
    topicPageSize?: Ref<number>;
    tokenPage?: Ref<number>;
    tokenPageSize?: Ref<number>;
}) => {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const topicPage = opts.topicPage ?? ref(1);
    const topicPageSize = opts.topicPageSize ?? ref(10);
    const tokenPage = opts.tokenPage ?? ref(1);
    const tokenPageSize = opts.tokenPageSize ?? ref(10);

    const url = computed(() => `/api/v1/${opts.network.value}/sync-status`);
    const key = computed(() => `sync-status:${opts.network.value}:${topicPage.value}:${topicPageSize.value}:${tokenPage.value}:${tokenPageSize.value}`);

    const available = ref(true);

    watch(opts.network, () => {
        available.value = true;
    });

    const { data, pending, error, refresh } = useAsyncData<SyncStatusDto>(
        () => key.value,
        async () => {
            try {
                const res = await $fetch<SyncStatusDto>(url.value, {
                    baseURL,
                    query: { topicPage: topicPage.value, topicPageSize: topicPageSize.value, tokenPage: tokenPage.value, tokenPageSize: tokenPageSize.value },
                });
                available.value = true;
                return res ?? emptySyncStatus();
            } catch (err: any) {
                if (err?.statusCode === 404 || err?.status === 404) {
                    available.value = false;
                    return emptySyncStatus();
                }
                const msg: string = (err as any)?.message ?? String(err);
                if (!msg.includes('ECONNREFUSED') && !msg.includes('no response')) {
                    console.error('[useSyncStatusApi] fetch failed:', msg);
                }
                return emptySyncStatus();
            }
        },
        {
            default: () => emptySyncStatus(),
            watch: [opts.network, topicPage, topicPageSize, tokenPage, tokenPageSize],
        },
    );

    return { data, pending, error, refresh, available };
};
