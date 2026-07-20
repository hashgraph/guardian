<script setup lang="ts">
import { Search, ChevronDown } from 'lucide-vue-next';
import { formatNumber } from '~/lib/format';
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES, type GlossaryCategory } from '~/lib/glossary-terms';

const { t } = useI18n();

const CATEGORY_BADGE_CLASS: Record<GlossaryCategory, string> = {
    carbon: 'bg-stat-green/10 text-stat-green',
    chain: 'bg-stat-blue/10 text-stat-blue',
    sdg: 'bg-stat-rose/10 text-stat-rose',
    platform: 'bg-stat-amber/10 text-stat-amber',
};

function categoryLabel(cat: GlossaryCategory): string {
    return t(`glossaryPage.categories.${cat}`);
}

const searchQuery = ref('');
const selectedCategory = ref<'all' | GlossaryCategory>('all');
const expanded = ref<Record<string, boolean>>({});

const categoryOptions = computed(() => [
    { key: 'all' as const, label: t('glossaryPage.categories.all') },
    ...GLOSSARY_CATEGORIES.map(c => ({ key: c, label: categoryLabel(c) })),
]);

interface DisplayTerm {
    id: string;
    category: GlossaryCategory;
    relatedIds: string[];
    term: string;
    short: string;
    long: string;
}

const filteredTerms = computed<DisplayTerm[]>(() => {
    const q = searchQuery.value.trim().toLowerCase();
    return GLOSSARY_TERMS
        .filter(meta => selectedCategory.value === 'all' || meta.category === selectedCategory.value)
        .map(meta => ({
            ...meta,
            term: t(`glossaryPage.terms.${meta.id}.term`),
            short: t(`glossaryPage.terms.${meta.id}.short`),
            long: t(`glossaryPage.terms.${meta.id}.long`),
        }))
        .filter(term => !q || term.term.toLowerCase().includes(q) || term.short.toLowerCase().includes(q))
        .sort((a, b) => a.term.localeCompare(b.term));
});

const groups = computed(() => {
    const map = new Map<string, DisplayTerm[]>();
    for (const term of filteredTerms.value) {
        const letter = term.term[0]?.toUpperCase() ?? '#';
        if (!map.has(letter)) map.set(letter, []);
        map.get(letter)!.push(term);
    }
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, terms]) => ({ letter, terms }));
});

const resultSummary = computed(() => {
    const count = filteredTerms.value.length;
    if (selectedCategory.value === 'all') return t('glossaryPage.resultCount', { count });
    return t('glossaryPage.resultCountInCategory', { count, category: categoryLabel(selectedCategory.value) });
});

function relatedTermLabel(id: string): string {
    return t(`glossaryPage.terms.${id}.term`);
}

function toggle(id: string) {
    expanded.value[id] = !expanded.value[id];
}

async function jumpTo(id: string) {
    searchQuery.value = '';
    selectedCategory.value = 'all';
    expanded.value[id] = true;
    await nextTick();
    document.getElementById(`term-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const demoCards = computed(() => [
    { key: 'registries', label: t('glossaryPage.demo.registries'), value: formatNumber(38), tooltip: t('glossaryPage.terms.registry.short') },
    { key: 'methodologies', label: t('glossaryPage.demo.methodologies'), value: formatNumber(128), tooltip: t('glossaryPage.terms.methodology.short') },
    { key: 'issuances', label: t('glossaryPage.demo.issuances'), value: formatNumber(194827), tooltip: t('glossaryPage.terms.issuance.short') },
]);
</script>

<template>
    <div class="space-y-0">
        <div class="px-6 pt-6 pb-4">
            <h1 class="text-2xl font-bold text-foreground">{{ $t('glossaryPage.title') }}</h1>
            <p class="text-sm text-muted-foreground mt-1">{{ $t('glossaryPage.subtitle') }}</p>
        </div>

        <div class="px-6 pb-6 space-y-4">
            <!-- Search + category pills -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                <div class="relative flex-1 sm:max-w-xs">
                    <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="$t('glossaryPage.searchPlaceholder')"
                        class="w-full h-8 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="cat in categoryOptions"
                        :key="cat.key"
                        type="button"
                        class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                        :class="selectedCategory === cat.key
                            ? 'border-primary/30 bg-primary/5 text-primary'
                            : 'border-input text-muted-foreground hover:bg-muted'"
                        @click="selectedCategory = cat.key"
                    >
                        {{ cat.label }}
                    </button>
                </div>
            </div>

            <p class="text-xs text-muted-foreground">{{ resultSummary }}</p>

            <!-- Term list -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div v-if="groups.length === 0" class="py-12 text-center text-sm text-muted-foreground">
                    {{ $t('glossaryPage.noResults', { query: searchQuery }) }}
                </div>
                <div v-else class="p-5 space-y-6">
                    <div v-for="group in groups" :key="group.letter">
                        <div class="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
                            {{ group.letter }}
                        </div>
                        <div class="border-t divide-y">
                            <div v-for="term in group.terms" :key="term.id" :id="`term-${term.id}`">
                                <button
                                    type="button"
                                    class="w-full flex items-start gap-2.5 py-3.5 text-left"
                                    @click="toggle(term.id)"
                                >
                                    <ChevronDown
                                        class="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform"
                                        :class="expanded[term.id] ? 'rotate-180' : ''"
                                    />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-semibold text-sm text-foreground">{{ term.term }}</span>
                                            <span
                                                class="text-[10px] font-medium rounded-full px-2 py-0.5 whitespace-nowrap"
                                                :class="CATEGORY_BADGE_CLASS[term.category]"
                                            >
                                                {{ categoryLabel(term.category) }}
                                            </span>
                                        </div>
                                        <p class="text-sm text-muted-foreground mt-1 leading-relaxed">{{ term.short }}</p>
                                    </div>
                                </button>
                                <div v-if="expanded[term.id]" class="pb-4 pl-[26px] pr-2 -mt-1">
                                    <div class="rounded-lg border bg-muted/30 px-4 py-3">
                                        <p class="text-sm text-foreground/90 leading-relaxed">{{ term.long }}</p>
                                        <div v-if="term.relatedIds.length > 0" class="flex flex-wrap items-center gap-1.5 mt-3">
                                            <span class="text-[11px] text-muted-foreground">{{ $t('glossaryPage.relatedLabel') }}</span>
                                            <button
                                                v-for="rid in term.relatedIds"
                                                :key="rid"
                                                type="button"
                                                class="text-[11px] font-medium rounded-full px-2.5 py-0.5 bg-accent text-accent-foreground hover:bg-accent/70 transition-colors"
                                                @click="jumpTo(rid)"
                                            >
                                                {{ relatedTermLabel(rid) }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Where this shows up -->
        <div class="border-t px-6 py-6">
            <h2 class="text-base font-semibold text-foreground">{{ $t('glossaryPage.whereShownTitle') }}</h2>
            <p class="text-xs text-muted-foreground mt-1 mb-4">{{ $t('glossaryPage.whereShownSubtitle') }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div v-for="d in demoCards" :key="d.key" class="rounded-xl border bg-card p-4">
                    <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {{ d.label }}
                        <InfoTooltip :text="d.tooltip" />
                    </div>
                    <div class="text-2xl font-bold text-foreground mt-1.5">{{ d.value }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
