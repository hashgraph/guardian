<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { Bell, TrendingUp, Flame, ArrowLeftRight } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { formatCredits } from '~/lib/format';
import type { NotificationItem } from '~/composables/useNotifications';

const { t } = useI18n();
const { isAuthenticated: reallyAuthenticated } = useAuth();
// TEMPORARY (UI-testing only, dev-only, dead-code-eliminated in prod): render
// the bell even when logged out, so it's visible with no backend running.
// Revert to plain `reallyAuthenticated` once tested against a real login.
const isAuthenticated = computed(() => reallyAuthenticated.value || import.meta.dev);
const { network } = useNetwork();
const {
    items, unreadCount, loading, loadingMore, nextCursor,
    fetchUnreadCount, fetchList, markRead, markAllRead, clearAll,
} = useNotifications();

const open = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
onClickOutside(wrapperRef, () => { open.value = false; });

const unreadBadge = computed(() => (unreadCount.value > 9 ? '9+' : String(unreadCount.value)));

// --- Row presentation: icon/color per notification type, plus a short
// human description built from type + payload.amount. `type` is currently
// always 'issuance' server-side, but retirement/transfer are handled
// generically since the field already exists on the model.
const TYPE_ICON: Record<string, any> = {
    issuance: TrendingUp,
    retirement: Flame,
    transfer: ArrowLeftRight,
};
const TYPE_COLOR: Record<string, string> = {
    issuance: 'text-stat-green',
    retirement: 'text-stat-amber',
    transfer: 'text-stat-blue',
};

function iconFor(type: string) {
    return TYPE_ICON[type] ?? Bell;
}
function colorFor(type: string) {
    return TYPE_COLOR[type] ?? 'text-muted-foreground';
}

function amountLabel(item: NotificationItem): string | null {
    const amount = item.payload?.amount;
    if (typeof amount === 'number') return formatCredits(amount);
    if (typeof amount === 'string' && amount.trim()) return amount;
    return null;
}

function describe(item: NotificationItem): string {
    const amount = amountLabel(item);
    const key = ['issuance', 'retirement', 'transfer'].includes(item.type) ? item.type : 'issuance';
    return amount
        ? t(`notifications.description.${key}`, { amount })
        : t(`notifications.description.${key}NoAmount`);
}

function projectNameFor(item: NotificationItem): string {
    const name = item.payload?.projectName;
    return typeof name === 'string' && name.trim() ? name : item.projectKey;
}

function onRowClick(item: NotificationItem) {
    if (!item.isRead) void markRead(item.id);
}

// --- SSE: live nudges refresh the unread count (and, while the dropdown is
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
    if (isOpen) void fetchList({ reset: true });
});

// --- Clear all: 3-second inline-confirm, local to this component.
const confirmingClear = ref(false);
let confirmTimer: ReturnType<typeof setTimeout> | null = null;

function onClearAllClick() {
    if (!confirmingClear.value) {
        confirmingClear.value = true;
        confirmTimer = setTimeout(() => { confirmingClear.value = false; }, 3000);
        return;
    }

    if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
    confirmingClear.value = false;

    void clearAll().then((success) => {
        if (success) toast.success(t('notifications.clearedToast'));
        else toast.error(t('notifications.clearError'));
    });
}

onUnmounted(() => {
    if (confirmTimer) clearTimeout(confirmTimer);
});
</script>

<template>
    <div v-if="isAuthenticated" ref="wrapperRef" class="relative flex items-center">
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

        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="open"
                class="absolute right-0 top-full mt-1 flex h-[30rem] w-96 flex-col overflow-hidden rounded-md border bg-popover shadow-md"
            >
                <div class="flex shrink-0 items-center justify-between border-b px-3 py-2">
                    <p class="text-sm font-medium text-foreground">{{ t('notifications.title') }}</p>
                    <button
                        class="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
                        :disabled="unreadCount === 0"
                        @click="markAllRead()"
                    >
                        {{ t('notifications.markAllRead') }}
                    </button>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div v-if="loading && items.length === 0" class="px-3 py-10 text-center text-sm text-muted-foreground">
                        {{ t('notifications.loading') }}
                    </div>
                    <div v-else-if="items.length === 0" class="px-3 py-10 text-center text-sm text-muted-foreground">
                        {{ t('notifications.empty') }}
                    </div>

                    <button
                        v-for="item in items"
                        :key="item.id"
                        class="flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent"
                        :class="!item.isRead ? 'bg-primary/5' : ''"
                        @click="onRowClick(item)"
                    >
                        <component :is="iconFor(item.type)" :class="['h-4 w-4 mt-0.5 shrink-0', colorFor(item.type)]" />
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5">
                                <p class="truncate text-xs font-medium text-foreground">{{ projectNameFor(item) }}</p>
                                <span v-if="!item.isRead" class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            </div>
                            <p class="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{{ describe(item) }}</p>
                            <p class="mt-0.5 text-[10px] text-muted-foreground/70">{{ timeAgo(item.createdAt) }}</p>
                        </div>
                    </button>

                    <button
                        v-if="nextCursor && items.length > 0"
                        class="w-full px-3 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                        :disabled="loadingMore"
                        @click="fetchList({ reset: false })"
                    >
                        {{ loadingMore ? t('notifications.loadingMore') : t('notifications.loadMore') }}
                    </button>
                </div>

                <div class="shrink-0 border-t px-3 py-2">
                    <button
                        class="text-xs font-medium transition-colors"
                        :class="confirmingClear ? 'text-destructive hover:text-destructive/80' : 'text-muted-foreground hover:text-foreground'"
                        @click="onClearAllClick"
                    >
                        {{ confirmingClear ? t('notifications.clearAllConfirm') : t('notifications.clearAll') }}
                    </button>
                </div>
            </div>
        </Transition>
    </div>
</template>
