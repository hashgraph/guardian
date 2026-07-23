<script setup lang="ts">
import { DropdownMenuRoot as RekaDropdownMenuRoot } from 'reka-ui';

const props = defineProps<{
    defaultOpen?: boolean;
    open?: boolean;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
}>();
</script>

<template>
    <RekaDropdownMenuRoot
        :default-open="props.defaultOpen"
        :open="props.open"
        @update:open="emit('update:open', $event)"
    >
        <slot />
    </RekaDropdownMenuRoot>
</template>
