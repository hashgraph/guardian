<script setup lang="ts">
import { Info } from 'lucide-vue-next';

defineProps<{
    text: string;
}>();

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
    updatePosition();
    show.value = true;
}

function onLeave() {
    show.value = false;
}
</script>

<template>
    <span
        ref="triggerRef"
        class="inline-flex cursor-help"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
        @click.stop
    >
        <Info class="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />

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
                    v-if="show"
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
