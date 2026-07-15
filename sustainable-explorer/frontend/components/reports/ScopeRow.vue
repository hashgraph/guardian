<script setup lang="ts">
/** Export scope: dataset selector + per-dataset filters (via DataFilters) + live record count. */
import { CircleGauge, X } from 'lucide-vue-next';
import type { FilterField } from '~/components/shared/DataFilters.vue';
import type { ExportDataset } from '~/types/reports';
import { formatNumber } from '~/lib/format';
import { buildListScopeQuery, DATASET_LIST_ENDPOINT, scopeControlVisibility, type ScopeFilters } from '~/lib/export-scope';

const props = defineProps<{
    dataset: ExportDataset;
    modelValue: ScopeFilters;
}>();

const emit = defineEmits<{
    'update:dataset': [value: ExportDataset];
    'update:modelValue': [value: ScopeFilters];
}>();

const { t } = useI18n();
const { network } = useNetwork();

const datasetOptions = computed(() => [
    { value: 'credits', label: t('reports.datasets.credits') },
    { value: 'projects', label: t('reports.datasets.projects') },
    { value: 'methodologies', label: t('reports.datasets.methodologies') },
    { value: 'registries', label: t('reports.datasets.registries') },
]);

function onDatasetChange(value: string) {
    emit('update:dataset', value as ExportDataset);
}

const visibility = computed(() => scopeControlVisibility(props.dataset));

const fields = computed<FilterField[]>(() => [
    {
        key: 'registry',
        label: t('reports.scope.registry'),
        type: 'text',
        placeholder: t('reports.scope.registryPlaceholder'),
        width: 'md',
        visible: () => visibility.value.registry,
    },
    {
        key: 'project',
        label: t('reports.scope.project'),
        type: 'text',
        placeholder: t('reports.scope.projectPlaceholder'),
        width: 'md',
        visible: () => visibility.value.project,
    },
    {
        key: 'vintage',
        label: t('reports.scope.vintage'),
        type: 'text',
        placeholder: t('reports.scope.vintagePlaceholder'),
        width: 'sm',
        visible: () => visibility.value.vintage,
    },
    {
        key: 'dateRange',
        label: t('reports.scope.dateRange'),
        type: 'daterange',
        width: 'lg',
        visible: () => visibility.value.dateRange,
    },
]);

function onFiltersUpdate(value: Record<string, any>) {
    emit('update:modelValue', value as ScopeFilters);
}

function onClear() {
    emit('update:modelValue', {});
}

// Live record count
const config = useRuntimeConfig();
const baseURL = import.meta.server ? (config.apiBaseUrl as string) : (config.public.apiBaseUrl as string);

const key = computed(() => {
    const q = buildListScopeQuery(props.dataset, props.modelValue);
    return `reports-scope-count:${network.value}:${props.dataset}:${JSON.stringify(q)}`;
});

const { data: countData, pending: countPending } = await useAsyncData<{ meta: { total: number } } | null>(
    key.value,
    async () => {
        try {
            return await $fetch<{ meta: { total: number } }>(
                `/api/v1/${network.value}/${DATASET_LIST_ENDPOINT[props.dataset]}`,
                { baseURL, query: { page: 1, limit: 1, ...buildListScopeQuery(props.dataset, props.modelValue) } },
            );
        } catch (err) {
            console.error('[ScopeRow] record-count fetch failed:', err);
            return null;
        }
    },
    { watch: [() => props.dataset, () => props.modelValue, network], default: () => null },
);

const recordCount = computed(() => countData.value?.meta?.total ?? 0);

// Active scope selections, shown as removable chips so applied filters are visible.
const fieldLabelMap = computed<Record<string, string>>(() =>
    Object.fromEntries(fields.value.map(f => [f.key, f.label])),
);

interface ScopeChip { key: string; label: string; display: string; }

const activeChips = computed<ScopeChip[]>(() => {
    const out: ScopeChip[] = [];
    for (const [key, val] of Object.entries(props.modelValue ?? {})) {
        if (val == null || val === '') continue;
        const label = fieldLabelMap.value[key] ?? key;
        let display: string;
        if (typeof val === 'object') {
            const from = (val as { from?: string }).from;
            const to = (val as { to?: string }).to;
            if (!from && !to) continue;
            display = `${from ?? '…'} → ${to ?? '…'}`;
        } else {
            display = String(val);
        }
        out.push({ key, label, display });
    }
    return out;
});

function removeChip(key: string) {
    const next = { ...(props.modelValue ?? {}) };
    delete (next as Record<string, unknown>)[key];
    emit('update:modelValue', next as ScopeFilters);
}
</script>

<template>
    <div class="rounded-xl border bg-card p-4 space-y-3">
        <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                {{ $t('reports.scope.datasetLabel') }}
            </span>
            <Select
                class="w-56"
                :options="datasetOptions"
                :model-value="dataset"
                @update:model-value="onDatasetChange"
            />
        </div>

        <div class="flex flex-wrap items-end justify-between gap-3">
            <DataFilters :fields="fields" :model-value="modelValue" @update:model-value="onFiltersUpdate" @clear="onClear" />

            <div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 pb-0.5">
                <CircleGauge class="h-3.5 w-3.5 text-primary/70" />
                <span v-if="countPending">{{ $t('common.loading') }}</span>
                <span v-else>{{ $t('reports.scope.recordsMatching', { count: formatNumber(recordCount) }) }}</span>
            </div>
        </div>

        <!-- Active scope selections (what the export will be filtered by) -->
        <div v-if="activeChips.length" class="flex flex-wrap items-center gap-1.5 pt-1 border-t">
            <span class="text-[11px] text-muted-foreground">{{ $t('reports.scope.selected') }}:</span>
            <span
                v-for="c in activeChips"
                :key="c.key"
                class="inline-flex items-center gap-1 text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5"
            >
                <span class="font-medium">{{ c.label }}:</span> {{ c.display }}
                <button type="button" class="hover:text-primary/60" :aria-label="$t('reports.scope.remove')" @click="removeChip(c.key)">
                    <X class="h-3 w-3" />
                </button>
            </span>
        </div>
    </div>
</template>
