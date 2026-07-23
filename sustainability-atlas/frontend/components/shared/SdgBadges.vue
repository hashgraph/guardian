<script setup lang="ts">
import { getSDG } from '~/lib/sdgs';

const props = defineProps<{
    ids: number[];
    max?: number;
}>();

const maxShow = props.max ?? 5;
const visible = computed(() => props.ids.slice(0, maxShow));
const hidden = computed(() => props.ids.slice(maxShow));
const overflow = computed(() => hidden.value.length);

function sdgIcon(id: number): string {
    return `/sdgs/E-WEB-Goal-${String(id).padStart(2, '0')}.png`;
}

function sdgLabel(id: number): string {
    return `SDG ${id}: ${getSDG(id)?.name ?? ''}`;
}

// Teleported to <body> and positioned via getBoundingClientRect (same
// technique as InfoTooltip.vue) rather than a CSS-only absolute/group-hover
// tooltip — a badge inside any ancestor with overflow:hidden (e.g. the
// Watched Projects carousel's paging viewport) would otherwise clip it.
// `hoveredTarget` is either a single SDG id (icon hover) or the literal
// 'overflow' (the "+N" badge, whose tooltip lists every hidden SDG).
const hoveredTarget = ref<number | 'overflow' | null>(null);
const tooltipStyle = ref<Record<string, string>>({});

function onEnter(e: MouseEvent, target: number | 'overflow'): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let left = rect.left + rect.width / 2;
    const top = rect.top - 8;

    const tooltipMaxWidth = 220;
    const halfWidth = tooltipMaxWidth / 2;
    if (left - halfWidth < 8) left = halfWidth + 8;
    if (left + halfWidth > viewportWidth - 8) left = viewportWidth - halfWidth - 8;

    tooltipStyle.value = {
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: '9999',
    };
    hoveredTarget.value = target;
}

function onLeave(): void {
    hoveredTarget.value = null;
}
</script>

<template>
    <div class="flex items-center gap-1">
        <img
            v-for="id in visible"
            :key="id"
            :src="sdgIcon(id)"
            :alt="`SDG ${id}`"
            class="h-7 w-7 min-w-7 object-contain shrink-0 rounded-sm cursor-default"
            @mouseenter="onEnter($event, id)"
            @mouseleave="onLeave"
        />
        <span
            v-if="overflow > 0"
            class="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-sm bg-muted px-1 text-[10px] font-medium text-muted-foreground cursor-default"
            @mouseenter="onEnter($event, 'overflow')"
            @mouseleave="onLeave"
        >
            +{{ overflow }}
        </span>

        <Teleport to="body">
            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div v-if="hoveredTarget !== null" :style="tooltipStyle" class="pointer-events-none">
                    <div class="rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg">
                        <div v-if="hoveredTarget === 'overflow'" class="space-y-0.5">
                            <div v-for="id in hidden" :key="id" class="whitespace-nowrap">{{ sdgLabel(id) }}</div>
                        </div>
                        <div v-else class="whitespace-nowrap">{{ sdgLabel(hoveredTarget) }}</div>
                    </div>
                    <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
