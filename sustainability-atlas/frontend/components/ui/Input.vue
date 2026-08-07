<script setup lang="ts">
import { cn } from '~/lib/utils';

const props = defineProps<{ class?: string; modelValue?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
    <input
        :class="cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', props.class)"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
</template>
