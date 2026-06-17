<script setup lang="ts">
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-vue-next';
import type { SortDirection } from '~/composables/useFilteredPagination';

const props = defineProps<{
    label: string;
    sortKey: string;
    activeSortKey: string | null;
    sortDir: SortDirection;
    align?: 'left' | 'right';
    tooltip?: string;
    /** Show a compact "Mock data" badge next to the label. */
    mock?: boolean;
}>();

const emit = defineEmits<{
    sort: [key: string];
}>();

const isActive = computed(() => props.activeSortKey === props.sortKey);
</script>

<template>
    <th
        class="py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors group"
        :class="align === 'right' ? 'text-right' : 'text-left'"
        @click="emit('sort', sortKey)"
    >
        <span
            class="inline-flex items-start gap-1"
            :class="align === 'right' ? 'justify-end' : 'justify-start'"
        >
            <span class="inline-flex items-center gap-1 flex-wrap">
                <span>{{ label }}</span>
                <MockDataBadge v-if="mock" compact />
            </span>
            <span class="flex flex-col items-center shrink-0 mt-0.5">
                <InfoTooltip v-if="tooltip" :text="tooltip" />
                <ArrowUp v-if="isActive && sortDir === 'asc'" class="h-3 w-3 text-foreground" />
                <ArrowDown v-else-if="isActive && sortDir === 'desc'" class="h-3 w-3 text-foreground" />
                <ArrowUpDown v-else class="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            </span>
        </span>
    </th>
</template>
