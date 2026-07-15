<script setup lang="ts">
import { Bell } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const { t } = useI18n();
const { isAuthenticated } = useAuth();
const { network } = useNetwork();
const {
    items, unreadCount, loading, loadingMore, nextCursor, filter,
    fetchUnreadCount, fetchList, setFilter, markRead, markAllRead, clearAll,
} = useNotifications();

const open = ref(false);
const unreadBadge = computed(() => (unreadCount.value > 9 ? '9+' : String(unreadCount.value)));

// --- SSE: live nudges refresh the unread count (and, while the panel is
// open, the list itself). See useNotificationsSse.ts for the connection
// lifecycle — it mirrors useQueueEventsSse.ts exactly.
const config = useRuntimeConfig();
const sseBaseURL = import.meta.client
    ? (config.public.sseApiBaseUrl as string) || 'http://localhost:3030'
    : '';
useNotificationsSse({ network, open, baseURL: sseBaseURL });

onMounted(() => {
    if (isAuthenticated.value) void fetchUnreadCount();
});

watch(open, (isOpen) => {
    // Refetch both the list AND the badge count on open — the count must not
    // depend solely on the SSE push having landed (e.g. a notification
    // created while this tab's connection missed the nudge would otherwise
    // leave the badge stale until a full page reload).
    if (isOpen) {
        void fetchList({ reset: true });
        void fetchUnreadCount();
    }
});

function onClearAll() {
    void clearAll().then((success) => {
        if (success) toast.success(t('notifications.clearedToast'));
        else toast.error(t('notifications.clearError'));
    });
}

// markRead fires on every row expand (frequent, low-stakes — a silent revert
// is enough) but markAllRead and loadMore are deliberate, explicit user
// actions like clearAll, so their failures get the same toast treatment.
function onMarkAllRead() {
    void markAllRead().then((success) => {
        if (!success) toast.error(t('notifications.markAllReadError'));
    });
}

function onLoadMore() {
    void fetchList({ reset: false }).then((success) => {
        if (!success) toast.error(t('notifications.loadMoreError'));
    });
}
</script>

<template>
    <div v-if="isAuthenticated" class="relative flex items-center">
        <button
            class="relative inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
            :class="open ? 'bg-muted text-foreground' : ''"
            :aria-label="t('notifications.title')"
            @click="open = !open"
        >
            <Bell class="h-3.5 w-3.5" />
            <span
                v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground"
            >
                {{ unreadBadge }}
            </span>
        </button>
    </div>

    <NotificationPanel
        v-if="isAuthenticated"
        :open="open"
        :items="items"
        :loading="loading"
        :loading-more="loadingMore"
        :next-cursor="nextCursor"
        :unread-count="unreadCount"
        :filter="filter"
        @close="open = false"
        @mark-read="markRead"
        @mark-all-read="onMarkAllRead"
        @clear-all="onClearAll"
        @load-more="onLoadMore"
        @set-filter="setFilter"
    />
</template>
