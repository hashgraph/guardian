<script setup lang="ts">
import { DropdownMenuItem as RekaDropdownMenuItem } from 'reka-ui';
import { cn } from '~/lib/utils';

const props = defineProps<{
    class?: string;
    disabled?: boolean;
}>();
</script>

<template>
    <RekaDropdownMenuItem
        :class="cn(
            'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            props.class,
        )"
        :disabled="props.disabled"
    >
        <slot />
    </RekaDropdownMenuItem>
</template>
