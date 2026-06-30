<script setup lang="ts">
import { FolderKanban, BookOpen, Building2, Coins, X } from 'lucide-vue-next';
import type { WatchlistItemType } from '~/composables/usePortfolioWatchlist';

const props = defineProps<{
    label: string;
    type: WatchlistItemType;
}>();

const emit = defineEmits<{ remove: [] }>();

const iconMap = {
    project: FolderKanban,
    methodology: BookOpen,
    registry: Building2,
    token: Coins,
};

const icon = computed(() => iconMap[props.type]);
</script>

<template>
    <div
        class="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground max-w-[200px]"
    >
        <component :is="icon" class="h-3 w-3 shrink-0 text-muted-foreground" />
        <span class="truncate">{{ label }}</span>
        <button
            class="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('remove')"
        >
            <X class="h-2.5 w-2.5" />
        </button>
    </div>
</template>
