<script setup lang="ts">
defineProps<{
    text: string | null | undefined;
    fallback?: string;
    class?: string;
}>();

const show = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<Record<string, string>>({});

function updatePosition() {
    if (!triggerRef.value) return;
    const rect = triggerRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let left = rect.left + rect.width / 2;
    const top = rect.top - 8;

    const tooltipMaxWidth = 320;
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
    if (!triggerRef.value) return;
    // Only show tooltip when text is actually clipped
    if (triggerRef.value.scrollWidth > triggerRef.value.clientWidth) {
        updatePosition();
        show.value = true;
    }
}

function onLeave() {
    show.value = false;
}
</script>

<template>
    <span
        ref="triggerRef"
        class="block truncate cursor-default"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
    >{{ text ?? fallback ?? '-' }}</span>

    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div v-if="show" :style="tooltipStyle" class="pointer-events-none">
                <div class="max-w-xs whitespace-normal rounded-md bg-foreground px-3 py-2 text-[11px] leading-relaxed text-background shadow-lg">
                    {{ text }}
                </div>
                <div class="mx-auto h-0 w-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-foreground" />
            </div>
        </Transition>
    </Teleport>
</template>
