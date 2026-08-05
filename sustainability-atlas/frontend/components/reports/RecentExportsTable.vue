<script setup lang="ts">
/** Recent Exports table — server-paginated audit-log export history, no download/action column. */
import { formatDate, formatNumber } from '~/lib/format';
import type { ExportFormat, ExportHistoryItem } from '~/types/reports';

const { network } = useNetwork();
const { listRecent } = useExportsApi();
// Admins see all users' exports (with "Exported By"); regular users see only their own.
const { isAdmin } = useAuth();
const columnCount = computed(() => (isAdmin.value ? 5 : 4));

const page = ref(1);
const pageSize = ref(10);

const { data, pending } = await useAsyncData(
    'recent-exports-table',
    () => listRecent({ page: page.value, limit: pageSize.value }),
    { watch: [network, page, pageSize] },
);

const items = computed<ExportHistoryItem[]>(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, limit: pageSize.value, total: 0, totalPages: 1 });

const formatColor: Record<ExportFormat, string> = {
    csv: 'bg-stat-blue/10 text-stat-blue',
    xlsx: 'bg-stat-green/10 text-stat-green',
    pdf: 'bg-stat-rose/10 text-stat-rose',
};

function onPageChange(p: number) {
    page.value = p;
}
function onPageSizeChange(size: number) {
    pageSize.value = size;
    page.value = 1;
}

const skeletonRows = computed(() => Array.from({ length: Math.min(pageSize.value, 10) }, (_, i) => i));
</script>

<template>
    <div>
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm" style="min-width: 700px">
                    <thead class="bg-muted/30">
                        <tr class="border-b">
                            <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {{ $t('reports.recentExports.colFilename') }}
                            </th>
                            <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {{ $t('reports.recentExports.colFormat') }}
                            </th>
                            <th class="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {{ $t('reports.recentExports.colRecords') }}
                            </th>
                            <th v-if="isAdmin" class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {{ $t('reports.recentExports.colExportedBy') }}
                            </th>
                            <th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                {{ $t('reports.recentExports.colDate') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <!-- Loading skeleton -->
                        <template v-if="pending && items.length === 0">
                            <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                                <td v-for="col in columnCount" :key="col" class="py-3 px-4">
                                    <Skeleton class="h-4 w-full max-w-[120px]" />
                                </td>
                            </tr>
                        </template>

                        <template v-else>
                            <tr v-if="items.length === 0">
                                <td :colspan="columnCount" class="py-12 text-center text-sm text-muted-foreground">
                                    {{ $t('reports.recentExports.empty') }}
                                </td>
                            </tr>

                            <tr v-for="item in items" :key="item.id" class="hover:bg-muted/30 transition-colors">
                                <td class="px-4 py-3 font-medium text-foreground truncate max-w-[280px]" :title="item.filename">
                                    {{ item.filename }}
                                </td>
                                <td class="px-4 py-3">
                                    <span
                                        class="text-xs font-medium rounded-full px-2 py-0.5 uppercase"
                                        :class="formatColor[item.format]"
                                    >
                                        {{ item.format }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                    {{ item.recordCount === null ? '—' : formatNumber(item.recordCount) }}
                                </td>
                                <td v-if="isAdmin" class="px-4 py-3 text-muted-foreground">{{ item.exportedBy }}</td>
                                <td class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap" :title="new Date(item.createdAt).toLocaleString()">
                                    {{ formatDate(item.createdAt) }}
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>

        <Pagination
            :current-page="meta.page"
            :page-size="meta.limit"
            :total-pages="meta.totalPages"
            :total-items="meta.total"
            @update:current-page="onPageChange"
            @update:page-size="onPageSizeChange"
        />
    </div>
</template>
