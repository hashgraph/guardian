<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Copy,
    FileWarning,
    Loader2,
    RefreshCw,
    Settings,
    X,
} from 'lucide-vue-next';
import type { SingleSelectOption } from '~/components/shared/SingleSelect.vue';
import type {
    FailedJobDto,
    QueueStatusItemDto,
} from '~/composables/api/useQueueStatusApi';

const { t, locale } = useI18n();
const localeTag = computed(() => (locale.value === 'es' ? 'es-ES' : 'en-US'));

const lastSyncedDateDisplay = computed(() => {
    const raw = syncStatus.value?.lastSyncedAt;
    if (!raw) return '—';
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString(localeTag.value, { month: 'long', day: 'numeric', year: 'numeric' });
});

const lastSyncedTimeDisplay = computed(() => {
    const raw = syncStatus.value?.lastSyncedAt;
    if (!raw) return '—';
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleTimeString(localeTag.value, { hour: '2-digit', minute: '2-digit', hour12: true });
});
const { network } = useNetwork();
const config = useRuntimeConfig();
// Sync page is PUBLIC (read-only). Guardian-sync data + all actions are admin-only.
const { isAdmin } = useAuth();
const { header: csrfHeader } = useCsrf();
const { apiFetch } = useApiFetch();

// ─── API composables ──────────────────────────────────────────────────────────

const {
    data: queueList,
    pending: queuePending,
    refresh: refreshQueues,
} = useQueueListApi({ network });

const {
    data: syncStatus,
    available: syncAvailable,
} = useSyncSummaryApi({ network });

const {
    data: guardianSync,
    refresh: refreshGuardianSync,
} = useGuardianSyncStatusApi({ network });

const guardianEventSubject = ref('');
const guardianEventPage = ref(1);
const guardianEventPageSize = ref(10);
const {
    data: guardianEventsData,
    refresh: refreshGuardianSyncEvents,
} = useGuardianSyncEventsApi({
    network,
    page: guardianEventPage,
    pageSize: guardianEventPageSize,
    subject: guardianEventSubject,
});
watch(guardianEventSubject, () => { guardianEventPage.value = 1; });

function onGuardianEventPageChange(page: number) {
    guardianEventPage.value = page;
}
function onGuardianEventPageSizeChange(size: number) {
    guardianEventPageSize.value = size;
    guardianEventPage.value = 1;
}

const topicSearch = ref('');
const topicStatusFilter = ref('');
const topicPage = ref(1);
const topicPageSize = ref(10);
const { data: syncTopicsData, pending: topicsPending } = useSyncTopicsApi({
    network,
    search: topicSearch,
    status: topicStatusFilter,
    page: topicPage,
    pageSize: topicPageSize,
});

const tokenSearch = ref('');
const tokenTypeFilter = ref('');
const tokenPage = ref(1);
const tokenPageSize = ref(10);
const { data: syncTokensData, pending: tokensPending } = useSyncTokensApi({
    network,
    search: tokenSearch,
    type: tokenTypeFilter,
    page: tokenPage,
    pageSize: tokenPageSize,
});

watch(topicSearch, () => { topicPage.value = 1; });
watch(topicStatusFilter, () => { topicPage.value = 1; });
watch(tokenSearch, () => { tokenPage.value = 1; });
watch(tokenTypeFilter, () => { tokenPage.value = 1; });

const topicFiltersActive = computed(() => !!topicSearch.value || !!topicStatusFilter.value);
const tokenFiltersActive = computed(() => !!tokenSearch.value || !!tokenTypeFilter.value);

function clearTopicFilters() {
    topicSearch.value = '';
    topicStatusFilter.value = '';
    topicPage.value = 1;
}

// ─── Filter dropdown options ───────────────────────────────────────────────────
const topicStatusOptions = computed<SingleSelectOption[]>(() => [
    { value: '', label: t('status.allStatuses') },
    { value: 'SYNCED', label: t('status.syncOptions.synced') },
    { value: 'NEW', label: t('status.syncOptions.new') },
    { value: 'DISABLED', label: t('status.syncOptions.disabled') },
]);

const tokenTypeOptions = computed<SingleSelectOption[]>(() => [
    { value: '', label: t('status.allTypes') },
    { value: 'FUNGIBLE_COMMON', label: t('credits.tokenTypes.Fungible') },
    { value: 'NON_FUNGIBLE_UNIQUE', label: t('credits.tokenTypes.Non-Fungible') },
]);

const guardianEventOptions = computed<SingleSelectOption[]>(() => [
    { value: '', label: t('status.allEvents') },
    { value: 'block_complete', label: 'block_complete' },
    { value: 'token_minted', label: 'token_minted' },
    { value: 'ipfs_added_file', label: 'ipfs_added_file' },
    { value: 'block_event', label: 'block_event' },
    { value: 'policy-event-policy-ready', label: 'policy-ready' },
    { value: 'policy-engine-event-publish-policies', label: 'publish-policies' },
]);

const ipfsMessageTypeOptions = computed<SingleSelectOption[]>(() => [
    { value: '', label: t('status.allTypes') },
    { value: 'VC-Document', label: 'VC-Document' },
    { value: 'VP-Document', label: 'VP-Document' },
    { value: 'Instance-Policy', label: 'Instance-Policy' },
    { value: 'Standard Registry', label: 'Standard Registry' },
    { value: 'Tag', label: 'Tag' },
    { value: 'Token', label: 'Token' },
    { value: 'Schema', label: 'Schema' },
    { value: 'DID-Document', label: 'DID-Document' },
]);

const ipfsStatusOptions = computed<SingleSelectOption[]>(() => [
    { value: '', label: t('status.allStatuses') },
    { value: 'fetched', label: t('status.ipfsStatus.fetched') },
    { value: 'failed', label: t('status.ipfsStatus.failed') },
    { value: 'pending', label: t('status.ipfsStatus.pending') },
]);

const ipfsErrorCategoryOptions = computed<SingleSelectOption[]>(() => [
    { value: '', label: t('status.allCategories') },
    { value: 'transient', label: t('status.ipfsErrorCategories.transient') },
    { value: 'permanent', label: t('status.ipfsErrorCategories.permanent') },
    { value: 'unknown', label: t('status.ipfsErrorCategories.unknown') },
]);

// ─── Requeue topic (manual sync trigger) ─────────────────────────────────────

const requeueInput = ref('');
const requeueFromStart = ref(false);
const requeuePending = ref<Record<string, boolean>>({});

async function requeueTopic(topicId: string, fromStart: boolean) {
    if (!topicId) return;
    if (!/^0\.0\.\d+$/.test(topicId.trim())) {
        await showToast(t('status.toasts.invalidTopicFormat'), 'error');
        return;
    }
    requeuePending.value[topicId] = true;
    try {
        await $fetch(
            `/api/v1/${network.value}/sync-status/requeue-topic`,
            {
                method: 'POST',
                body: { topicId: topicId.trim(), fromStart },
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
                credentials: 'include',
                headers: csrfHeader(),
            },
        );
        await showToast(t('status.toasts.topicQueued', { topicId }));
        // Reset input and refresh the topics list
        if (topicId === requeueInput.value.trim()) {
            requeueInput.value = '';
            requeueFromStart.value = false;
        }
    } catch (err: any) {
        await showToast(t('status.toasts.failedRequeue', { topicId, error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        requeuePending.value[topicId] = false;
    }
}

function clearTokenFilters() {
    tokenSearch.value = '';
    tokenTypeFilter.value = '';
    tokenPage.value = 1;
}

// ─── SSE ─────────────────────────────────────────────────────────────────────

// SSE must bypass the Nitro proxy (which buffers text/event-stream).
// Use sseApiBaseUrl which points directly to the NestJS API.
const sseBaseURL = import.meta.client
    ? (config.public.sseApiBaseUrl as string) || 'http://localhost:3030'
    : '';

const { isConnected, liveCounts, recentFailures, recentEvents, lastEventAt } =
    useQueueEventsSse({ network, baseURL: sseBaseURL });

// ─── Poll fallback (30s) ──────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;
let guardianSyncTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    pollTimer = setInterval(() => {
        refreshQueues();
    }, 30_000);
    // Guardian-sync data is admin-only — only admins poll it (others would 401).
    if (isAdmin.value) {
        guardianSyncTimer = setInterval(() => {
            refreshGuardianSync();
            refreshGuardianSyncEvents();
        }, 10_000);
    }
});

onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (guardianSyncTimer) clearInterval(guardianSyncTimer);
});

// ─── Merged queue list ────────────────────────────────────────────────────────

const mergedQueues = computed<QueueStatusItemDto[]>(() => {
    return (queueList.value ?? []).map((q) => {
        const live = liveCounts.value[q.baseName];
        if (!live) return q;
        return { ...q, counts: { ...q.counts, ...live } };
    });
});

// ─── Summary stats ────────────────────────────────────────────────────────────

const totalWaiting = computed(() =>
    mergedQueues.value.reduce((s, q) => s + q.counts.waiting, 0),
);

// ─── Last updated counter ─────────────────────────────────────────────────────

const secondsSinceUpdate = ref(0);

let clockTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    clockTimer = setInterval(() => {
        secondsSinceUpdate.value = Math.floor((Date.now() - lastEventAt.value) / 1000);
    }, 1000);
});

onUnmounted(() => {
    if (clockTimer) clearInterval(clockTimer);
});

// ─── Sync health ──────────────────────────────────────────────────────────────

const syncPanelOpen = ref(true);
const guardianSyncPanelOpen = ref(true);

const lagColor = computed(() => {
    const lag = syncStatus.value?.lagSeconds ?? 0;
    if (lag < 60) return 'text-stat-green';
    if (lag < 300) return 'text-stat-amber';
    return 'text-stat-rose';
});

