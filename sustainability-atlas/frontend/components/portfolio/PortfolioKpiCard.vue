<script setup lang="ts">
import type { Component } from 'vue';
import { X } from 'lucide-vue-next';

defineProps<{
    label: string;
    value: string;
    sub?: string;
    footer?: string;
    footerAccent?: string;
    icon: Component;
    accentBg?: string;
    widgetKey: string;
}>();

const emit = defineEmits<{ remove: [key: string] }>();
</script>

<template>
    <div class="relative rounded-xl border bg-card p-4">
        <div class="flex items-start justify-between mb-3">
            <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ label }}</span>
            <div class="flex items-center gap-1.5">
                <div :class="[accentBg ?? 'bg-muted/60', 'rounded-lg p-1.5']">
                    <component :is="icon" class="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <button
                    class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
                    :title="$t('portfolio.removeWidget')"
                    @click="emit('remove', widgetKey)"
                >
                    <X class="h-3 w-3" />
                </button>
            </div>
        </div>

        <div class="text-2xl font-bold text-foreground tabular-nums">{{ value }}</div>
        <p v-if="sub" class="text-xs text-muted-foreground mt-1">{{ sub }}</p>

        <div class="mt-3 border-t pt-2.5">
            <p v-if="footer" class="text-xs font-medium" :class="footerAccent ?? 'text-muted-foreground'">
                {{ footer }}
            </p>
        </div>
    </div>
</template>
