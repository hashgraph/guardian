<script setup lang="ts">
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-vue-next';
import type { SortDirection } from '~/composables/useFilteredPagination';

const props = defineProps<{
    label: string;
    sortKey: string;
    activeSortKey: string | null;
    sortDir: SortDirection;
    tooltip?: string;
    /** Show a compact "Mock data" badge next to the label. */
    mock?: boolean;
    /** Text alignment; use 'right' or 'center' so the header lines up with equivalently aligned cell values. */
    align?: 'left' | 'right' | 'center';
}>();

const emit = defineEmits<{
    sort: [key: string];
}>();

const isActive = computed(() => props.activeSortKey === props.sortKey);

const alignClass = computed(() => {
    if (props.align === 'right') return 'text-right';
    if (props.align === 'center') return 'text-center';
    return 'text-left';
});
</script>

<template>
    <th
        :class="[
            'py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors group whitespace-nowrap',
            alignClass,
        ]"
        @click="emit('sort', sortKey)"
    >
        <span class="inline-flex flex-col gap-1">
            <span class="inline-flex items-center gap-1">
                <span>{{ label }}</span>
                <InfoTooltip v-if="tooltip" :text="tooltip" />
                <ArrowUp v-if="isActive && sortDir === 'asc'" class="h-3 w-3 text-foreground" />
                <ArrowDown v-else-if="isActive && sortDir === 'desc'" class="h-3 w-3 text-foreground" />
                <ArrowUpDown v-else class="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            </span>
            <MockDataBadge v-if="mock" compact />
        </span>
    </th>
</template>
