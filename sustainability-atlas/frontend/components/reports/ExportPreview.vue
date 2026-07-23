<script setup lang="ts">
/** Export preview chips + "Export Selected Data" button (authenticated fetch+Blob download). */
import { Download, Loader2 } from 'lucide-vue-next';
import type { ExportDataset, ExportFieldDefinition, ExportFormat } from '~/types/reports';
import { getExportFields } from '~/lib/export-field-catalog';
import { buildExportScopeParams, type ScopeFilters } from '~/lib/export-scope';

const props = defineProps<{
    dataset: ExportDataset;
    fieldKeys: string[];
    format: ExportFormat;
    scopeFilters: ScopeFilters;
}>();

const emit = defineEmits<{ exported: [] }>();

const { t } = useI18n();
const { downloadExport } = useExportsApi();

const MAX_VISIBLE = 8;

interface Chip {
    key: string;
    label: string;
    variant: 'identifier' | 'esg' | 'traceability';
}

const chips = computed<Chip[]>(() => {
    const byKey = new Map<string, ExportFieldDefinition>(getExportFields(props.dataset).map((f) => [f.key, f]));
    return props.fieldKeys
        .map((key) => byKey.get(key))
        .filter((f): f is ExportFieldDefinition => !!f)
        .map((f) => ({
            key: f.key,
            label: f.key,
            variant: f.group === 'ESG_CLIMATE_DATA' ? 'esg' : f.group === 'TRACEABILITY_REFERENCES' ? 'traceability' : 'identifier',
        }));
});

const visibleChips = computed(() => chips.value.slice(0, MAX_VISIBLE));
const overflowCount = computed(() => Math.max(0, chips.value.length - MAX_VISIBLE));

const chipClass: Record<Chip['variant'], string> = {
    identifier: 'bg-muted text-muted-foreground border-transparent',
    esg: 'bg-stat-green/10 text-stat-green border-transparent',
    traceability: 'bg-violet-500/10 text-violet-600 border-transparent',
};

const exporting = ref(false);
const canExport = computed(() => props.fieldKeys.length > 0 && !exporting.value);

async function onExport() {
    if (!canExport.value) return;
    exporting.value = true;
    try {
        const scopeParams = buildExportScopeParams(props.dataset, props.scopeFilters);
        const ok = await downloadExport(props.dataset, {
            format: props.format,
            fields: props.fieldKeys,
            ...scopeParams,
        });
        if (ok) {
            const { toast } = await import('vue-sonner');
            toast.success(t('reports.preview.successToast'));
            emit('exported');
        }
    } finally {
        exporting.value = false;
    }
}
</script>

<template>
    <div class="rounded-xl border bg-card p-5 space-y-4">
        <div>
            <h3 class="text-sm font-semibold text-foreground mb-3">{{ $t('reports.preview.title') }}</h3>
            <div v-if="chips.length === 0" class="text-xs text-muted-foreground">
                {{ $t('reports.preview.noFieldsSelected') }}
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
                <span
                    v-for="chip in visibleChips"
                    :key="chip.key"
                    :class="chipClass[chip.variant]"
                    class="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px]"
                >
                    {{ chip.label }}
                </span>
                <span
                    v-if="overflowCount > 0"
                    class="inline-flex items-center rounded-md border border-transparent bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                    {{ $t('reports.preview.moreChips', { count: overflowCount }) }}
                </span>
            </div>
        </div>

        <Button class="w-full" :disabled="!canExport" @click="onExport">
            <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" />
            {{ exporting ? $t('reports.preview.exporting') : $t('reports.preview.exportButton') }}
        </Button>
    </div>
</template>
