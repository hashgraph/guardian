<script setup lang="ts">
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, FileJson, Loader2, Radio } from 'lucide-vue-next';
import Pagination from '~/components/shared/Pagination.vue';
import FilterBar, { type FilterOption } from '~/components/shared/FilterBar.vue';
import type { LinkedSchema } from '~/types/models';

const props = defineProps<{
    projectId: string;
    schema: LinkedSchema;
}>();

const emit = defineEmits<{
    'view-record': [consensusTimestamp: string];
}>();

interface MrvColumn { key: string; label: string; description: string | null; isDate: boolean }
interface MrvRow { consensusTimestamp: string; itemIndex?: number; values: Record<string, string>; device: string | null }
interface MrvDataResponse {
    schemaUuid: string;
    schemaName: string | null;
    columns: MrvColumn[];
    rows: MrvRow[];
    total: number;
    page: number;
    limit: number;
    devices: string[];
    dateColumnKey: string | null;
    flattened: boolean;
}

function rowKey(row: MrvRow): string {
    return row.itemIndex != null ? `${row.consensusTimestamp}-${row.itemIndex}` : row.consensusTimestamp;
}

const { network } = useNetwork();

const expanded = ref(true);
const page = ref(1);
const limit = ref(25);
const sortBy = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const deviceFilter = ref('');
const dateFrom = ref('');
const dateTo = ref('');

const data = ref<MrvDataResponse | null>(null);
const loading = ref(false);
const loadedOnce = ref(false);

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / limit.value)));
const hasDeviceDimension = computed(() => (data.value?.devices.length ?? 0) > 0);

// Same pill-dropdown filter shell used across the app (Projects list's
// "Stage"/"Expected Issuance Year" etc.) — device is a plain single-select,
// the from/to date range is FilterBar's built-in combined "daterange" pill
// (one button, a small from/to popover) rather than two separate inputs.
const filterFields = computed<FilterOption[]>(() => {
    const fields: FilterOption[] = [];
    if (hasDeviceDimension.value) {
        fields.push({
            key: 'device',
            label: 'Device / Measurement Point',
            options: (data.value?.devices ?? []).map((d) => ({ value: d, label: d })),
            searchable: (data.value?.devices.length ?? 0) > 8,
        });
    }
    if (data.value?.dateColumnKey) {
        fields.push({ key: 'dateRange', label: 'Date Range', type: 'daterange' as const, options: [] });
    }
    return fields;
});

const activeFilters = computed<Record<string, string>>(() => ({
    device: deviceFilter.value || 'all',
    dateRange: (dateFrom.value || dateTo.value) ? `${dateFrom.value}|${dateTo.value}` : 'all',
}));

function onFilter(key: string, value: string) {
    if (key === 'device') {
        deviceFilter.value = value === 'all' ? '' : value;
    } else if (key === 'dateRange') {
        const [from, to] = value === 'all' ? ['', ''] : value.split('|');
        dateFrom.value = from ?? '';
        dateTo.value = to ?? '';
    }
    page.value = 1;
}

async function load() {
    if (!import.meta.client) return;
    loading.value = true;
    try {
        const config = useRuntimeConfig();
        const baseURL = config.public.apiBaseUrl as string;
        const query: Record<string, string | number> = { page: page.value, limit: limit.value, sortDir: sortDir.value };
        if (sortBy.value) query.sortBy = sortBy.value;
        if (deviceFilter.value) query.device = deviceFilter.value;
        if (dateFrom.value) query.from = new Date(dateFrom.value).toISOString();
        if (dateTo.value) query.to = new Date(`${dateTo.value}T23:59:59.999`).toISOString();

        data.value = await $fetch<MrvDataResponse>(
            `/api/v1/${network.value}/projects/${props.projectId}/mrv-data/${props.schema.schemaUuid}`,
            { baseURL, query },
        );
    } catch {
        data.value = null;
    } finally {
        loading.value = false;
        loadedOnce.value = true;
    }
}

watch([page, limit, sortBy, sortDir, deviceFilter, dateFrom, dateTo], load);

watch(expanded, (open) => {
    if (open && !loadedOnce.value) load();
}, { immediate: true });

function toggleSort(col: MrvColumn) {
    if (sortBy.value === col.key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortBy.value = col.key;
        sortDir.value = 'desc';
    }
    page.value = 1;
}

function sortIcon(col: MrvColumn) {
    const effectiveSortKey = sortBy.value ?? data.value?.dateColumnKey ?? null;
    if (effectiveSortKey !== col.key) return ArrowUpDown;
    return sortDir.value === 'asc' ? ArrowUp : ArrowDown;
}

