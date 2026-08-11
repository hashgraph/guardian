<script setup lang="ts">
import { DropdownMenuTrigger as RekaDropdownMenuTrigger } from 'reka-ui';
import { cn } from '~/lib/utils';

const props = defineProps<{
    class?: string;
    asChild?: boolean;
}>();
</script>

<template>
    <RekaDropdownMenuTrigger
        :class="cn(props.class)"
        :as-child="props.asChild"
    >
        <slot />
    </RekaDropdownMenuTrigger>
</template>