function formatRelativeTime(ts: string | null): string {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return t('status.time.sAgo', { s });
    const m = Math.floor(s / 60);
    if (m < 60) return t('status.time.mAgo', { m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('status.time.hAgo', { h });
    return t('status.time.dAgo', { d: Math.floor(h / 24) });
}

function formatRelativeMs(ms: number | null): string {
    if (!ms) return t('status.time.never');
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return t('status.time.sAgo', { s });
    const m = Math.floor(s / 60);
    if (m < 60) return t('status.time.mAgo', { m });
    const h = Math.floor(m / 60);
    if (h < 24) return t('status.time.hAgo', { h });
    return t('status.time.dAgo', { d: Math.floor(h / 24) });
}

function formatLagHuman(seconds: number): string {
    if (seconds < 60) return t('status.syncHealth.lagSec', { seconds });
    if (seconds < 3600) return t('status.syncHealth.lagMin', { minutes: Math.floor(seconds / 60) });
    return t('status.syncHealth.lagHour', { hours: Math.floor(seconds / 3600) });
}

function formatFailedReason(reason: string | null | undefined): string {
    if (!reason) return t('status.failedDrawer.noReason');
    const lower = reason.toLowerCase();
    if (lower.includes('timeout') || lower.includes('etimedout')) return t('status.errors.timeout');
    if (lower.includes('econnrefused') || lower.includes('network error') || lower.includes('fetch failed')) return t('status.errors.networkError');
    if (lower.includes('connection is closed') || lower.includes('connection closed') || lower.includes('socket closed') || lower.includes('econnreset')) return t('status.errors.connectionClosed');
    if (lower.includes('enotfound') || lower.includes('getaddrinfo') || lower.includes('dns')) return t('status.errors.dnsError');
    if (lower.includes('rate limit') || lower.includes('429')) return t('status.errors.rateLimit');
    if (lower.includes('ipfs')) return t('status.errors.ipfsError');
    if (lower.includes('stalled')) return t('status.errors.stalled');
    if (lower.includes('502') || lower.includes('503') || lower.includes('bad gateway')) return t('status.errors.badGateway');
    if (lower.includes('400') || lower.includes('bad request')) return t('status.errors.badRequest');
    if (lower.includes('404') || lower.includes('not found')) return t('status.errors.notFound');
    if (lower.includes('500') || lower.includes('internal server error')) return t('status.errors.serverError');
    if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden')) return t('status.errors.unauthorized');
    return reason.length > 80 ? reason.slice(0, 80) + '…' : reason;
}

const lastSyncedDisplay = computed(() => {
    const raw = syncStatus.value?.lastSyncedAt ?? null;
    if (!raw) return '—';
    return formatRelativeTime(raw);
});

// ─── Toast helper (using vue-sonner via global) ───────────────────────────────

// vue-sonner is available via `import { toast } from 'vue-sonner'` at runtime.
// We use dynamic import to avoid SSR issues.
async function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (!import.meta.client) return;
    try {
        const { toast } = await import('vue-sonner');
        if (type === 'success') toast.success(message);
        else toast.error(message);
    } catch {
        console.log('[toast]', type, message);
    }
}

// ─── Pause / Resume ───────────────────────────────────────────────────────────

const actionPending = ref<Record<string, boolean>>({});

async function pauseQueue(baseName: string) {
    actionPending.value[baseName] = true;
    try {
        await $fetch(`/api/v1/${network.value}/queues/${baseName}/pause`, {
            method: 'POST',
            baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
        });
        await refreshQueues();
    } catch (err: any) {
        showToast(t('status.toasts.failedPause', { baseName, error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        actionPending.value[baseName] = false;
    }
}

async function resumeQueue(baseName: string) {
    actionPending.value[baseName] = true;
    try {
        await $fetch(`/api/v1/${network.value}/queues/${baseName}/resume`, {
            method: 'POST',
            baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
        });
        await refreshQueues();
    } catch (err: any) {
        showToast(t('status.toasts.failedResume', { baseName, error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        actionPending.value[baseName] = false;
    }
}

// ─── Retry all failed ─────────────────────────────────────────────────────────

interface RetryAllState {
    baseName: string;
    failedCount: number;
    force: boolean;
    pending: boolean;
}

const retryAllState = ref<RetryAllState | null>(null);

function openRetryAll(q: QueueStatusItemDto) {
    retryAllState.value = {
        baseName: q.baseName,
        failedCount: q.counts.failed,
        force: false,
        pending: false,
    };
}

function cancelRetryAll() {
    retryAllState.value = null;
}

async function confirmRetryAll() {
    if (!retryAllState.value) return;
    retryAllState.value.pending = true;
    const { baseName, force } = retryAllState.value;
    try {
        const result = await apiFetch<{ retried: number; skipped: number; errors: any[] }>(
            `/api/v1/${network.value}/queues/${baseName}/retry-all-failed`,
            {
                method: 'POST',
                body: { force, limit: Math.min(retryAllState.value!.failedCount, 1000) },
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
                credentials: 'include',
                headers: csrfHeader(),
            },
        );
        retryAllState.value = null;
        showToast(
            t('status.retryAll.result', {
                retried: result.retried,
                skipped: result.skipped,
            }),
        );
        await refreshQueues();
    } catch (err: any) {
        retryAllState.value = null;
        showToast(
            t('status.toasts.retryAllFailed', { baseName, error: err?.message ?? t('common.unknownError') }),
            'error',
        );
    }
}

// ─── Failed jobs drawer ───────────────────────────────────────────────────────

const drawerBaseName = ref<string | null>(null);
const drawerTab = ref<'byReason' | 'allFailed'>('byReason');
const failedPage = ref(1);
const failedPageSize = ref(50);
const failedOffset = computed(() => (failedPage.value - 1) * failedPageSize.value);
const groupPage = ref(1);
const groupPageSize = ref(10);

function openDrawer(baseName: string) {
    drawerBaseName.value = baseName;
    drawerTab.value = 'byReason';
    failedPage.value = 1;
    failedPageSize.value = 50;
    groupPage.value = 1;
    groupPageSize.value = 10;
}

function closeDrawer() {
    drawerBaseName.value = null;
}

const drawerSearch = ref('');
watch(drawerBaseName, () => { drawerSearch.value = ''; });

const filteredFailedJobs = computed(() => {
    const items = failedJobs.value?.items ?? [];
    const q = drawerSearch.value.trim().toLowerCase();
    if (!q) return items;
    return items.filter((j) =>
        j.id.toLowerCase().includes(q) ||
        String((j.data as any)?.topicId ?? '').toLowerCase().includes(q) ||
        String((j.data as any)?.messageTimestamp ?? '').toLowerCase().includes(q),
    );
});

const { data: failedJobs, pending: failedPending, refresh: refreshFailed } =
    useQueueFailedJobsApi({
        network,
        baseName: drawerBaseName,
        limit: failedPageSize,
        offset: failedOffset,
    });

const { data: failedGroupsData, pending: groupsPending, refresh: refreshGroups } =
    useQueueFailedGroupsApi({
        network,
        baseName: drawerBaseName,
        groupPage,
        groupPageSize,
    });

const failedGroups = computed(() => failedGroupsData.value?.groups ?? []);
const groupsTotal = computed(() => failedGroupsData.value?.total ?? 0);

// ─── Pagination handlers ──────────────────────────────────────────────────────

function onFailedPageChange(page: number) {
    failedPage.value = page;
}

function onFailedPageSizeChange(size: number) {
    failedPageSize.value = size;
    failedPage.value = 1;
}

function onGroupPageChange(page: number) {
    groupPage.value = page;
}

function onGroupPageSizeChange(size: number) {
    groupPageSize.value = size;
    groupPage.value = 1;
}

function onSyncTopicPageChange(page: number) {
    topicPage.value = page;
}

function onSyncTopicPageSizeChange(size: number) {
    topicPageSize.value = size;
    topicPage.value = 1;
}

function onSyncTokenPageChange(page: number) {
    tokenPage.value = page;
}

function onSyncTokenPageSizeChange(size: number) {
    tokenPageSize.value = size;
    tokenPage.value = 1;
}

// ─── Per-job retry state ──────────────────────────────────────────────────────

interface JobRetryState {
    confirming: boolean;
    force: boolean;
    pending: boolean;
    error: string | null;
    done: boolean;
}

const jobRetryStates = ref<Record<string, JobRetryState>>({});

function getJobRetry(jobId: string): JobRetryState {
    if (!jobRetryStates.value[jobId]) {
        jobRetryStates.value[jobId] = {
            confirming: false,
            force: false,
            pending: false,
            error: null,
            done: false,
        };
    }
    return jobRetryStates.value[jobId];
}

function startConfirmRetry(jobId: string) {
    const state = getJobRetry(jobId);
    state.confirming = true;
    state.error = null;
}

function cancelRetry(jobId: string) {
    const state = getJobRetry(jobId);
    state.confirming = false;
    state.force = false;
}

const MANUAL_RETRY_BUDGET = 3;

async function confirmRetryJob(job: FailedJobDto) {
    const state = getJobRetry(job.id);
    state.pending = true;
    state.error = null;

    if (!drawerBaseName.value) return;

    try {
        await apiFetch(
            `/api/v1/${network.value}/queues/${drawerBaseName.value}/jobs/${job.id}/retry`,
            {
                method: 'POST',
                body: { force: state.force },
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
                credentials: 'include',
                headers: csrfHeader(),
            },
        );
        state.done = true;
        state.confirming = false;
        showToast(t('status.toasts.jobQueuedRetry', { id: job.id }));
        // Refresh after short delay so animation can play
        setTimeout(() => refreshFailed(), 800);
    } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 429) {
            state.error = t('status.failedDrawer.budgetExhausted');
        } else if (status === 409) {
            state.error = t('status.failedDrawer.jobNotFailed');
            setTimeout(() => refreshFailed(), 800);
        } else {
            state.error = err?.message ?? t('status.toasts.retryFailed');
        }
        state.pending = false;
        state.confirming = false;
    }
}

// ─── IPFS Documents ───────────────────────────────────────────────────────────

const ipfsFailuresPanelOpen = ref(true);
const ipfsTopicFilterRaw = ref('');
const ipfsTopicFilter = ref('');
const ipfsIncludeChildTopics = ref(false);
const ipfsMessageTypeFilter = ref('');
const ipfsErrorCategoryFilter = ref('');
const ipfsStatusFilter = ref('');
const ipfsFailurePage = ref(1);
const ipfsFailurePageSize = ref(20);

const applyTopicFilter = useDebounceFn((val: string) => {
    ipfsTopicFilter.value = val;
    ipfsFailurePage.value = 1;
}, 400);

watch(ipfsTopicFilterRaw, (val) => applyTopicFilter(val));
watch(ipfsErrorCategoryFilter, () => { ipfsFailurePage.value = 1; });
watch(ipfsStatusFilter, () => { ipfsFailurePage.value = 1; });

const {
    data: ipfsFailuresData,
    pending: ipfsFailuresPending,
    refresh: refreshIpfsFailures,
} = useIpfsCidStatusApi({
    network,
    topicId: ipfsTopicFilter,
    includeChildTopics: ipfsIncludeChildTopics,
    messageType: ipfsMessageTypeFilter,
    page: ipfsFailurePage,
    limit: ipfsFailurePageSize,
    errorCategory: ipfsErrorCategoryFilter,
    status: ipfsStatusFilter,
});

const ipfsFailures = computed(() => ipfsFailuresData.value?.data ?? []);
const ipfsFailuresTotal = computed(() => ipfsFailuresData.value?.meta.total ?? 0);
const ipfsFailuresTotalPages = computed(() => ipfsFailuresData.value?.meta.totalPages ?? 0);

watch(ipfsIncludeChildTopics, () => { ipfsFailurePage.value = 1; });
watch(ipfsMessageTypeFilter, () => { ipfsFailurePage.value = 1; });

const ipfsFiltersActive = computed(() => !!ipfsTopicFilterRaw.value || !!ipfsMessageTypeFilter.value || !!ipfsErrorCategoryFilter.value || !!ipfsStatusFilter.value);

// Show "Retry All for Topic" only when a topic filter is active and there are failed rows visible
const ipfsHasFailedRows = computed(() => ipfsFailures.value.some((r) => r.status === 'failed'));

function clearIpfsFilters() {
    ipfsTopicFilterRaw.value = '';
    ipfsTopicFilter.value = '';
    ipfsIncludeChildTopics.value = false;
    ipfsMessageTypeFilter.value = '';
    ipfsErrorCategoryFilter.value = '';
    ipfsStatusFilter.value = '';
    ipfsFailurePage.value = 1;
}

function ipfsErrorCategoryBadgeClass(category: string | null): string {
    if (category === 'transient') return 'bg-stat-amber/10 text-stat-amber';
    if (category === 'permanent') return 'bg-stat-rose/10 text-stat-rose';
    return 'bg-muted text-muted-foreground';
}

function ipfsStatusBadgeClass(status: string): string {
    if (status === 'fetched') return 'bg-stat-green/10 text-stat-green';
    if (status === 'failed') return 'bg-stat-rose/10 text-stat-rose';
    return 'bg-stat-amber/10 text-stat-amber'; // pending
}

const copiedValue = ref<string | null>(null);
async function copyToClipboard(value: string) {
    try {
        await navigator.clipboard.writeText(value);
        copiedValue.value = value;
        setTimeout(() => { if (copiedValue.value === value) copiedValue.value = null; }, 2000);
    } catch {}
}

const ipfsRetryPending = ref<Record<string, boolean>>({});

async function retryIpfsFailure(cid: string) {
    ipfsRetryPending.value[cid] = true;
    try {
        await apiFetch(`/api/v1/${network.value}/ipfs-status/${encodeURIComponent(cid)}/retry`, {
            method: 'POST',
            baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
            credentials: 'include',
            headers: csrfHeader(),
        });
        showToast(t('status.toasts.cidQueuedRetry', { cid: cid.slice(0, 20) }));
        await refreshIpfsFailures();
    } catch (err: any) {
        showToast(t('status.toasts.retryFailedWithError', { error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        ipfsRetryPending.value[cid] = false;
    }
}

const ipfsRetryAllTopicPending = ref(false);

async function retryAllIpfsForTopic() {
    if (!ipfsTopicFilter.value) return;
    ipfsRetryAllTopicPending.value = true;
    try {
        await apiFetch(`/api/v1/${network.value}/ipfs-status/retry-by-topic`, {
            method: 'POST',
            body: {
                topicId: ipfsTopicFilter.value,
                includeChildTopics: ipfsIncludeChildTopics.value || undefined,
            },
            baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
            credentials: 'include',
            headers: csrfHeader(),
        });
        showToast(t('status.toasts.topicRetryAllQueued', { topicId: ipfsTopicFilter.value }));
        await refreshIpfsFailures();
    } catch (err: any) {
        showToast(t('status.toasts.retryAllFailedWithError', { error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        ipfsRetryAllTopicPending.value = false;
    }
}

function onIpfsFailurePageChange(page: number) {
    ipfsFailurePage.value = page;
}

function onIpfsFailurePageSizeChange(size: number) {
    ipfsFailurePageSize.value = size;
    ipfsFailurePage.value = 1;
}

// ─── Maintenance actions ──────────────────────────────────────────────────────

const maintenancePanelOpen = ref(false);
const redecodeAllPending = ref(false);
const reparseAllPending = ref(false);

async function triggerRedecodeAll() {
    redecodeAllPending.value = true;
    try {
        const result = await apiFetch<{ total: number; enqueued: number; skipped: number }>(
            `/api/v1/${network.value}/methodologies/redecode-all`,
            {
                method: 'POST',
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
                credentials: 'include',
                headers: csrfHeader(),
            },
        );
        showToast(t('status.toasts.redecodeEnqueued', { enqueued: result.enqueued, total: result.total, skipped: result.skipped }));
    } catch (err: any) {
        showToast(t('status.toasts.redecodeFailed', { error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        redecodeAllPending.value = false;
    }
}

async function triggerReparseAll() {
    reparseAllPending.value = true;
    try {
        const result = await apiFetch<{ methodologies: number; succeeded: number; skipped: number; enqueued: number }>(
            `/api/v1/${network.value}/methodologies/reparse-projects`,
            {
                method: 'POST',
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
                credentials: 'include',
                headers: csrfHeader(),
            },
        );
        showToast(t('status.toasts.reparseEnqueued', { enqueued: result.enqueued, succeeded: result.succeeded }));
    } catch (err: any) {
        showToast(t('status.toasts.reparseFailed', { error: err?.message ?? t('common.unknownError') }), 'error');
    } finally {
        reparseAllPending.value = false;
    }
}

// ─── Activity feed — filter ───────────────────────────────────────────────────

const activityFilter = ref<'all' | 'failures'>('all');

const filteredEvents = computed(() => {
    if (activityFilter.value === 'failures') {
        return recentEvents.value.filter(
            (ev) => ev.type === 'job-failed' || ev.type === 'ipfs-fetch-failed',
        );
    }
    return recentEvents.value;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function queueStatus(q: QueueStatusItemDto): 'paused' | 'active' | 'idle' {
    if (q.isPaused) return 'paused';
    const counts = mergedQueues.value.find((m) => m.baseName === q.baseName)?.counts ?? q.counts;
    if (counts.active > 0) return 'active';
    return 'idle';
}

const eventBadgeClass: Record<string, string> = {
    'job-failed': 'bg-stat-rose/10 text-stat-rose',
    'job-completed': 'bg-stat-green/10 text-stat-green',
    'job-stalled': 'bg-stat-amber/10 text-stat-amber',
    'ipfs-fetch-failed': 'bg-stat-rose/10 text-stat-rose',
    'ipfs-fetch-recovered': 'bg-stat-green/10 text-stat-green',
    'document-loaded': 'bg-stat-blue/10 text-stat-blue',
};

function eventLabel(type: string): string {
    const map: Record<string, string> = {
        'job-failed': t('status.activity.labels.jobFailed'),
        'job-completed': t('status.activity.labels.jobCompleted'),
        'job-stalled': t('status.activity.labels.jobStalled'),
        'ipfs-fetch-failed': t('status.activity.labels.ipfsFetchFailed'),
        'ipfs-fetch-recovered': t('status.activity.labels.ipfsFetchRecovered'),
        'document-loaded': t('status.activity.labels.documentLoaded'),
    };
    return map[type] ?? type;
}

function eventDetails(ev: { type: string; payload: Record<string, any> }): string {
    const p = ev.payload;
    if (ev.type === 'job-failed') {
        const where = [p.queueBase, p.jobId].filter(Boolean).join(' / ');
        const why = p.failedReason ? ` — ${String(p.failedReason).slice(0, 80)}` : '';
        return where + why;
    }
    if (ev.type === 'job-completed' || ev.type === 'job-stalled') {
        return [p.queueBase, p.jobId].filter(Boolean).join(' / ');
    }
    if (ev.type === 'ipfs-fetch-failed') {
        const cid = p.cid ?? p.jobId ?? '';
        const why = p.error ? ` — ${String(p.error).slice(0, 60)}` : '';
        return cid + why;
    }
    if (ev.type === 'ipfs-fetch-recovered') {
        return p.cid ?? p.jobId ?? '';
    }
    if (ev.type === 'document-loaded') {
        return p.topicId ?? p.messageId ?? '';
    }
    return '';
}

function formatTs(ts: number): string {
    return new Date(ts).toLocaleTimeString(localeTag.value, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
</script>

<template>
    <div class="space-y-0">
        <!-- Page header -->
        <div class="px-6 pt-6 pb-5">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('status.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('status.subtitle') }}</p>
        </div>

        <!-- Section A: Stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 pb-4">
            <!-- Data synced up to -->
            <div class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {{ $t('status.dataSyncedUpTo') }}
                </span>
                <div class="text-lg font-bold text-foreground mt-2">
                    {{ lastSyncedDateDisplay }}
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <Clock class="h-3.5 w-3.5 text-muted-foreground" />
                    <span class="text-xs text-muted-foreground">
                        {{ lastSyncedTimeDisplay }}
                    </span>
                </div>
            </div>

            <!-- Topics indexed -->
            <div class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {{ $t('status.topicsIndexed') }}
                </span>
                <div class="text-2xl font-bold tabular-nums text-foreground mt-2">
                    {{ (syncStatus?.syncedTopics ?? 0).toLocaleString() }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                    of ~{{ (syncStatus?.totalTopics ?? 0).toLocaleString() }} {{ $t('status.topicsDiscovered') }}
                </p>
            </div>

            <!-- Messages processed -->
            <div class="rounded-xl border bg-card p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {{ $t('status.messagesProcessed') }}
                </span>
                <div class="text-2xl font-bold tabular-nums text-foreground mt-2">
                    {{ (syncStatus?.totalMessages ?? 0).toLocaleString() }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                    {{ totalWaiting.toLocaleString() }} {{ $t('status.pendingInQueue') }}
                    <span v-if="totalWaiting > 0" class="text-stat-amber">↑</span>
                </p>
            </div>
        </div>

        <!-- Section B: Connection status banner -->
        <div class="px-6 pb-4">
            <div class="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
                <div class="flex items-center gap-2">
                    <span
                        class="inline-block h-2 w-2 rounded-full"
                        :class="isConnected ? 'bg-stat-green animate-pulse' : 'bg-stat-amber'"
                    />
                    <span class="font-medium">
                        {{ isConnected ? $t('status.connectionLive') : $t('status.connectionPolling') }}
                    </span>
                </div>
                <span class="text-xs text-muted-foreground">
                    {{ $t('status.lastUpdated') }}:
                    {{ secondsSinceUpdate === 0 ? $t('status.time.justNow') : $t('status.time.sAgo', { s: secondsSinceUpdate }) }}
                </span>
            </div>
        </div>

        <!-- Section C: Queue table -->
        <div class="border-t">
            <div class="px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 class="text-base font-semibold text-foreground">{{ $t('status.queueStatus') }}</h2>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ $t('status.queueStatusSub') }}</p>
                </div>
                <button
                    class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    :disabled="queuePending"
                    @click="refreshQueues"
                >
                    <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': queuePending }" />
                    {{ $t('common.refresh') }}
                </button>
            </div>

            <div class="px-6 pb-6">
                <div class="rounded-xl border bg-card overflow-hidden">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b bg-muted/30">
                                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.queue') }}</th>
                                <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.waiting') }}</th>
                                <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.active') }}</th>
                                <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.completed') }}</th>
                                <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.failed') }}</th>
                                <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.delayed') }}</th>
                                <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.concurrency') }}</th>
                                <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.status') }}</th>
                                <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.actions') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <!-- Loading skeleton -->
                            <template v-if="queuePending && mergedQueues.length === 0">
                                <tr v-for="i in 4" :key="i" class="animate-pulse">
                                    <td class="py-3 px-4"><div class="h-4 bg-muted rounded w-40" /></td>
                                    <td v-for="j in 7" :key="j" class="py-3 px-3"><div class="h-4 bg-muted rounded ml-auto w-8" /></td>
                                    <td class="py-3 px-3"><div class="h-6 bg-muted rounded w-20" /></td>
                                </tr>
                            </template>

                            <!-- Empty state -->
                            <tr v-else-if="mergedQueues.length === 0 && !queuePending">
                                <td colspan="9" class="py-12 text-center text-sm text-muted-foreground">
                                    {{ $t('common.noResults') }}
                                </td>
                            </tr>

                            <!-- Queue rows -->
                            <tr
                                v-for="q in mergedQueues"
                                :key="q.baseName"
                                class="hover:bg-muted/30 transition-colors"
                            >
                                <!-- Queue name -->
                                <td class="py-3 px-4 font-mono text-xs text-foreground font-medium">{{ q.baseName }}</td>

                                <!-- Waiting -->
                                <td class="py-3 px-3 text-right tabular-nums">
                                    <span :class="q.counts.waiting > 0 ? 'text-stat-amber font-medium' : 'text-muted-foreground'">
                                        {{ q.counts.waiting }}
                                    </span>
                                </td>

                                <!-- Active -->
                                <td class="py-3 px-3 text-right tabular-nums">
                                    <span :class="q.counts.active > 0 ? 'text-stat-blue font-medium' : 'text-muted-foreground'">
                                        {{ q.counts.active }}
                                    </span>
                                </td>

                                <!-- Completed -->
                                <td class="py-3 px-3 text-right tabular-nums text-stat-green">
                                    {{ q.counts.completed.toLocaleString() }}
                                </td>

                                <!-- Failed (clickable) -->
                                <td class="py-3 px-3 text-right tabular-nums">
                                    <button
                                        v-if="q.counts.failed > 0"
                                        class="text-stat-rose font-medium underline decoration-dotted hover:decoration-solid transition-all"
                                        @click="openDrawer(q.baseName)"
                                    >
                                        {{ q.counts.failed }}
                                    </button>
                                    <span v-else class="text-muted-foreground">0</span>
                                </td>

                                <!-- Delayed -->
                                <td class="py-3 px-3 text-right tabular-nums">
                                    <span :class="q.counts.delayed > 0 ? 'text-muted-foreground font-medium' : 'text-muted-foreground'">
                                        {{ q.counts.delayed }}
                                    </span>
                                </td>

                                <!-- Concurrency -->
                                <td class="py-3 px-3 text-right tabular-nums text-muted-foreground">
                                    {{ q.config.concurrency }}
                                </td>

                                <!-- Status badge -->
                                <td class="py-3 px-3 text-center">
                                    <span
                                        class="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                                        :class="{
                                            'bg-stat-amber/10 text-stat-amber': queueStatus(q) === 'paused',
                                            'bg-stat-green/10 text-stat-green': queueStatus(q) === 'active',
                                            'bg-muted text-muted-foreground': queueStatus(q) === 'idle',
                                        }"
                                    >
                                        <span class="inline-block h-1.5 w-1.5 rounded-full"
                                            :class="{
                                                'bg-stat-amber': queueStatus(q) === 'paused',
                                                'bg-stat-green': queueStatus(q) === 'active',
                                                'bg-muted-foreground': queueStatus(q) === 'idle',
                                            }"
                                        />
                                        {{ queueStatus(q) === 'paused'
                                            ? $t('status.queueStatuses.paused')
                                            : queueStatus(q) === 'active'
                                                ? $t('status.queueStatuses.active')
                                                : $t('status.queueStatuses.idle') }}
                                    </span>
                                </td>

                                <!-- Actions -->
                                <td class="py-3 px-3">
                                    <div class="flex items-center gap-1.5">
                                        <!-- Pause / Resume hidden — public platform, reserved for admin panel -->

                                        <!-- View failures -->
                                        <button
                                            class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            :disabled="q.counts.failed === 0"
                                            @click="openDrawer(q.baseName)"
                                        >
                                            <AlertCircle class="h-3 w-3" />
                                            {{ $t('status.actions.viewFailures') }}
                                        </button>

                                        <!-- Retry all (admin-only action) -->
                                        <button
                                            v-if="isAdmin"
                                            class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs border border-stat-rose/50 text-stat-rose hover:bg-stat-rose/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            :disabled="q.counts.failed === 0"
                                            @click="openRetryAll(q)"
                                        >
                                            <RefreshCw class="h-3 w-3" />
                                            {{ $t('status.actions.retryAll') }} ({{ q.counts.failed }})
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Section D: Sync health panel (collapsible) -->
        <div v-if="syncAvailable" class="border-t">
            <button
                class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
                @click="syncPanelOpen = !syncPanelOpen"
            >
                <div>
                    <h2 class="text-base font-semibold text-foreground">{{ $t('status.syncHealth.title') }}</h2>
                </div>
                <ChevronDown
                    class="h-4 w-4 text-muted-foreground transition-transform"
                    :class="{ 'rotate-180': syncPanelOpen }"
                />
            </button>

            <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
            >
                <div v-if="syncPanelOpen" class="px-6 pb-6 space-y-4">
                    <!-- Lag indicator -->
                    <div class="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
                        <div>
                            <p class="text-xs text-muted-foreground">{{ $t('status.syncHealth.lastSynced') }}</p>
                            <p class="font-semibold text-foreground">{{ lastSyncedDisplay }}</p>
                        </div>
                        <div class="border-l pl-4">
                            <p class="text-xs text-muted-foreground">{{ $t('status.syncHealth.lag') }}</p>
                            <p class="font-semibold tabular-nums" :class="lagColor">
                                {{ syncStatus?.lagSeconds ?? 0 }}s
                            </p>
                        </div>
                    </div>

                    <!-- Topics table -->
                    <div v-if="syncStatus?.totalTopics">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('status.syncHealth.topics') }}</h3>
                            <span class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6">
                                {{ (syncTopicsData?.total ?? syncStatus.totalTopics).toLocaleString() }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap mb-2">
                            <input
                                v-model="topicSearch"
                                type="text"
                                :placeholder="$t('status.syncHealth.searchTopicPlaceholder')"
                                class="h-8 rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
                            />
                            <SingleSelect
                                v-model="topicStatusFilter"
                                :options="topicStatusOptions"
                                highlight-active
                                class="w-36"
                            />
                            <button
                                v-if="topicFiltersActive"
                                class="inline-flex items-center gap-1 h-8 rounded-md px-3 text-sm border border-border hover:bg-muted transition-colors text-muted-foreground"
                                @click="clearTopicFilters"
                            >
                                <X class="h-3.5 w-3.5" />
                                {{ $t('common.clear') }}
                            </button>
                        </div>

                        <!-- Manual requeue (admin-only action) -->
                        <div v-if="isAdmin" class="flex items-center gap-2 flex-wrap mb-2 rounded-md border border-dashed bg-muted/20 px-3 py-2">
                            <span class="text-xs font-medium text-muted-foreground">{{ $t('status.syncHealth.requeueTopicLabel') }}</span>
                            <input
                                v-model="requeueInput"
                                type="text"
                                :placeholder="$t('status.syncHealth.requeueTopicPlaceholder')"
                                class="h-8 rounded-md border border-input bg-card px-3 font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-40"
                                @keyup.enter="requeueTopic(requeueInput, requeueFromStart)"
                            />
                            <label class="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                                <input
                                    v-model="requeueFromStart"
                                    type="checkbox"
                                    class="h-3.5 w-3.5 rounded border-border accent-primary"
                                />
                                {{ $t('status.syncHealth.fromStartLabel') }}
                            </label>
                            <button
                                :disabled="!requeueInput.trim() || !!requeuePending[requeueInput.trim()]"
                                class="inline-flex items-center gap-1 h-8 rounded-md px-3 text-xs font-medium border border-primary/50 text-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                @click="requeueTopic(requeueInput, requeueFromStart)"
                            >
                                <Loader2 v-if="requeuePending[requeueInput.trim()]" class="h-3 w-3 animate-spin" />
                                <RefreshCw v-else class="h-3 w-3" />
                                {{ $t('status.syncHealth.queueButton') }}
                            </button>
                        </div>
                        <div class="rounded-lg border bg-card overflow-hidden">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.topicId') }}</th>
                                        <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.messages') }}</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.hasNext') }}</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.status') }}</th>
                                        <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.lastUpdate') }}</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.action') }}</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <tr v-if="topicsPending">
                                        <td colspan="6" class="py-6 text-center text-xs text-muted-foreground">{{ $t('common.loading') }}</td>
                                    </tr>
                                    <tr v-else-if="(syncTopicsData?.topics ?? []).length === 0">
                                        <td colspan="6" class="py-6 text-center text-xs text-muted-foreground">{{ $t('status.syncHealth.noTopicsFound') }}</td>
                                    </tr>
                                    <tr v-for="topic in (syncTopicsData?.topics ?? [])" :key="topic.topicId" class="hover:bg-muted/20">
                                        <td class="py-2 px-3 font-mono text-xs">{{ topic.topicId }}</td>
                                        <td class="py-2 px-3 text-right tabular-nums">{{ topic.messageCount.toLocaleString() }}</td>
                                        <td class="py-2 px-3 text-center">
                                            <span
                                                class="text-xs rounded-full px-2 py-0.5 font-medium"
                                                :class="topic.hasNext ? 'bg-stat-amber/10 text-stat-amber' : 'bg-muted text-muted-foreground'"
                                            >
                                                {{ topic.hasNext ? $t('common.yes') : $t('common.no') }}
                                            </span>
                                        </td>
                                        <td class="py-2 px-3 text-center">
                                            <span class="text-xs bg-muted rounded px-1.5 py-0.5">{{ topic.status }}</span>
                                        </td>
                                        <td class="py-2 px-3 text-right text-muted-foreground text-xs">{{ formatRelativeTime(topic.lastUpdate) }}</td>
                                        <td class="py-2 px-3 text-center">
                                            <button
                                                v-if="isAdmin"
                                                :disabled="!!requeuePending[topic.topicId]"
                                                :title="$t('status.syncHealth.requeueTooltip')"
                                                class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                                                @click="requeueTopic(topic.topicId, false)"
                                            >
                                                <Loader2 v-if="requeuePending[topic.topicId]" class="h-3 w-3 animate-spin" />
                                                <RefreshCw v-else class="h-3 w-3" />
                                                {{ $t('status.syncHealth.requeueButton') }}
                                            </button>
                                            <span v-else class="text-xs text-muted-foreground">—</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            :currentPage="topicPage"
                            :totalPages="Math.ceil((syncTopicsData?.total ?? 0) / topicPageSize)"
                            :totalItems="syncTopicsData?.total ?? 0"
                            :pageSize="topicPageSize"
                            @update:currentPage="onSyncTopicPageChange"
                            @update:pageSize="onSyncTopicPageSizeChange"
                        />
                    </div>

                    <!-- Tokens table -->
                    <div v-if="syncTokensData?.total || tokenSearch || tokenTypeFilter">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('status.syncHealth.tokens') }}</h3>
                            <span class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6">
                                {{ (syncTokensData?.total ?? 0).toLocaleString() }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap mb-2">
                            <input
                                v-model="tokenSearch"
                                type="text"
                                :placeholder="$t('status.syncHealth.searchTokenPlaceholder')"
                                class="h-8 rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
                            />
                            <SingleSelect
                                v-model="tokenTypeFilter"
                                :options="tokenTypeOptions"
                                highlight-active
                                class="w-36"
                            />
                            <button
                                v-if="tokenFiltersActive"
                                class="inline-flex items-center gap-1 h-8 rounded-md px-3 text-sm border border-border hover:bg-muted transition-colors text-muted-foreground"
                                @click="clearTokenFilters"
                            >
                                <X class="h-3.5 w-3.5" />
                                {{ $t('common.clear') }}
                            </button>
                        </div>
                        <div class="rounded-lg border bg-card overflow-hidden">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.tokenId') }}</th>
                                        <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.serial') }}</th>
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.type') }}</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.columns.hasNext') }}</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <tr v-if="tokensPending">
                                        <td colspan="4" class="py-6 text-center text-xs text-muted-foreground">{{ $t('common.loading') }}</td>
                                    </tr>
                                    <tr v-else-if="(syncTokensData?.tokens ?? []).length === 0">
                                        <td colspan="4" class="py-6 text-center text-xs text-muted-foreground">{{ $t('status.syncHealth.noTokensFound') }}</td>
                                    </tr>
                                    <tr v-for="token in (syncTokensData?.tokens ?? [])" :key="token.tokenId" class="hover:bg-muted/20">
                                        <td class="py-2 px-3 font-mono text-xs">{{ token.tokenId }}</td>
                                        <td class="py-2 px-3 text-right tabular-nums">{{ token.serialNumber }}</td>
                                        <td class="py-2 px-3 text-xs">{{ token.type }}</td>
                                        <td class="py-2 px-3 text-center">
                                            <span
                                                class="text-xs rounded-full px-2 py-0.5 font-medium"
                                                :class="token.hasNext ? 'bg-stat-amber/10 text-stat-amber' : 'bg-muted text-muted-foreground'"
                                            >
                                                {{ token.hasNext ? $t('common.yes') : $t('common.no') }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            :currentPage="tokenPage"
                            :totalPages="Math.ceil((syncTokensData?.total ?? 0) / tokenPageSize)"
                            :totalItems="syncTokensData?.total ?? 0"
                            :pageSize="tokenPageSize"
                            @update:currentPage="onSyncTokenPageChange"
                            @update:pageSize="onSyncTokenPageSizeChange"
                        />
                    </div>
                </div>
            </Transition>
        </div>

        <!-- Section D2: Guardian Sync (only when a guardian-sync process is running) -->
        <div v-if="isAdmin && guardianSync?.enabled" class="border-t">
            <button
                class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
                @click="guardianSyncPanelOpen = !guardianSyncPanelOpen"
            >
                <div class="flex items-center gap-2">
                    <span
                        class="inline-block h-2 w-2 rounded-full"
                        :class="guardianSync.instances.some((i) => i.connected) ? 'bg-stat-green animate-pulse' : 'bg-stat-amber'"
                    />
                    <h2 class="text-base font-semibold text-foreground">{{ $t('status.guardianSync.title') }}</h2>
                    <span class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6">
                        {{ guardianSync.instances.length }}
                    </span>
                </div>
                <ChevronDown
                    class="h-4 w-4 text-muted-foreground transition-transform"
                    :class="{ 'rotate-180': guardianSyncPanelOpen }"
                />
            </button>

            <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
            >
                <div v-if="guardianSyncPanelOpen" class="px-6 pb-6 space-y-4">
                    <p class="text-xs text-muted-foreground">
                        {{ $t('status.guardianSync.description') }}
                    </p>

                    <!-- Instances table -->
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('status.guardianSync.instances') }}</h3>
                            <span class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6">
                                {{ guardianSync.instances.length }}
                            </span>
                        </div>
                        <div class="rounded-lg border bg-card overflow-hidden">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b bg-muted/30">
                                    <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.instance') }}</th>
                                    <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.aemEndpoint') }}</th>
                                    <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.status') }}</th>
                                    <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.events') }}</th>
                                    <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.lastEvent') }}</th>
                                    <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.lastSubject') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <tr v-if="guardianSync.instances.length === 0">
                                    <td colspan="6" class="py-6 text-center text-xs text-muted-foreground">{{ $t('status.guardianSync.noInstances') }}</td>
                                </tr>
                                <tr v-for="inst in guardianSync.instances" :key="inst.id" class="hover:bg-muted/20">
                                    <td class="py-2 px-3 font-mono text-xs text-foreground">{{ inst.id }}</td>
                                    <td class="py-2 px-3 font-mono text-xs text-muted-foreground">{{ inst.aemUrl }}</td>
                                    <td class="py-2 px-3 text-center">
                                        <span
                                            class="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                                            :class="inst.connected ? 'bg-stat-green/10 text-stat-green' : 'bg-stat-amber/10 text-stat-amber'"
                                        >
                                            <span class="inline-block h-1.5 w-1.5 rounded-full" :class="inst.connected ? 'bg-stat-green' : 'bg-stat-amber'" />
                                            {{ inst.connected ? $t('status.guardianSync.connected') : $t('status.guardianSync.reconnecting') }}
                                        </span>
                                    </td>
                                    <td class="py-2 px-3 text-right tabular-nums">{{ inst.eventsProcessed.toLocaleString() }}</td>
                                    <td class="py-2 px-3 text-right text-muted-foreground text-xs">{{ formatRelativeMs(inst.lastEventAt) }}</td>
                                    <td class="py-2 px-3 font-mono text-[11px] text-muted-foreground">{{ inst.lastSubject ? inst.lastSubject.split('.').pop() : '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                        </div>
                    </div>

                    <!-- Recent triggers table -->
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-semibold text-foreground">{{ $t('status.guardianSync.recentTriggers') }}</h3>
                            <span class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6">
                                {{ (guardianEventsData?.total ?? 0).toLocaleString() }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap mb-2">
                            <SingleSelect
                                v-model="guardianEventSubject"
                                :options="guardianEventOptions"
                                highlight-active
                                class="w-44"
                            />
                        </div>
                        <div class="rounded-lg border bg-card overflow-hidden">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.when') }}</th>
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.event') }}</th>
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.ref') }}</th>
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.guardianSync.columns.action') }}</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <tr v-if="(guardianEventsData?.events ?? []).length === 0">
                                        <td colspan="4" class="py-6 text-center text-xs text-muted-foreground">{{ $t('status.guardianSync.noTriggers') }}</td>
                                    </tr>
                                    <tr v-for="(ev, i) in (guardianEventsData?.events ?? [])" :key="i" class="hover:bg-muted/20">
                                        <td class="py-2 px-3 text-muted-foreground text-xs whitespace-nowrap">{{ formatRelativeMs(new Date(ev.createdAt).getTime()) }}</td>
                                        <td class="py-2 px-3 font-mono text-[11px]">{{ ev.subject.split('.').pop() }}</td>
                                        <td class="py-2 px-3 font-mono text-[11px] text-muted-foreground">{{ ev.refId ? (ev.refType ? ev.refType + ':' : '') + ev.refId : '—' }}</td>
                                        <td class="py-2 px-3 text-xs">{{ ev.action }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            :currentPage="guardianEventPage"
                            :totalPages="Math.ceil((guardianEventsData?.total ?? 0) / guardianEventPageSize)"
                            :totalItems="guardianEventsData?.total ?? 0"
                            :pageSize="guardianEventPageSize"
                            @update:currentPage="onGuardianEventPageChange"
                            @update:pageSize="onGuardianEventPageSizeChange"
                        />
                    </div>

                    <p class="text-[11px] text-muted-foreground mt-2">
                        {{ $t('status.guardianSync.heartbeat', { time: formatRelativeMs(guardianSync.updatedAt) }) }}
                    </p>
                </div>
            </Transition>
        </div>

        <!-- Section E-pre: IPFS Documents (collapsible) -->
        <div class="border-t">
            <button
                class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
                @click="ipfsFailuresPanelOpen = !ipfsFailuresPanelOpen"
            >
                <div class="flex items-center gap-2">
                    <FileWarning class="h-4 w-4 text-muted-foreground" />
                    <div>
                        <h2 class="text-base font-semibold text-foreground">{{ $t('status.ipfs.title') }}</h2>
                    </div>
                    <span
                        v-if="ipfsFailuresTotal > 0"
                        class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6"
                    >
                        {{ ipfsFailuresTotal.toLocaleString() }}
                    </span>
                    <span
                        v-else-if="!ipfsFailuresPending"
                        class="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 min-w-6"
                    >
                        0
                    </span>
                </div>
                <div class="flex items-center gap-3">
                    <button
                        v-if="isAdmin && ipfsTopicFilter && ipfsHasFailedRows && !ipfsFailuresPending"
                        class="inline-flex items-center gap-1 text-xs text-stat-rose border border-stat-rose/50 hover:bg-stat-rose/5 rounded px-2 py-1 transition-colors disabled:opacity-50"
                        :disabled="ipfsRetryAllTopicPending"
                        @click.stop="retryAllIpfsForTopic"
                    >
                        <Loader2 v-if="ipfsRetryAllTopicPending" class="h-3 w-3 animate-spin" />
                        <RefreshCw v-else class="h-3 w-3" />
                        {{ $t('status.ipfs.retryAllForTopic') }}
                    </button>
                    <ChevronDown
                        class="h-4 w-4 text-muted-foreground transition-transform"
                        :class="{ 'rotate-180': ipfsFailuresPanelOpen }"
                    />
                </div>
            </button>

            <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
            >
                <div v-if="ipfsFailuresPanelOpen" class="px-6 pb-6 space-y-3">
                    <!-- Filter bar -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <input
                            v-model="ipfsTopicFilterRaw"
                            type="text"
                            :placeholder="$t('status.ipfs.filterTopicPlaceholder')"
                            class="h-9 rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
                        />
                        <label
                            v-if="ipfsTopicFilter"
                            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground select-none cursor-pointer"
                        >
                            <input
                                v-model="ipfsIncludeChildTopics"
                                type="checkbox"
                                class="rounded border-input"
                            />
                            {{ $t('status.ipfs.includeChildTopics') }}
                        </label>
                        <!-- Message type filter -->
                        <SingleSelect
                            v-model="ipfsMessageTypeFilter"
                            :options="ipfsMessageTypeOptions"
                            highlight-active
                            class="w-44"
                        />
                        <!-- Status filter -->
                        <SingleSelect
                            v-model="ipfsStatusFilter"
                            :options="ipfsStatusOptions"
                            highlight-active
                            class="w-36"
                        />
                        <!-- Error category filter — only relevant when showing failed items -->
                        <SingleSelect
                            v-if="ipfsStatusFilter === 'failed' || ipfsStatusFilter === ''"
                            v-model="ipfsErrorCategoryFilter"
                            :options="ipfsErrorCategoryOptions"
                            highlight-active
                            class="w-36"
                        />
                        <button
                            v-if="ipfsFiltersActive"
                            class="inline-flex items-center gap-1 h-9 rounded-md px-3 text-sm border border-border hover:bg-muted transition-colors text-muted-foreground"
                            @click="clearIpfsFilters"
                        >
                            <X class="h-3.5 w-3.5" />
                            {{ $t('common.clear') }}
                        </button>
                        <button
                            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                            :disabled="ipfsFailuresPending"
                            @click="refreshIpfsFailures()"
                        >
                            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': ipfsFailuresPending }" />
                            {{ $t('common.refresh') }}
                        </button>
                    </div>

                    <!-- Table -->
                    <div class="rounded-xl border bg-card overflow-hidden">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b bg-muted/30">
                                    <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.cid') }}</th>
                                    <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.cidV1') }}</th>
                                    <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.topicId') }}</th>
                                    <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.type') }}</th>
                                    <th class="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.status') }}</th>
                                    <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.error') }}</th>
                                    <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.attempts') }}</th>
                                    <th class="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.lastFailed') }}</th>
                                    <th class="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('status.ipfs.columns.actions') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <!-- Loading skeleton -->
                                <template v-if="ipfsFailuresPending && ipfsFailures.length === 0">
                                    <tr v-for="i in 4" :key="i" class="animate-pulse">
                                        <td class="py-3 px-4"><div class="h-4 bg-muted rounded w-32" /></td>
                                        <td class="py-3 px-3"><div class="h-4 bg-muted rounded w-28" /></td>
                                        <td class="py-3 px-3"><div class="h-4 bg-muted rounded w-20" /></td>
                                        <td class="py-3 px-3"><div class="h-4 bg-muted rounded w-20" /></td>
                                        <td class="py-3 px-3"><div class="h-5 bg-muted rounded-full w-16 mx-auto" /></td>
                                        <td class="py-3 px-3"><div class="h-4 bg-muted rounded w-48" /></td>
                                        <td class="py-3 px-3"><div class="h-4 bg-muted rounded w-8 ml-auto" /></td>
                                        <td class="py-3 px-3"><div class="h-4 bg-muted rounded w-16 ml-auto" /></td>
                                        <td class="py-3 px-3"><div class="h-6 bg-muted rounded w-14" /></td>
                                    </tr>
                                </template>

                                <!-- Empty state -->
                                <tr v-else-if="ipfsFailures.length === 0 && !ipfsFailuresPending">
                                    <td colspan="9" class="py-12 text-center text-sm text-muted-foreground">
                                        {{ $t('status.ipfs.noDocuments') }}
                                    </td>
                                </tr>

                                <!-- CID rows -->
                                <tr
                                    v-for="row in ipfsFailures"
                                    :key="row.cid"
                                    class="hover:bg-muted/30 transition-colors"
                                >
                                    <!-- CID (mono, truncated, with copy) -->
                                    <td class="py-3 px-4 max-w-[160px]">
                                        <div class="group flex items-center gap-1.5">
                                            <span :title="row.cid" class="block truncate font-mono text-xs text-foreground">{{ row.cid }}</span>
                                            <button
                                                class="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                                :title="$t('status.ipfs.copyCid')"
                                                @click.stop="copyToClipboard(row.cid)"
                                            >
                                                <Check v-if="copiedValue === row.cid" class="h-3 w-3 text-stat-green" />
                                                <Copy v-else class="h-3 w-3" />
                                            </button>
                                        </div>
                                    </td>

                                    <!-- CID v1 (mono, truncated, with copy) -->
                                    <td class="py-3 px-3 max-w-[160px]">
                                        <div class="group flex items-center gap-1.5">
                                            <span :title="row.cidV1" class="block truncate font-mono text-xs text-muted-foreground">{{ row.cidV1 }}</span>
                                            <button
                                                class="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                                :title="$t('status.ipfs.copyCidV1')"
                                                @click.stop="copyToClipboard(row.cidV1)"
                                            >
                                                <Check v-if="copiedValue === row.cidV1" class="h-3 w-3 text-stat-green" />
                                                <Copy v-else class="h-3 w-3" />
                                            </button>
                                        </div>
                                    </td>

                                    <!-- Topic ID -->
                                    <td class="py-3 px-3 font-mono text-xs text-muted-foreground">
                                        {{ row.topicId ?? '—' }}
                                    </td>

                                    <!-- Message type -->
                                    <td class="py-3 px-3 text-xs text-muted-foreground">
                                        <span v-if="row.messageType" class="bg-muted rounded px-1.5 py-0.5 text-xs">{{ row.messageType }}</span>
                                        <span v-else class="text-muted-foreground">—</span>
                                    </td>

                                    <!-- Status badge -->
                                    <td class="py-3 px-3 text-center">
                                        <span
                                            class="inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 capitalize"
                                            :class="ipfsStatusBadgeClass(row.status)"
                                        >
                                            {{ $t('status.ipfsStatus.' + row.status) }}
                                        </span>
                                    </td>

                                    <!-- Error (only meaningful for failed) -->
                                    <td class="py-3 px-3 text-xs text-muted-foreground max-w-[240px]">
                                        <span v-if="row.status === 'failed' && row.lastError" :title="row.lastError" class="block truncate">
                                            {{ row.lastError }}
                                        </span>
                                        <span v-else class="text-muted-foreground">—</span>
                                    </td>

                                    <!-- Attempts (only meaningful for failed) -->
                                    <td class="py-3 px-3 text-right tabular-nums text-sm">
                                        <span
                                            v-if="row.status === 'failed' && row.attemptCount !== null"
                                            :class="(row.attemptCount ?? 0) > 5 ? 'text-stat-rose font-medium' : 'text-muted-foreground'"
                                        >
                                            {{ row.attemptCount }}
                                        </span>
                                        <span v-else class="text-muted-foreground">—</span>
                                    </td>

                                    <!-- Last failed (relative time, only for failed) -->
                                    <td class="py-3 px-3 text-right text-xs text-muted-foreground tabular-nums">
                                        <span v-if="row.status === 'failed'">{{ formatRelativeTime(row.lastFailedAt) }}</span>
                                        <span v-else>—</span>
                                    </td>

                                    <!-- Actions (Retry only for failed rows) -->
                                    <td class="py-3 px-3">
                                        <button
                                            v-if="row.status === 'failed' && isAdmin"
                                            class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs border border-stat-rose/50 text-stat-rose hover:bg-stat-rose/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            :disabled="!!ipfsRetryPending[row.cid]"
                                            @click="retryIpfsFailure(row.cid)"
                                        >
                                            <Loader2 v-if="ipfsRetryPending[row.cid]" class="h-3 w-3 animate-spin" />
                                            <RefreshCw v-else class="h-3 w-3" />
                                            {{ $t('status.actions.retry') }}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <Pagination
                        v-if="ipfsFailuresTotal > 0"
                        :currentPage="ipfsFailurePage"
                        :totalPages="ipfsFailuresTotalPages"
                        :totalItems="ipfsFailuresTotal"
                        :pageSize="ipfsFailurePageSize"
                        @update:currentPage="onIpfsFailurePageChange"
                        @update:pageSize="onIpfsFailurePageSizeChange"
                    />
                </div>
            </Transition>
        </div>

        <!-- Section E-pre2: Maintenance (collapsible) — admin-only -->
        <div v-if="isAdmin" class="border-t">
            <button
                class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
                @click="maintenancePanelOpen = !maintenancePanelOpen"
            >
                <div class="flex items-center gap-2">
                    <Settings class="h-4 w-4 text-muted-foreground" />
                    <h2 class="text-base font-semibold text-foreground">{{ $t('status.maintenance.title') }}</h2>
                </div>
                <ChevronDown
                    class="h-4 w-4 text-muted-foreground transition-transform"
                    :class="{ 'rotate-180': maintenancePanelOpen }"
                />
            </button>

            <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
            >
                <div v-if="maintenancePanelOpen" class="px-6 pb-6 space-y-3">
                    <p class="text-xs text-muted-foreground">
                        {{ $t('status.maintenance.description') }}
                    </p>
                    <div class="flex flex-wrap gap-3">
                        <button
                            class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="redecodeAllPending"
                            @click="triggerRedecodeAll"
                        >
                            <Loader2 v-if="redecodeAllPending" class="h-4 w-4 animate-spin" />
                            <RefreshCw v-else class="h-4 w-4" />
                            {{ $t('status.maintenance.redecodeAll') }}
                        </button>
                        <button
                            class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="reparseAllPending"
                            @click="triggerReparseAll"
                        >
                            <Loader2 v-if="reparseAllPending" class="h-4 w-4 animate-spin" />
                            <RefreshCw v-else class="h-4 w-4" />
                            {{ $t('status.maintenance.reparseAll') }}
                        </button>
                    </div>
                </div>
            </Transition>
        </div>

        <!-- Section E: Recent activity feed -->
        <div class="border-t">
            <div class="px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 class="text-base font-semibold text-foreground">{{ $t('status.activity.title') }}</h2>
                    <p class="text-xs text-muted-foreground mt-0.5">
                        {{ filteredEvents.length }} {{ $t('status.activity.events') }}
                        <span v-if="recentEvents.length >= 50" class="text-stat-amber"> {{ $t('status.activity.bufferFull') }}</span>
                    </p>
                </div>
                <!-- Filter toggle -->
                <div class="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs font-medium">
                    <button
                        class="rounded-md px-3 py-1.5 transition-colors"
                        :class="activityFilter === 'all'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'"
                        @click="activityFilter = 'all'"
                    >
                        {{ $t('status.activity.filterAll') }}
                    </button>
                    <button
                        class="rounded-md px-3 py-1.5 transition-colors flex items-center gap-1"
                        :class="activityFilter === 'failures'
                            ? 'bg-card text-stat-rose shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'"
                        @click="activityFilter = 'failures'"
                    >
                        {{ $t('status.activity.filterFailures') }}
                        <span
                            v-if="recentEvents.filter(e => e.type === 'job-failed' || e.type === 'ipfs-fetch-failed').length > 0"
                            class="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-stat-rose/10 text-stat-rose text-[10px] px-1"
                        >
                            {{ recentEvents.filter(e => e.type === 'job-failed' || e.type === 'ipfs-fetch-failed').length }}
                        </span>
                    </button>
                </div>
            </div>

            <div class="px-6 pb-6">
                <div class="rounded-xl border bg-card overflow-hidden">
                    <!-- Empty state -->
                    <div
                        v-if="filteredEvents.length === 0"
                        class="py-12 text-center text-sm text-muted-foreground"
                    >
                        {{ activityFilter === 'failures' ? $t('status.activity.emptyFailures') : $t('status.activity.empty') }}
                    </div>

                    <!-- Event rows -->
                    <div v-else class="divide-y max-h-[480px] overflow-y-auto">
                        <div
                            v-for="(ev, idx) in filteredEvents"
                            :key="`${ev.ts}-${idx}`"
                            class="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                            :class="(ev.type === 'job-failed' || ev.type === 'ipfs-fetch-failed') ? 'bg-stat-rose/5' : ''"
                        >
                            <span class="text-xs text-muted-foreground font-mono shrink-0 pt-0.5 w-18">
                                {{ formatTs(ev.ts) }}
                            </span>
                            <span
                                class="shrink-0 text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap"
                                :class="eventBadgeClass[ev.type] ?? 'bg-muted text-muted-foreground'"
                            >
                                {{ eventLabel(ev.type) }}
                            </span>
                            <span class="text-xs text-muted-foreground font-mono min-w-0 break-all">
                                {{ eventDetails(ev) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Retry-all confirmation overlay (inline, above table) -->
        <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="retryAllState"
                class="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
                @click.self="cancelRetryAll"
            >
                <div class="bg-card rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4 mx-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h3 class="font-semibold text-foreground">{{ $t('status.retryAll.confirm') }}</h3>
                            <i18n-t keypath="status.retryAll.confirmBody" tag="p" class="text-sm text-muted-foreground mt-1">
                                <template #count>{{ retryAllState.failedCount }}</template>
                                <template #baseName>
                                    <code class="font-mono text-xs bg-muted px-1 rounded">{{ retryAllState.baseName }}</code>
                                </template>
                                <template #budget>{{ MANUAL_RETRY_BUDGET }}</template>
                            </i18n-t>
                        </div>
                        <button class="text-muted-foreground hover:text-foreground" @click="cancelRetryAll">
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                            v-model="retryAllState.force"
                            type="checkbox"
                            class="h-4 w-4 rounded border-border"
                        />
                        <span>{{ $t('status.retryAll.force') }}</span>
                    </label>

                    <div class="flex items-center justify-end gap-2">
                        <button
                            class="rounded px-3 py-1.5 text-sm border border-border hover:bg-muted transition-colors"
                            @click="cancelRetryAll"
                        >
                            {{ $t('common.cancel') }}
                        </button>
                        <button
                            class="rounded px-3 py-1.5 text-sm bg-stat-rose text-white hover:bg-stat-rose/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                            :disabled="retryAllState.pending"
                            @click="confirmRetryAll"
                        >
                            <Loader2 v-if="retryAllState.pending" class="h-3.5 w-3.5 animate-spin" />
                            <RefreshCw v-else class="h-3.5 w-3.5" />
                            {{ $t('status.actions.retryAll') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Failed jobs drawer -->
        <Transition
            enter-active-class="transition-transform duration-300 ease-out"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition-transform duration-200 ease-in"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
        >
            <div
                v-if="drawerBaseName"
                class="fixed inset-y-0 right-0 z-50 flex"
            >
                <!-- Scrim -->
                <div
                    class="fixed inset-0 bg-black/20"
                    @click="closeDrawer"
                />

                <!-- Drawer panel -->
                <div class="relative ml-auto w-full max-w-2xl bg-card border-l shadow-2xl flex flex-col">
                    <!-- Drawer header -->
                    <div class="flex items-center justify-between border-b px-5 py-4 shrink-0">
                        <div>
                            <h2 class="font-semibold text-foreground">
                                {{ $t('status.failedDrawer.title') }} —
                                <code class="font-mono text-sm">{{ drawerBaseName }}</code>
                            </h2>
                            <p class="text-xs text-muted-foreground mt-0.5">
                                <template v-if="drawerSearch">
                                    {{ $t('status.failedDrawer.searchMatches', { count: filteredFailedJobs.length, total: failedJobs?.total ?? 0 }) }}
                                </template>
                                <template v-else>
                                    {{ $t('status.failedDrawer.failedCount', { count: failedJobs?.total ?? 0 }) }}
                                </template>
                            </p>
                        </div>
                        <button
                            class="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            @click="closeDrawer"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <!-- Tabs -->
                    <div class="flex border-b shrink-0">
                        <button
                            class="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
                            :class="drawerTab === 'byReason'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'"
                            @click="drawerTab = 'byReason'"
                        >
                            {{ $t('status.failedDrawer.byReason') }}
                        </button>
                        <button
                            class="px-5 py-2.5 text-sm font-medium border-b-2 transition-colors"
                            :class="drawerTab === 'allFailed'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'"
                            @click="drawerTab = 'allFailed'"
                        >
                            {{ $t('status.failedDrawer.allFailed') }}
                        </button>
                    </div>

                    <!-- Tab content -->
                    <div class="flex-1 overflow-y-auto p-5 space-y-3">

                        <!-- By reason tab -->
                        <template v-if="drawerTab === 'byReason'">
                            <div v-if="groupsPending" class="space-y-3">
                                <div v-for="i in 3" :key="i" class="rounded-lg border p-4 animate-pulse space-y-2">
                                    <div class="h-4 bg-muted rounded w-3/4" />
                                    <div class="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>

                            <div v-else-if="failedGroups?.length === 0" class="py-12 text-center text-sm text-muted-foreground">
                                {{ $t('status.failedDrawer.noGroupsFound') }}
                            </div>

                            <div
                                v-for="group in failedGroups"
                                :key="group.reason"
                                class="rounded-lg border bg-card p-4 space-y-2"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <p class="text-sm font-medium text-foreground truncate max-w-xs" :title="group.reason || $t('status.failedDrawer.noReason')">
                                        {{ formatFailedReason(group.reason) }}
                                    </p>
                                    <span class="shrink-0 text-xs text-muted-foreground font-medium">
                                        {{ $t('status.failedDrawer.count', { count: group.count }) }}
                                    </span>
                                </div>
                                <div class="flex flex-wrap gap-1">
                                    <code
                                        v-for="id in group.sampleJobIds?.slice(0, 3)"
                                        :key="id"
                                        class="text-xs bg-muted rounded px-1.5 py-0.5 font-mono"
                                    >
                                        {{ id }}
                                    </code>
                                </div>
                                <button
                                    v-if="isAdmin"
                                    class="inline-flex items-center gap-1 text-xs rounded px-2 py-1 border border-stat-rose/50 text-stat-rose hover:bg-stat-rose/5 transition-colors"
                                    @click="openRetryAll({ baseName: drawerBaseName!, fullName: '', counts: { waiting: 0, active: 0, completed: 0, failed: group.count, delayed: 0, paused: 0 }, config: { concurrency: 1, attempts: 3, backoffType: '', backoffDelay: 0 }, isPaused: false })"
                                >
                                    <RefreshCw class="h-3 w-3" />
                                    {{ $t('status.failedDrawer.retryGroup') }}
                                </button>
                            </div>

                            <!-- Groups pagination -->
                            <Pagination
                                v-if="groupsTotal > 0"
                                :currentPage="groupPage"
                                :totalPages="Math.ceil(groupsTotal / groupPageSize)"
                                :totalItems="groupsTotal"
                                :pageSize="groupPageSize"
                                @update:currentPage="onGroupPageChange"
                                @update:pageSize="onGroupPageSizeChange"
                            />
                        </template>

                        <!-- All failed tab -->
                        <template v-if="drawerTab === 'allFailed'">
                            <!-- Search -->
                            <div class="pb-1">
                                <input
                                    v-model="drawerSearch"
                                    type="text"
                                    :placeholder="$t('status.failedDrawer.filterPlaceholder')"
                                    class="w-full h-8 rounded border border-border bg-muted/30 px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <p v-if="drawerSearch && !failedPending" class="mt-1 text-xs text-muted-foreground">
                                    <template v-if="filteredFailedJobs.length === 0">{{ $t('status.failedDrawer.noSearchMatchesOnPage', { search: drawerSearch }) }}</template>
                                    <template v-else>{{ $t('status.failedDrawer.searchMatchesOnPage', { count: filteredFailedJobs.length }) }}</template>
                                </p>
                            </div>

                            <div v-if="failedPending" class="space-y-2">
                                <div v-for="i in 5" :key="i" class="rounded-lg border p-4 animate-pulse space-y-2">
                                    <div class="h-4 bg-muted rounded w-full" />
                                    <div class="h-3 bg-muted rounded w-2/3" />
                                </div>
                            </div>

                            <div v-else-if="failedJobs?.items?.length === 0" class="py-12 text-center text-sm text-muted-foreground">
                                {{ $t('status.failedDrawer.noFailedJobs') }}
                            </div>

                            <div
                                v-for="job in filteredFailedJobs"
                                :key="job.id"
                                class="rounded-lg border bg-card p-4 space-y-2 transition-opacity"
                                :class="{ 'opacity-0': jobRetryStates[job.id]?.done }"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <code class="text-xs font-mono text-muted-foreground truncate max-w-50">{{ job.id }}</code>
                                    <span class="text-xs text-muted-foreground shrink-0">{{ formatRelativeTime(new Date(job.finishedOn ?? job.timestamp).toISOString()) }}</span>
                                </div>

                                <p class="text-sm text-foreground" :title="job.failedReason || $t('status.failedDrawer.noReason')">
                                    {{ formatFailedReason(job.failedReason) }}
                                </p>

                                <div class="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{{ $t('status.failedDrawer.attempts') }}: {{ job.attemptsMade }}/{{ mergedQueues.find(q => q.baseName === drawerBaseName)?.config.attempts ?? '?' }}</span>
                                    <span
                                        :class="job.manualRetryCount >= MANUAL_RETRY_BUDGET ? 'text-stat-rose font-medium' : ''"
                                    >
                                        {{ $t('status.failedDrawer.manualRetries') }}: {{ job.manualRetryCount }}/{{ MANUAL_RETRY_BUDGET }}
                                    </span>
                                </div>

                                <!-- Retry controls (admin-only action) -->
                                <div v-if="isAdmin" class="flex items-center gap-2">
                                    <template v-if="!jobRetryStates[job.id]?.confirming && !jobRetryStates[job.id]?.done">
                                        <button
                                            class="inline-flex items-center gap-1 text-xs rounded px-2 py-1 border border-border hover:bg-muted transition-colors"
                                            :class="{ 'opacity-50 cursor-not-allowed': job.manualRetryCount >= MANUAL_RETRY_BUDGET && !jobRetryStates[job.id]?.force }"
                                            :disabled="job.manualRetryCount >= MANUAL_RETRY_BUDGET && !jobRetryStates[job.id]?.force"
                                            @click="startConfirmRetry(job.id)"
                                        >
                                            <RefreshCw class="h-3 w-3" />
                                            {{ $t('status.failedDrawer.retryJob') }}
                                        </button>

                                        <label
                                            v-if="job.manualRetryCount >= MANUAL_RETRY_BUDGET"
                                            class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none"
                                        >
                                            <input
                                                v-model="getJobRetry(job.id).force"
                                                type="checkbox"
                                                class="h-3.5 w-3.5 rounded border-border"
                                            />
                                            {{ $t('status.failedDrawer.forceRetry') }}
                                        </label>

                                        <span
                                            v-if="job.manualRetryCount >= MANUAL_RETRY_BUDGET"
                                            class="text-xs text-stat-rose"
                                        >
                                            {{ $t('status.failedDrawer.budgetExhausted') }}
                                        </span>
                                    </template>

                                    <!-- Confirmation inline -->
                                    <template v-else-if="jobRetryStates[job.id]?.confirming">
                                        <span class="text-xs text-muted-foreground">{{ $t('status.failedDrawer.confirmRetryQuestion') }}</span>
                                        <button
                                            class="inline-flex items-center gap-1 text-xs rounded px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                            :disabled="jobRetryStates[job.id]?.pending"
                                            @click="confirmRetryJob(job)"
                                        >
                                            <Loader2 v-if="jobRetryStates[job.id]?.pending" class="h-3 w-3 animate-spin" />
                                            <CheckCircle2 v-else class="h-3 w-3" />
                                            {{ $t('status.failedDrawer.yesRetry') }}
                                        </button>
                                        <button
                                            class="text-xs rounded px-2 py-1 border border-border hover:bg-muted transition-colors"
                                            @click="cancelRetry(job.id)"
                                        >
                                            {{ $t('common.cancel') }}
                                        </button>
                                    </template>

                                    <!-- Done state -->
                                    <span v-else-if="jobRetryStates[job.id]?.done" class="text-xs text-stat-green flex items-center gap-1">
                                        <CheckCircle2 class="h-3 w-3" />
                                        {{ $t('status.failedDrawer.retriedState') }}
                                    </span>
                                </div>

                                <!-- Inline error -->
                                <p v-if="jobRetryStates[job.id]?.error" class="text-xs text-stat-rose">
                                    {{ jobRetryStates[job.id]?.error }}
                                </p>

                                <!-- Stacktrace collapsible -->
                                <details v-if="job.stacktrace?.length" class="text-xs">
                                    <summary class="cursor-pointer text-muted-foreground hover:text-foreground select-none">{{ $t('status.failedDrawer.stackTrace') }}</summary>
                                    <pre class="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto max-h-32 font-mono whitespace-pre-wrap break-all">{{ job.stacktrace.join('\n') }}</pre>
                                </details>
                            </div>

                            <!-- Pagination — hidden while search is active (filter is client-side / current page only) -->
                            <Pagination
                                v-if="!drawerSearch && (failedJobs?.total ?? 0) > 0"
                                :currentPage="failedPage"
                                :totalPages="Math.ceil((failedJobs?.total ?? 0) / failedPageSize)"
                                :totalItems="failedJobs?.total ?? 0"
                                :pageSize="failedPageSize"
                                @update:currentPage="onFailedPageChange"
                                @update:pageSize="onFailedPageSizeChange"
                            />
                        </template>
                    </div>

                    <!-- Drawer footer actions -->
                    <div class="border-t px-5 py-3 flex items-center justify-between shrink-0">
                        <button
                            class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                            :disabled="failedPending"
                            @click="drawerTab === 'byReason' ? refreshGroups() : refreshFailed()"
                        >
                            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': failedPending || groupsPending }" />
                            {{ $t('common.refresh') }}
                        </button>
                        <button
                            class="text-sm rounded px-3 py-1.5 border border-border hover:bg-muted transition-colors"
                            @click="closeDrawer"
                        >
                            {{ $t('common.close') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
