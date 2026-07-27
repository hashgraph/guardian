<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside, useElementBounding } from '@vueuse/core';
import { ChevronDown } from 'lucide-vue-next';

export interface SingleSelectOption {
    value: string;
    label: string;
}

const props = withDefaults(
    defineProps<{
        modelValue: string;
        options: SingleSelectOption[];
        placeholder?: string;
        class?: string;
        align?: 'left' | 'right';
        highlightActive?: boolean;
    }>(),
    {
        placeholder: '',
        class: '',
        align: 'left',
        highlightActive: false,
    },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

onClickOutside(rootRef, () => { open.value = false; });

const { top, left, width, height } = useElementBounding(rootRef);

const popoverStyle = computed(() => {
    const topPos = top.value + height.value + 4;
    if (props.align === 'right' && typeof window !== 'undefined') {
        return {
            top: `${topPos}px`,
            right: `${window.innerWidth - (left.value + width.value)}px`,
        };
    }
    return {
        top: `${topPos}px`,
        left: `${left.value}px`,
    };
});

const selectedLabel = computed(() =>
    props.options.find(o => o.value === props.modelValue)?.label ?? props.placeholder ?? '');

const isActive = computed(() =>
    props.highlightActive && props.modelValue !== '' && props.modelValue !== 'all');

function select(value: string) {
    emit('update:modelValue', value);
    open.value = false;
}
</script>

<template>
    <div ref="rootRef" :class="['relative inline-block', props.class]">
        <button
            type="button"
            :aria-expanded="open"
            class="inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus:outline-none"
            :class="isActive ? 'border-primary/30 bg-primary/5 text-primary' : 'border-input text-muted-foreground bg-background'"
            @click="open = !open"
        >
            <span class="truncate text-left">{{ selectedLabel }}</span>
            <ChevronDown class="h-3 w-3 shrink-0 opacity-50" />
        </button>

        <ClientOnly>
            <Teleport to="body">
                <Transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="opacity-0 -translate-y-1 scale-95"
                    enter-to-class="opacity-100 translate-y-0 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="opacity-100 scale-100"
                    leave-to-class="opacity-0 scale-95"
                >
                    <div
                        v-if="open"
                        :style="popoverStyle"
                        class="fixed z-[9999] min-w-[10rem] max-w-[16rem] rounded-md border bg-popover p-1 shadow-md text-left max-h-64 overflow-y-auto overflow-x-hidden"
                    >
                        <button
                            v-for="opt in options"
                            :key="opt.value"
                            type="button"
                            class="flex w-full items-center justify-start text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                            :class="opt.value === modelValue ? 'font-medium text-foreground' : 'text-muted-foreground'"
                            @click="select(opt.value)"
                        >
                            <span class="truncate">{{ opt.label }}</span>
                        </button>
                    </div>
                </Transition>
            </Teleport>
        </ClientOnly>
    </div>
</template>


