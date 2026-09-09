import { toast } from 'vue-sonner';

/**
 * Watchlist-notifications live-push composable — mirrors useQueueEventsSse.ts's
 * exact shape: raw EventSource with withCredentials, client-only guards, a
 * `isConnected` ref, cleanup in onUnmounted, and reconnect-on-network-change
 * via a watch(). No manual reconnect/backoff loop — native EventSource retry
 * handles that on its own.
 *
 * The stream itself only pushes a "something changed" nudge
 * ({ userId, network, type }), never the notification body, so on each nudge
 * we re-fetch the unread count (and, if the bell dropdown is open, the list)
 * from useNotifications() rather than trying to construct a notification
 * from the SSE payload.
 */
export const useNotificationsSse = (opts: { network: Ref<string>; open: Ref<boolean>; baseURL: string }) => {
    const isConnected = ref(false);
    const lastEventAt = ref<number>(Date.now());

    const { fetchUnreadCount, fetchList } = useNotifications();
    const { t } = useI18n();

    let es: EventSource | null = null;

    const handleNudge = (data: Record<string, any>) => {
        // Ignore nudges for a network the user isn't currently viewing —
        // the stream isn't network-scoped, messages carry `network` themselves.
        if (data.network && data.network !== opts.network.value) return;

        void fetchUnreadCount();
        if (opts.open.value) void fetchList({ reset: true });

        toast(t('notifications.toast.newArrival'));
    };

    const connect = () => {
        if (!import.meta.client) return;

        if (es) {
            es.close();
            es = null;
            isConnected.value = false;
        }

        const url = `${opts.baseURL}/api/v1/me/notifications/events`;

        try {
            // withCredentials sends the auth cookie cross-origin — this stream is
            // cookie-authenticated (same session as the rest of /api/v1/me/*).
            es = new EventSource(url, { withCredentials: true });

            es.onopen = () => {
                isConnected.value = true;
                lastEventAt.value = Date.now();
            };

            es.onerror = () => {
                isConnected.value = false;
            };

            // Default "message" events carry the { userId, network, type } nudge.
            es.onmessage = (event: MessageEvent) => {
                lastEventAt.value = Date.now();
                try {
                    handleNudge(JSON.parse(event.data));
                } catch { /* ignore */ }
            };

            // Heartbeats are keep-alive only — they just prove the connection is
            // alive and never trigger a re-fetch or toast.
            es.addEventListener('heartbeat', () => {
                lastEventAt.value = Date.now();
                isConnected.value = true;
            });
        } catch (err) {
            console.error('[useNotificationsSse] connect failed:', (err as Error)?.message ?? String(err));
            isConnected.value = false;
        }
    };

    if (import.meta.client) {
        watch(() => opts.network.value, () => {
            connect();
        });

        onMounted(() => { connect(); });

        onUnmounted(() => {
            if (es) { es.close(); es = null; }
            isConnected.value = false;
        });
    }

    return { isConnected, lastEventAt };
};
