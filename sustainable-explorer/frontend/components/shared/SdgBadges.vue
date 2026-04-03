<script setup lang="ts">
import { getSDG } from '~/lib/sdgs';

const props = defineProps<{
    ids: number[];
    max?: number;
}>();

const maxShow = props.max ?? 5;
const visible = computed(() => props.ids.slice(0, maxShow));
const overflow = computed(() => Math.max(0, props.ids.length - maxShow));

function sdgIcon(id: number): string {
    return `/sdgs/E-WEB-Goal-${String(id).padStart(2, '0')}.png`;
}
</script>

<template>
    <div class="flex items-center gap-1">
        <div
            v-for="id in visible"
            :key="id"
            class="group relative"
        >
            <img
                :src="sdgIcon(id)"
                :alt="`SDG ${id}`"
                class="h-7 w-7 rounded-sm cursor-default"
            />
            <!-- Tooltip -->
            <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <div class="whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] text-background shadow-lg">
                    SDG {{ id }}: {{ getSDG(id)?.name }}
                </div>
                <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
            </div>
        </div>
        <span
            v-if="overflow > 0"
            class="flex h-7 min-w-[1.75rem] items-center justify-center rounded-sm bg-muted px-1 text-[10px] font-medium text-muted-foreground cursor-default"
        >
            +{{ overflow }}
        </span>
    </div>
</template>
