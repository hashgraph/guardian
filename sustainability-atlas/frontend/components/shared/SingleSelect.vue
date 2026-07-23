<script setup lang="ts">
import { ref, computed } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { ChevronDown } from 'lucide-vue-next';

export interface SingleSelectOption {
    value: string;
    label: string;
}

const props = defineProps<{
    modelValue: string;
    options: SingleSelectOption[];
    placeholder?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

onClickOutside(rootRef, () => { open.value = false; });

const selectedLabel = computed(() =>
    props.options.find(o => o.value === props.modelValue)?.label ?? props.placeholder ?? '');

function select(value: string) {
    emit('update:modelValue', value);
    open.value = false;
}
</script>

<template>
    <div ref="rootRef" class="relative">
        <button
            type="button"
            :aria-expanded="open"
            class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
            @click="open = !open"
        >
            <span class="truncate">{{ selectedLabel }}</span>
            <ChevronDown class="ml-1 h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
        <div
            v-if="open"
            class="absolute z-20 mt-1 w-full min-w-[10rem] max-h-60 overflow-y-auto overflow-x-hidden rounded-md border border-input bg-popover p-1 shadow-md"
        >
            <button
                v-for="opt in options"
                :key="opt.value"
                type="button"
                class="flex w-full items-center justify-start text-left rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted/50"
                :class="opt.value === modelValue ? 'font-medium text-foreground bg-muted/30' : 'text-muted-foreground'"
                @click="select(opt.value)"
            >
                {{ opt.label }}
            </button>
        </div>
    </div>
</template>
