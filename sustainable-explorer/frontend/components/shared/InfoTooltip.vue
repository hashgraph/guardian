<script setup lang="ts">
import { Info } from 'lucide-vue-next';

const props = defineProps<{
    text: string;
}>();

// Default usage (no slot content) renders the standalone Info icon as its own
// trigger, as before. Passing content via the default slot instead lets this
// same floating-tooltip design wrap an existing interactive element (e.g. a
// button) — in that case we don't want the icon-only affordances (help
// cursor, swallowing the click) since they'd fight with the wrapped control.
const slots = useSlots();
const hasCustomTrigger = computed(() => !!slots.default);

const show = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<Record<string, string>>({});

function updatePosition() {
    if (!triggerRef.value) return;
    const rect = triggerRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Position above the icon, centered
    let left = rect.left + rect.width / 2;
    const top = rect.top - 8;

    // Clamp to viewport edges with padding
    const tooltipMaxWidth = 240;
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
}

function onEnter() {
    if (!props.text) return; // e.g. a wrapped button that's only conditionally at-limit
    updatePosition();
    show.value = true;
}

function onLeave() {
    show.value = false;
}

// Only swallow the click for the icon-only trigger — that's needed so clicking
// the icon doesn't also activate whatever it's sitting next to (e.g. a
// checkbox's <label>). When wrapping real interactive content, clicks must
// bubble normally (e.g. FilterBar's click-outside-to-close listener).
function onClick(e: MouseEvent) {
    if (!hasCustomTrigger.value) e.stopPropagation();
}
</script>

<template>
    <span
        ref="triggerRef"
        :class="['inline-flex', !hasCustomTrigger && 'cursor-help']"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
        @click="onClick"
    >
        <slot>
            <Info class="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
        </slot>

        <Teleport to="body">
            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="show && text"
                    :style="tooltipStyle"
                    class="pointer-events-none"
                >
                    <div class="max-w-[280px] whitespace-pre-line rounded-md bg-foreground px-3 py-2 text-[11px] leading-relaxed text-background shadow-lg text-left">
                        {{ text }}
                    </div>
                    <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
                </div>
            </Transition>
        </Teleport>
    </span>
</template>
