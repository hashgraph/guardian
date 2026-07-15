<script setup lang="ts">
/** Reports & Export page shell: header, stat cards, and the 3-tab nav (Export Data / Impact Summary / Disclosure Guidance). */
import { FileText } from 'lucide-vue-next';
import type { TabItem } from '~/components/ui/Tabs.vue';
import type { ExportDataset, ExportFormat } from '~/types/reports';
import { getDefaultSelectedFieldKeys } from '~/lib/export-field-catalog';
import type { ScopeFilters } from '~/lib/export-scope';

// Reports is authenticated-only; guests are redirected by the same auth middleware as the Portfolio page.
definePageMeta({ middleware: 'auth' });

const { t } = useI18n();

type ReportsTab = 'export-data' | 'impact-summary' | 'disclosure-guidance';
const activeTab = ref<ReportsTab>('export-data');

const tabs = computed<TabItem[]>(() => [
    { value: 'export-data', label: t('reports.tabs.exportData') },
    { value: 'impact-summary', label: t('reports.tabs.impactSummary') },
    { value: 'disclosure-guidance', label: t('reports.tabs.disclosureGuidance') },
]);

function onUpdateTab(value: string) {
    activeTab.value = value as ReportsTab;
}

function handleExportImpactSummary() {
    activeTab.value = 'impact-summary';
}

// Export Data tab state — single source of truth shared by ScopeRow / FieldPicker / FormatPicker / ExportPreview.
const exportDataset = ref<ExportDataset>('credits');
const scopeFilters = ref<ScopeFilters>({});
const selectedFields = ref<string[]>(getDefaultSelectedFieldKeys(exportDataset.value));
const exportFormat = ref<ExportFormat>('xlsx'); // mockup default for Export Data (Impact Summary defaults to PDF instead)

// Switching datasets resets scope + field selection to that dataset's own defaults, since carrying over stale filters/keys would silently produce an invalid export request.
watch(exportDataset, (dataset) => {
    scopeFilters.value = {};
    selectedFields.value = getDefaultSelectedFieldKeys(dataset);
});

// After a successful export, refresh the Recent Exports table + stat cards so the new entry appears without a reload.
function onExported() {
    refreshNuxtData(['reports-stat-cards-recent-exports', 'recent-exports-table']);
}
</script>

<template>
    <div class="space-y-0">
        <!-- Header -->
        <div class="px-6 pt-6 pb-2 flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-foreground">{{ $t('reports.title') }}</h1>
                <p class="text-sm text-muted-foreground mt-1">{{ $t('reports.subtitle') }}</p>
            </div>
            <Button class="shrink-0" @click="handleExportImpactSummary">
                <FileText class="h-4 w-4" />
                {{ $t('reports.exportImpactSummary') }}
            </Button>
        </div>

        <!-- Stat cards -->
        <div class="px-6 pt-4 pb-6">
            <StatCards />
        </div>

        <!-- Tabs -->
        <div class="px-6 pb-6">
            <Tabs :tabs="tabs" :model-value="activeTab" @update:model-value="onUpdateTab">
                <template #export-data>
                    <div class="space-y-4">
                        <ScopeRow v-model:dataset="exportDataset" v-model="scopeFilters" />

                        <div class="grid gap-4 lg:grid-cols-[1fr_320px] items-start">
                            <FieldPicker :dataset="exportDataset" v-model="selectedFields" />
                            <div class="space-y-4">
                                <FormatPicker v-model="exportFormat" />
                                <ExportPreview
                                    :dataset="exportDataset"
                                    :field-keys="selectedFields"
                                    :format="exportFormat"
                                    :scope-filters="scopeFilters"
                                    @exported="onExported"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="mt-6">
                        <h2 class="text-sm font-semibold text-foreground mb-3">{{ $t('reports.recentExports.title') }}</h2>
                        <RecentExportsTable />
                    </div>
                </template>
                <template #impact-summary>
                    <div class="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
                        <ImpactSummaryConfig />
                        <ImpactSummaryPreview />
                    </div>
                </template>
                <template #disclosure-guidance>
                    <DisclosureGuidance />
                </template>
            </Tabs>
        </div>
    </div>
</template>
