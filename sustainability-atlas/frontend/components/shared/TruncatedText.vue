<script setup lang="ts">
import { truncateText } from '~/lib/format';

const props = defineProps<{
    text: string | null | undefined;
    fallback?: string;
    class?: string;
    /** If set, truncates by character count (with a trailing "...") instead of relying on CSS clipping. */
    maxLength?: number;
}>();

const show = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<Record<string, string>>({});

const isLengthTruncated = computed(
    () => !!props.maxLength && !!props.text && props.text.length > props.maxLength,
);

const displayText = computed(() => {
    if (!props.text) return props.fallback ?? '-';
    if (props.maxLength) return truncateText(props.text, props.maxLength);
    return props.text;
});

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
    // Show tooltip when text is clipped by length, or (as a fallback) by CSS overflow
    if (isLengthTruncated.value || triggerRef.value.scrollWidth > triggerRef.value.clientWidth) {
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
    >{{ displayText }}</span>

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
