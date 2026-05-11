<script setup lang="ts">
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Clock,
    Loader2,
    RefreshCw,
    X,
} from 'lucide-vue-next';
import type {
    FailedJobDto,
    QueueStatusItemDto,
} from '~/composables/api/useQueueStatusApi';

const { t } = useI18n();
const { network } = useNetwork();
const config = useRuntimeConfig();

// ─── API composables ──────────────────────────────────────────────────────────

const {
    data: queueList,
    pending: queuePending,
    refresh: refreshQueues,
} = useQueueListApi({ network });

const {
    data: syncStatus,
    available: syncAvailable,
} = useSyncStatusApi({ network });

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

onMounted(() => {
    pollTimer = setInterval(() => {
        refreshQueues();
    }, 30_000);
});

onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
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
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function formatLagHuman(seconds: number): string {
    if (seconds < 60) return `${seconds}s lag`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m lag`;
    return `${Math.floor(seconds / 3600)}h lag`;
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
        showToast(`Failed to pause ${baseName}: ${err?.message ?? 'Unknown error'}`, 'error');
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
        showToast(`Failed to resume ${baseName}: ${err?.message ?? 'Unknown error'}`, 'error');
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
        const result = await $fetch<{ retried: number; skipped: number; errors: any[] }>(
            `/api/v1/${network.value}/queues/${baseName}/retry-all-failed`,
            {
                method: 'POST',
                body: { force },
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
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
            `Retry all failed for ${baseName}: ${err?.message ?? 'Unknown error'}`,
            'error',
        );
    }
}

// ─── Failed jobs drawer ───────────────────────────────────────────────────────

const drawerBaseName = ref<string | null>(null);
const drawerTab = ref<'byReason' | 'allFailed'>('byReason');
const failedPageOffset = ref(0);

function openDrawer(baseName: string) {
    drawerBaseName.value = baseName;
    drawerTab.value = 'byReason';
    failedPageOffset.value = 0;
}

function closeDrawer() {
    drawerBaseName.value = null;
}

const { data: failedJobs, pending: failedPending, refresh: refreshFailed } =
    useQueueFailedJobsApi({
        network,
        baseName: drawerBaseName,
        limit: 50,
        offset: failedPageOffset,
    });

const { data: failedGroups, pending: groupsPending, refresh: refreshGroups } =
    useQueueFailedGroupsApi({
        network,
        baseName: drawerBaseName,
    });

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
        await $fetch(
            `/api/v1/${network.value}/queues/${drawerBaseName.value}/jobs/${job.id}/retry`,
            {
                method: 'POST',
                body: { force: state.force },
                baseURL: import.meta.client ? (config.public.apiBaseUrl as string) || '' : '',
            },
        );
        state.done = true;
        state.confirming = false;
        showToast(`Job ${job.id} queued for retry`);
        // Refresh after short delay so animation can play
        setTimeout(() => refreshFailed(), 800);
    } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 429) {
            state.error = t('status.failedDrawer.budgetExhausted');
        } else if (status === 409) {
            state.error = 'Job is no longer in failed state, refreshing...';
            setTimeout(() => refreshFailed(), 800);
        } else {
            state.error = err?.message ?? 'Retry failed';
        }
        state.pending = false;
        state.confirming = false;
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
        'job-failed': 'Job Failed',
        'job-completed': 'Job Completed',
        'job-stalled': 'Job Stalled',
        'ipfs-fetch-failed': 'IPFS Fetch Failed',
        'ipfs-fetch-recovered': 'IPFS Recovered',
        'document-loaded': 'Document Loaded',
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
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
                    {{ syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—' }}
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <Clock class="h-3.5 w-3.5 text-muted-foreground" />
                    <span class="text-xs text-muted-foreground">
                        {{ syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' }}
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
                    {{ secondsSinceUpdate === 0 ? 'just now' : `${secondsSinceUpdate}s ago` }}
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
                    Refresh
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
                                    No queues found
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

                                        <!-- Retry all -->
                                        <button
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
                    <div v-if="syncStatus?.topics?.length">
                        <h3 class="text-sm font-semibold text-foreground mb-2">{{ $t('status.syncHealth.topics') }}</h3>
                        <div class="rounded-lg border bg-card overflow-hidden">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Topic ID</th>
                                        <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Messages</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Has Next</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Update</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <tr v-for="topic in syncStatus.topics" :key="topic.topicId" class="hover:bg-muted/20">
                                        <td class="py-2 px-3 font-mono text-xs">{{ topic.topicId }}</td>
                                        <td class="py-2 px-3 text-right tabular-nums">{{ topic.messageCount.toLocaleString() }}</td>
                                        <td class="py-2 px-3 text-center">
                                            <span
                                                class="text-xs rounded-full px-2 py-0.5 font-medium"
                                                :class="topic.hasNext ? 'bg-stat-amber/10 text-stat-amber' : 'bg-muted text-muted-foreground'"
                                            >
                                                {{ topic.hasNext ? 'Yes' : 'No' }}
                                            </span>
                                        </td>
                                        <td class="py-2 px-3 text-center">
                                            <span class="text-xs bg-muted rounded px-1.5 py-0.5">{{ topic.status }}</span>
                                        </td>
                                        <td class="py-2 px-3 text-right text-muted-foreground text-xs">{{ formatRelativeTime(topic.lastUpdate) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tokens table -->
                    <div v-if="syncStatus?.tokens?.length">
                        <h3 class="text-sm font-semibold text-foreground mb-2">{{ $t('status.syncHealth.tokens') }}</h3>
                        <div class="rounded-lg border bg-card overflow-hidden">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b bg-muted/30">
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Token ID</th>
                                        <th class="text-right py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Serial</th>
                                        <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                                        <th class="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Has Next</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    <tr v-for="token in syncStatus.tokens" :key="token.tokenId" class="hover:bg-muted/20">
                                        <td class="py-2 px-3 font-mono text-xs">{{ token.tokenId }}</td>
                                        <td class="py-2 px-3 text-right tabular-nums">{{ token.serialNumber }}</td>
                                        <td class="py-2 px-3 text-xs">{{ token.type }}</td>
                                        <td class="py-2 px-3 text-center">
                                            <span
                                                class="text-xs rounded-full px-2 py-0.5 font-medium"
                                                :class="token.hasNext ? 'bg-stat-amber/10 text-stat-amber' : 'bg-muted text-muted-foreground'"
                                            >
                                                {{ token.hasNext ? 'Yes' : 'No' }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
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
                        <span v-if="recentEvents.length >= 50" class="text-stat-amber"> (buffer full — oldest may be lost)</span>
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
                            <p class="text-sm text-muted-foreground mt-1">
                                Retry all {{ retryAllState.failedCount }} failed jobs in
                                <code class="font-mono text-xs bg-muted px-1 rounded">{{ retryAllState.baseName }}</code>?
                                Jobs that have exceeded the {{ MANUAL_RETRY_BUDGET }}-manual-retry budget will be skipped unless Force is checked.
                            </p>
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
                            Cancel
                        </button>
                        <button
                            class="rounded px-3 py-1.5 text-sm bg-stat-rose text-white hover:bg-stat-rose/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                            :disabled="retryAllState.pending"
                            @click="confirmRetryAll"
                        >
                            <Loader2 v-if="retryAllState.pending" class="h-3.5 w-3.5 animate-spin" />
                            <RefreshCw v-else class="h-3.5 w-3.5" />
                            Retry All
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
                                {{ failedJobs?.total ?? 0 }} failed job{{ (failedJobs?.total ?? 0) === 1 ? '' : 's' }}
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
                                No groups found
                            </div>

                            <div
                                v-for="group in failedGroups"
                                :key="group.reason"
                                class="rounded-lg border bg-card p-4 space-y-2"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <p class="text-sm font-medium text-foreground truncate max-w-xs" :title="group.reason">
                                        {{ group.reason.slice(0, 80) }}{{ group.reason.length > 80 ? '…' : '' }}
                                    </p>
                                    <span class="shrink-0 text-xs text-muted-foreground font-medium">
                                        Count: {{ group.count }}
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
                                    class="inline-flex items-center gap-1 text-xs rounded px-2 py-1 border border-stat-rose/50 text-stat-rose hover:bg-stat-rose/5 transition-colors"
                                    @click="openRetryAll({ baseName: drawerBaseName!, fullName: '', counts: { waiting: 0, active: 0, completed: 0, failed: group.count, delayed: 0, paused: 0 }, config: { concurrency: 1, attempts: 3, backoffType: '', backoffDelay: 0 }, isPaused: false })"
                                >
                                    <RefreshCw class="h-3 w-3" />
                                    Retry group
                                </button>
                            </div>
                        </template>

                        <!-- All failed tab -->
                        <template v-if="drawerTab === 'allFailed'">
                            <div v-if="failedPending" class="space-y-2">
                                <div v-for="i in 5" :key="i" class="rounded-lg border p-4 animate-pulse space-y-2">
                                    <div class="h-4 bg-muted rounded w-full" />
                                    <div class="h-3 bg-muted rounded w-2/3" />
                                </div>
                            </div>

                            <div v-else-if="failedJobs?.items?.length === 0" class="py-12 text-center text-sm text-muted-foreground">
                                No failed jobs
                            </div>

                            <div
                                v-for="job in failedJobs?.items ?? []"
                                :key="job.id"
                                class="rounded-lg border bg-card p-4 space-y-2 transition-opacity"
                                :class="{ 'opacity-0': jobRetryStates[job.id]?.done }"
                            >
                                <div class="flex items-start justify-between gap-3">
                                    <code class="text-xs font-mono text-muted-foreground truncate max-w-50">{{ job.id }}</code>
                                    <span class="text-xs text-muted-foreground shrink-0">{{ formatRelativeTime(new Date(job.finishedOn ?? job.timestamp).toISOString()) }}</span>
                                </div>

                                <p class="text-sm text-foreground" :title="job.failedReason">
                                    {{ job.failedReason.slice(0, 60) }}{{ job.failedReason.length > 60 ? '…' : '' }}
                                </p>

                                <div class="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{{ $t('status.failedDrawer.attempts') }}: {{ job.attemptsMade }}/{{ mergedQueues.find(q => q.baseName === drawerBaseName)?.config.attempts ?? '?' }}</span>
                                    <span
                                        :class="job.manualRetryCount >= MANUAL_RETRY_BUDGET ? 'text-stat-rose font-medium' : ''"
                                    >
                                        {{ $t('status.failedDrawer.manualRetries') }}: {{ job.manualRetryCount }}/{{ MANUAL_RETRY_BUDGET }}
                                    </span>
                                </div>

                                <!-- Retry controls -->
                                <div class="flex items-center gap-2">
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
                                        <span class="text-xs text-muted-foreground">Confirm retry?</span>
                                        <button
                                            class="inline-flex items-center gap-1 text-xs rounded px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                            :disabled="jobRetryStates[job.id]?.pending"
                                            @click="confirmRetryJob(job)"
                                        >
                                            <Loader2 v-if="jobRetryStates[job.id]?.pending" class="h-3 w-3 animate-spin" />
                                            <CheckCircle2 v-else class="h-3 w-3" />
                                            Yes, retry
                                        </button>
                                        <button
                                            class="text-xs rounded px-2 py-1 border border-border hover:bg-muted transition-colors"
                                            @click="cancelRetry(job.id)"
                                        >
                                            Cancel
                                        </button>
                                    </template>

                                    <!-- Done state -->
                                    <span v-else-if="jobRetryStates[job.id]?.done" class="text-xs text-stat-green flex items-center gap-1">
                                        <CheckCircle2 class="h-3 w-3" />
                                        Retried
                                    </span>
                                </div>

                                <!-- Inline error -->
                                <p v-if="jobRetryStates[job.id]?.error" class="text-xs text-stat-rose">
                                    {{ jobRetryStates[job.id]?.error }}
                                </p>

                                <!-- Stacktrace collapsible -->
                                <details v-if="job.stacktrace?.length" class="text-xs">
                                    <summary class="cursor-pointer text-muted-foreground hover:text-foreground select-none">Stack trace</summary>
                                    <pre class="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto max-h-32 font-mono whitespace-pre-wrap break-all">{{ job.stacktrace.join('\n') }}</pre>
                                </details>
                            </div>

                            <!-- Pagination -->
                            <div v-if="(failedJobs?.total ?? 0) > 50" class="flex items-center justify-between pt-2">
                                <button
                                    class="text-xs rounded px-3 py-1.5 border border-border hover:bg-muted transition-colors disabled:opacity-40"
                                    :disabled="failedPageOffset <= 0"
                                    @click="failedPageOffset = Math.max(0, failedPageOffset - 50)"
                                >
                                    Previous
                                </button>
                                <span class="text-xs text-muted-foreground">
                                    {{ failedPageOffset + 1 }}–{{ Math.min(failedPageOffset + 50, failedJobs?.total ?? 0) }}
                                    of {{ failedJobs?.total ?? 0 }}
                                </span>
                                <button
                                    class="text-xs rounded px-3 py-1.5 border border-border hover:bg-muted transition-colors disabled:opacity-40"
                                    :disabled="failedPageOffset + 50 >= (failedJobs?.total ?? 0)"
                                    @click="failedPageOffset += 50"
                                >
                                    Next
                                </button>
                            </div>
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
                            Refresh
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
