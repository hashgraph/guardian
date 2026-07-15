<script setup lang="ts">
/** Reports page stat cards, derived from the audit-log-backed export history. */
import { Download, ListChecks, Clock } from 'lucide-vue-next';
import type { ExportHistoryItem } from '~/types/reports';

const { t, locale } = useI18n();
const { network } = useNetwork();
const { listRecent } = useExportsApi();

const ESG_FIELDS_TOTAL = 24;
const ESG_FIELDS_REQUIRED = 12;
const ESG_FIELDS_OPTIONAL = ESG_FIELDS_TOTAL - ESG_FIELDS_REQUIRED;

const HISTORY_SAMPLE_SIZE = 50;

const { data: history, pending } = await useAsyncData(
    'reports-stat-cards-recent-exports',
    () => listRecent({ page: 1, limit: HISTORY_SAMPLE_SIZE }),
    { watch: [network] },
);

const historyItems = computed<ExportHistoryItem[]>(() => history.value?.data ?? []);

const exportsThisMonth = computed(() => {
    const now = new Date();
    return historyItems.value.filter((item) => {
        const d = new Date(item.createdAt);
        return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
    }).length;
});

// `listRecent` already orders newest-first (audit_log `createdAt DESC`).
const lastExport = computed<ExportHistoryItem | null>(() => historyItems.value[0] ?? null);

const localeTag = computed(() => (locale.value === 'es' ? 'es-ES' : 'en-US'));
const lastExportDateLabel = computed(() => {
    if (!lastExport.value) return '—';
    return new Date(lastExport.value.createdAt).toLocaleDateString(localeTag.value, { month: 'short', day: 'numeric' });
});

interface StatCard {
    key: string;
    label: string;
    value: string;
    sub: string;
    icon: typeof Download;
}

const cards = computed<StatCard[]>(() => [
    {
        key: 'exportsThisMonth',
        label: t('reports.stats.exportsThisMonth.label'),
        value: pending.value ? '—' : String(exportsThisMonth.value),
        sub: t('reports.stats.exportsThisMonth.sub'),
        icon: Download,
    },
    {
        key: 'esgFieldsAvailable',
        label: t('reports.stats.esgFieldsAvailable.label'),
        value: String(ESG_FIELDS_TOTAL),
        sub: t('reports.stats.esgFieldsAvailable.sub', { required: ESG_FIELDS_REQUIRED, optional: ESG_FIELDS_OPTIONAL }),
        icon: ListChecks,
    },
    {
        key: 'lastExport',
        label: t('reports.stats.lastExport.label'),
        value: pending.value ? '—' : lastExportDateLabel.value,
        sub: pending.value ? '' : (lastExport.value ? lastExport.value.filename : t('reports.stats.lastExport.none')),
        icon: Clock,
    },
]);
</script>

<template>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card v-for="c in cards" :key="c.key" class="p-4">
            <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{{ c.label }}</span>
                <component :is="c.icon" class="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </div>
            <div class="text-xl font-bold text-foreground mt-1.5 tabular-nums truncate">{{ c.value }}</div>
            <div class="text-[11px] text-muted-foreground mt-1 truncate" :title="c.sub">{{ c.sub }}</div>
        </Card>
    </div>
</template>
