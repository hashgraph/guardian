<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useNotificationDisplay } from '~/composables/useNotificationDisplay';
import { useConfirmClick } from '~/composables/useConfirmClick';
import { useNotificationExpand } from '~/composables/useNotificationExpand';
import type { NotificationItem } from '~/composables/useNotifications';

// Right-side slide-over treatment (à la a job-queue "failed jobs" drawer),
// teleported to <body> so it isn't clipped by the topbar's overflow/z-index.
const props = defineProps<{
    open: boolean;
    items: NotificationItem[];
    loading: boolean;
    loadingMore: boolean;
    nextCursor: string | null;
    unreadCount: number;
    filter: 'all' | 'unread';
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'markRead', id: string): void;
    (e: 'markAllRead'): void;
    (e: 'clearAll'): void;
    (e: 'loadMore'): void;
    (e: 'setFilter', value: 'all' | 'unread'): void;
}>();

const { t } = useI18n();
const { iconFor, colorFor, typeLabelFor, describe, projectNameFor, registryNameFor, methodologyFor, volumeLabelFor } = useNotificationDisplay();

const { toggle, isExpanded } = useNotificationExpand((id) => emit('markRead', id));

const { confirming: confirmingClear, trigger: onClearAllClick } = useConfirmClick(() => emit('clearAll'));
</script>

<template>
    <Teleport to="body">
        <!-- Transparent — mirrors the reference drawer's look (page stays
             fully visible), the sole job of this layer is to close the panel
             on an outside click without the ref-forwarding a Teleport'd
             onClickOutside would otherwise need. -->
        <div
            v-if="props.open"
            class="fixed inset-0 z-40"
            @click="emit('close')"
        />

        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
        >
            <div
                v-if="props.open"
                class="fixed top-12 bottom-0 right-0 z-50 flex w-80 flex-col border-l bg-popover shadow-xl"
                @click.stop
            >
                <div class="flex shrink-0 items-center justify-between border-b px-4 py-3">
                    <p class="text-sm font-semibold text-foreground">{{ t('notifications.title') }}</p>
                    <div class="flex items-center gap-3">
                        <button
                            class="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
                            :disabled="props.unreadCount === 0"
                            @click="emit('markAllRead')"
                        >
                            {{ t('notifications.markAllRead') }}
                        </button>
                        <button
                            class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            :aria-label="t('common.close')"
                            @click="emit('close')"
                        >
                            <X class="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                <div class="flex shrink-0 items-center gap-1 border-b px-4 py-2">
                    <button
                        class="rounded px-2 py-1 text-xs font-medium transition-colors"
                        :class="props.filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'"
                        @click="emit('setFilter', 'all')"
                    >
                        {{ t('notifications.tabs.all') }}
                    </button>
                    <button
                        class="rounded px-2 py-1 text-xs font-medium transition-colors"
                        :class="props.filter === 'unread' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'"
                        @click="emit('setFilter', 'unread')"
                    >
                        {{ t('notifications.tabs.unread') }}
                    </button>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div v-if="props.loading && props.items.length === 0" class="px-4 py-10 text-center text-sm text-muted-foreground">
                        {{ t('notifications.loading') }}
                    </div>
                    <div v-else-if="props.items.length === 0" class="px-4 py-10 text-center text-sm text-muted-foreground">
                        {{ t('notifications.empty') }}
                    </div>

                    <button
                        v-for="item in props.items"
                        :key="item.id"
                        class="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent"
                        :class="!item.isRead ? 'bg-primary/5' : ''"
                        @click="toggle(item)"
                    >
                        <component :is="iconFor(item.type)" :class="['h-4 w-4 mt-0.5 shrink-0', colorFor(item.type)]" />
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5">
                                <span :class="['text-[10px] font-semibold uppercase tracking-wide', colorFor(item.type)]">{{ typeLabelFor(item) }}</span>
                                <span v-if="!item.isRead" class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            </div>
                            <p class="mt-0.5 line-clamp-2 text-xs font-medium text-foreground">{{ describe(item) }}</p>
                            <p class="mt-0.5 truncate text-[10px] text-muted-foreground">{{ projectNameFor(item) }} · {{ timeAgo(item.createdAt) }}</p>

                            <div v-if="isExpanded(item.id)" class="mt-2 space-y-2 rounded-md border bg-muted/40 px-2.5 py-2 text-[11px]">
                                <div>
                                    <div class="text-[10px] text-muted-foreground">{{ t('notifications.detail.project') }}</div>
                                    <div class="break-words font-medium text-foreground">{{ projectNameFor(item) }}</div>
                                </div>
                                <div v-if="registryNameFor(item)">
                                    <div class="text-[10px] text-muted-foreground">{{ t('notifications.detail.registry') }}</div>
                                    <div class="break-words font-medium text-foreground">{{ registryNameFor(item) }}</div>
                                </div>
                                <div v-if="methodologyFor(item)">
                                    <div class="text-[10px] text-muted-foreground">{{ t('notifications.detail.methodology') }}</div>
                                    <div class="break-words font-medium text-foreground">{{ methodologyFor(item) }}</div>
                                </div>
                                <div v-if="volumeLabelFor(item)" class="flex items-center justify-between gap-2">
                                    <span class="text-[10px] text-muted-foreground">{{ t('notifications.detail.volume') }}</span>
                                    <span class="font-medium text-foreground">{{ volumeLabelFor(item) }}</span>
                                </div>
                            </div>
                        </div>
                    </button>

                    <button
                        v-if="props.nextCursor && props.items.length > 0"
                        class="w-full px-4 py-3 text-center text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                        :disabled="props.loadingMore"
                        @click="emit('loadMore')"
                    >
                        {{ props.loadingMore ? t('notifications.loadingMore') : t('notifications.loadMore') }}
                    </button>
                </div>

                <div class="shrink-0 border-t px-4 py-3">
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
    </Teleport>
</template>
