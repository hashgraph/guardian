<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';

defineProps<{ label: string; active: boolean }>();
const emit = defineEmits<{ select: []; remove: [] }>();
</script>

<template>
    <span
        :class="[
            'inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-0.5 text-[11px] font-medium transition-colors',
            active
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-primary/25 text-muted-foreground hover:bg-muted hover:text-foreground',
        ]"
    >
        <button class="max-w-[140px] truncate" @click="emit('select')">{{ label }}</button>
        <button
            class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full hover:text-destructive"
            @click.stop="emit('remove')"
        >
            <Trash2 class="h-2.5 w-2.5" />
        </button>
    </span>
</template>