/** Clicking a device pill drills down: filter the whole table to that device's history. */
function drillIntoDevice(device: string) {
    deviceFilter.value = device;
    page.value = 1;
}

function clearFilters() {
    deviceFilter.value = '';
    dateFrom.value = '';
    dateTo.value = '';
    page.value = 1;
}

function formatCell(value: string, col: MrvColumn): string {
    if (!value) return '—';
    if (!col.isDate) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
</script>

<template>
    <div class="rounded-xl border overflow-hidden bg-card">
        <button
            class="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-muted/30"
            @click="expanded = !expanded"
        >
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Radio class="h-3.5 w-3.5 text-primary" />
                </div>
                <div class="min-w-0">
                    <h3 class="text-sm font-semibold text-foreground truncate">{{ schema.schemaName || schema.schemaUuid }}</h3>
                    <span class="text-[10px] font-medium bg-stat-green/10 text-stat-green rounded-full px-2 py-0.5 mt-0.5 inline-block">
                        {{ data?.total ?? schema.vcCount }} record{{ (data?.total ?? schema.vcCount) !== 1 ? 's' : '' }}
                    </span>
                </div>
            </div>
            <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform shrink-0" :class="expanded ? 'rotate-180' : ''" />
        </button>

        <div v-if="expanded" class="border-t">
            <!-- Filter toolbar — same pill-dropdown shell as the Projects list filters -->
            <div v-if="filterFields.length > 0" class="px-5 py-3 border-b bg-muted/20 flex items-center gap-3">
                <FilterBar
                    :model-value="''"
                    hide-search
                    :filters="filterFields"
                    :active-filters="activeFilters"
                    :result-count="data?.rows.length ?? 0"
                    :total-count="data?.total ?? 0"
                    @filter="onFilter"
                    @clear="clearFilters"
                />
                <span v-if="loading" class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
                    <Loader2 class="h-3 w-3 animate-spin" /> Loading…
                </span>
            </div>

            <p v-if="data?.flattened" class="px-5 pt-2.5 text-[11px] text-muted-foreground">
                This schema has no per-submission fields of its own — each row below is one device/measurement entry;
                several rows can come from the same underlying submission (use "Raw" to see the full original document).
            </p>

            <!-- Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-muted/20 border-b">
                            <th
                                v-for="col in data?.columns ?? []"
                                :key="col.key"
                                class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-foreground"
                                @click="toggleSort(col)"
                            >
                                <span class="inline-flex items-center gap-1">
                                    {{ col.label }}
                                    <component :is="sortIcon(col)" class="h-3 w-3" />
                                </span>
                            </th>
                            <th v-if="hasDeviceDimension" class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                Device
                            </th>
                            <th class="text-center py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap w-16">
                                Raw
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-if="!loading && data && data.rows.length === 0">
                            <td :colspan="(data.columns.length) + (hasDeviceDimension ? 2 : 1)" class="py-8 text-center text-xs text-muted-foreground">
                                No records match these filters.
                            </td>
                        </tr>
                        <tr v-for="row in data?.rows ?? []" :key="rowKey(row)" class="hover:bg-muted/20">
                            <td
                                v-for="col in data?.columns ?? []"
                                :key="col.key"
                                class="py-2 px-4 text-foreground tabular-nums max-w-[280px]"
                                :title="row.values[col.key]"
                            >
                                <span class="block truncate">{{ formatCell(row.values[col.key], col) }}</span>
                            </td>
                            <td v-if="hasDeviceDimension" class="py-2 px-4">
                                <button
                                    v-if="row.device"
                                    class="text-[11px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5 hover:bg-primary/20 transition-colors"
                                    title="View this device's history"
                                    @click="drillIntoDevice(row.device)"
                                >
                                    {{ row.device }}
                                </button>
                                <span v-else class="text-muted-foreground">—</span>
                            </td>
                            <td class="py-2 px-4 text-center">
                                <button
                                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="View raw VC document"
                                    @click="emit('view-record', row.consensusTimestamp)"
                                >
                                    <FileJson class="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="px-5 py-2 border-t">
                <Pagination
                    :current-page="page"
                    :total-pages="totalPages"
                    :total-items="data?.total ?? 0"
                    :page-size="limit"
                    @update:current-page="(p) => (page = p)"
                    @update:page-size="(s) => (limit = s)"
                />
            </div>
        </div>
    </div>
</template>
