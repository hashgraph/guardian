<script setup lang="ts">
import { formatCredits } from '~/lib/format';

function goToProjectsForSdg(sdgId: number) {
    return navigateTo({ path: '/projects', query: { sdgs: String(sdgId) } });
}

const { sdgStats, totalProjects } = useSdgStats();

const allSdgs = computed(() => sdgStats.value.map(s => ({
    id: String(s.id),
    sdgId: s.id,
    name: s.name,
    color: s.color,
    projects: s.projects,
    credits: formatCredits(s.credits),
    developers: s.developers,
    countries: s.countries,
    topMethodology: s.topMethodology,
})));

const { searchQuery, currentPage, paginated, filtered, totalPages, pageSize, activeFilters, sortKey, sortDir, toggleSort, setFilter, clearFilters } =
    useFilteredPagination(allSdgs, {
        searchFields: ['name', 'topMethodology'],
        pageSize: 10,
        defaultSort: { key: 'projects', dir: 'desc' },
    });

function sdgIcon(id: number): string {
    return `/sdgs/E-WEB-Goal-${String(id).padStart(2, '0')}.png`;
}
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">
                {{ $t('sdgs.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('sdgs.subtitle') }}</p>
        </div>

        <div class="px-6 pb-3">
            <FilterBar
                v-model="searchQuery"
                :filters="[]"
                :active-filters="activeFilters"
                :result-count="filtered.length"
                :total-count="allSdgs.length"
                :search-placeholder="$t('sdgs.searchPlaceholder')"
                @filter="setFilter"
                @clear="clearFilters"
            />
        </div>

        <div class="px-6 pb-6">
            <div class="rounded-xl border bg-card overflow-hidden">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b bg-muted/30">
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ $t('sdgs.columns.sdg') }}</th>
                            <SortableHeader :label="$t('sdgs.columns.goal')" sort-key="name" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('sdgs.columns.projects')" sort-key="projects" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('sdgs.columns.issuances')" sort-key="credits" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('sdgs.columns.developers')" sort-key="developers" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('sdgs.columns.countries')" sort-key="countries" align="right" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <SortableHeader :label="$t('sdgs.columns.topMethodology')" sort-key="topMethodology" :active-sort-key="sortKey as string" :sort-dir="sortDir" @sort="toggleSort($event as any)" />
                            <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <span class="inline-flex items-center gap-1">
                                    {{ $t('sdgs.columns.coverage') }}
                                    <InfoTooltip :text="$t('sdgs.coverageTooltip')" />
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr
                            v-for="s in paginated"
                            :key="s.id"
                            class="hover:bg-muted/30 transition-colors"
                        >
                            <td class="py-3 px-4">
                                <div class="group relative inline-block">
                                    <img
                                        :src="sdgIcon(s.sdgId)"
                                        :alt="`SDG ${s.sdgId}`"
                                        class="h-9 w-9 rounded-sm"
                                    />
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <div>
                                    <span class="font-medium text-foreground">{{ s.name }}</span>
                                    <p class="text-[11px] text-muted-foreground/60">SDG {{ s.sdgId }}</p>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">
                                <button
                                    type="button"
                                    class="text-primary hover:underline cursor-pointer"
                                    :title="$t('sdgs.viewProjects', { name: s.name })"
                                    @click="goToProjectsForSdg(s.sdgId)"
                                >{{ s.projects.toLocaleString() }}</button>
                            </td>
                            <td class="py-3 px-4 text-right tabular-nums font-medium">{{ s.credits }}</td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ s.developers }}</td>
                            <td class="py-3 px-4 text-right tabular-nums">{{ s.countries }}</td>
                            <td class="py-3 px-4">
                                <span class="text-xs bg-muted rounded px-1.5 py-0.5">{{ s.topMethodology }}</span>
                            </td>
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2 w-24">
                                    <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            class="h-full rounded-full transition-all"
                                            :style="{ width: `${totalProjects ? Math.min(100, (s.projects / totalProjects) * 100) : 0}%`, backgroundColor: s.color }"
                                        />
                                    </div>
                                    <span class="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{{ totalProjects ? Math.round((s.projects / totalProjects) * 100) : 0 }}%</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <Pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :total-pages="totalPages"
                :total-items="filtered.length"
            />
        </div>
    </div>
</template>
