export interface LiveCounts {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}

export interface RecentFailure {
    queueBase: string;
    jobId: string;
    failedReason: string;
    ts: number;
}

export interface RecentEvent {
    type: string;
    payload: Record<string, any>;
    ts: number;
}

const EVENT_BUFFER_SIZE = 50;
// job-completed is throttled per queue: at most 1 entry every 5 s in the feed.
// Failed/stalled/IPFS events always pass through immediately.
const COMPLETION_THROTTLE_MS = 5_000;

export const useQueueEventsSse = (opts: { network: Ref<string>; baseURL: string }) => {
    const isConnected = ref(false);
    const liveCounts = ref<Record<string, LiveCounts>>({});
    const recentFailures = ref<RecentFailure[]>([]);
    const recentEvents = ref<RecentEvent[]>([]);
    const lastEventAt = ref<number>(Date.now());

    // Throttle: track when each queue last emitted a job-completed row
    const lastCompletionTs = new Map<string, number>();

    let es: EventSource | null = null;

    const prepend = (evt: RecentEvent) => {
        recentEvents.value = [evt, ...recentEvents.value].slice(0, EVENT_BUFFER_SIZE);
    };

    const connect = () => {
        if (!import.meta.client) return;

        if (es) {
            es.close();
            es = null;
            isConnected.value = false;
        }

        const url = `${opts.baseURL}/api/v1/${opts.network.value}/queues/events`;

        try {
            es = new EventSource(url);

            es.onopen = () => {
                isConnected.value = true;
                lastEventAt.value = Date.now();
            };

            es.onerror = () => {
                isConnected.value = false;
            };

            es.onmessage = (event: MessageEvent) => {
                lastEventAt.value = Date.now();
                try {
                    handleEvent(JSON.parse(event.data));
                } catch { /* ignore */ }
            };

            const eventTypes = [
                'job-completed', 'job-failed', 'job-active', 'job-waiting',
                'job-stalled', 'counts-changed', 'se-event', 'heartbeat',
            ];

            for (const type of eventTypes) {
                es.addEventListener(type, (event: Event) => {
                    lastEventAt.value = Date.now();
                    isConnected.value = true;
                    try {
                        handleEvent({ type, ...JSON.parse((event as MessageEvent).data) });
                    } catch { /* ignore */ }
                });
            }
        } catch (err) {
            console.error('[useQueueEventsSse] connect failed:', (err as Error)?.message ?? String(err));
            isConnected.value = false;
        }
    };

    const handleEvent = (data: Record<string, any>) => {
        const type = data.type as string;
        const now = Date.now();

        switch (type) {
            case 'counts-changed': {
                const base = data.queueBase as string;
                if (base) {
                    liveCounts.value = {
                        ...liveCounts.value,
                        [base]: {
                            waiting:   data.counts?.waiting   ?? 0,
                            active:    data.counts?.active    ?? 0,
                            completed: data.counts?.completed ?? 0,
                            failed:    data.counts?.failed    ?? 0,
                            delayed:   data.counts?.delayed   ?? 0,
                            paused:    data.counts?.paused    ?? 0,
                        },
                    };
                }
                break;
            }

            case 'job-completed': {
                // Throttle: skip if this queue emitted a completion row recently
                const base = (data.queueBase ?? 'unknown') as string;
                const last = lastCompletionTs.get(base) ?? 0;
                if (now - last >= COMPLETION_THROTTLE_MS) {
                    lastCompletionTs.set(base, now);
                    prepend({ type: 'job-completed', payload: data, ts: now });
                }
                break;
            }

            case 'job-failed': {
                recentFailures.value = [
                    {
                        queueBase:    data.queueBase    ?? '',
                        jobId:        data.jobId        ?? '',
                        failedReason: data.failedReason ?? 'Unknown error',
                        ts:           now,
                    },
                    ...recentFailures.value,
                ].slice(0, 200);
                prepend({ type: 'job-failed', payload: data, ts: now });
                break;
            }

            case 'job-stalled':
                prepend({ type: 'job-stalled', payload: data, ts: now });
                break;

            case 'se-event': {
                const payload = data.payload ?? data;
                const evType = payload.type as string;
                if (
                    evType === 'ipfs-fetch-failed' ||
                    evType === 'ipfs-fetch-recovered' ||
                    evType === 'document-loaded'
                ) {
                    prepend({ type: evType, payload, ts: now });
                }
                break;
            }

            case 'heartbeat':
                break;

            default:
                break;
        }
    };

    if (import.meta.client) {
        watch(() => opts.network.value, () => {
            lastCompletionTs.clear();
            connect();
        });

        onMounted(() => { connect(); });

        onUnmounted(() => {
            if (es) { es.close(); es = null; }
            isConnected.value = false;
        });
    }

    return { isConnected, liveCounts, recentFailures, recentEvents, lastEventAt };
};
