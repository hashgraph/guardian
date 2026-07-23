<script setup lang="ts">
/** Shared CSV/Excel/PDF format-tile picker (pass `bare` to drop the card wrapper). */
import { FileText, FileSpreadsheet, FileType } from 'lucide-vue-next';
import type { ExportFormat } from '~/types/reports';

withDefaults(
    defineProps<{
        modelValue: ExportFormat;
        /** Heading text; falls back to the default "Export Format" label. */
        title?: string;
        /** When true, render just the heading + tiles without the surrounding card (for embedding). */
        bare?: boolean;
    }>(),
    { title: '', bare: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: ExportFormat] }>();

const formats: Array<{ value: ExportFormat; icon: unknown; labelKey: string }> = [
    { value: 'csv', icon: FileType, labelKey: 'reports.formats.csv' },
    { value: 'xlsx', icon: FileSpreadsheet, labelKey: 'reports.formats.xlsx' },
    { value: 'pdf', icon: FileText, labelKey: 'reports.formats.pdf' },
];
</script>

<template>
    <div :class="bare ? '' : 'rounded-xl border bg-card p-5'">
        <h3 class="text-sm font-semibold text-foreground mb-3">{{ title || $t('reports.formatPicker.title') }}</h3>
        <div class="grid grid-cols-3 gap-2">
            <button
                v-for="f in formats"
                :key="f.value"
                type="button"
                class="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors"
                :class="modelValue === f.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/40'"
                @click="emit('update:modelValue', f.value)"
            >
                <component :is="f.icon" class="h-5 w-5" />
                {{ $t(f.labelKey) }}
            </button>
        </div>
    </div>
</template>
