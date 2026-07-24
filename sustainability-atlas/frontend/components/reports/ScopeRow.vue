<script setup lang="ts">
/** Export scope: dataset selector + live record count (no filters). */
import { CircleGauge } from 'lucide-vue-next';
import type { ExportDataset } from '~/types/reports';
import { formatNumber } from '~/lib/format';
import { buildListScopeQuery, DATASET_LIST_ENDPOINT, type ScopeFilters } from '~/lib/export-scope';

const props = defineProps<{
    dataset: ExportDataset;
    modelValue: ScopeFilters;
}>();

const emit = defineEmits<{
    'update:dataset': [value: ExportDataset];
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

// Live record count
const config = useRuntimeConfig();
const baseURL = import.meta.server ? (config.apiBaseUrl as string) : (config.public.apiBaseUrl as string);

const key = computed(() => `reports-scope-count:${network.value}:${props.dataset}`);

const { data: countData, pending: countPending } = await useAsyncData<{ meta: { total: number } } | null>(
    key.value,
    async () => {
        try {
            return await $fetch<{ meta: { total: number } }>(
                `/api/v1/${network.value}/${DATASET_LIST_ENDPOINT[props.dataset]}`,
                { baseURL, query: { page: 1, limit: 1, ...buildListScopeQuery(props.dataset, {}) } },
            );
        } catch (err) {
            console.error('[ScopeRow] record-count fetch failed:', err);
            return null;
        }
    },
    { watch: [() => props.dataset, network], default: () => null },
);

const recordCount = computed(() => countData.value?.meta?.total ?? 0);
</script>

<template>
    <div class="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
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

        <div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
            <CircleGauge class="h-3.5 w-3.5 text-primary/70" />
            <span v-if="countPending">{{ $t('common.loading') }}</span>
            <span v-else>{{ $t('reports.scope.recordsMatching', { count: formatNumber(recordCount) }) }}</span>
        </div>
    </div>
</template>
