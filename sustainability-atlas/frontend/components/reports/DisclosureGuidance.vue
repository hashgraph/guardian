<script setup lang="ts">
/** Disclosure Guidance tab: framework list, searchable guidance accordion, and callouts. */
import { Search, ChevronDown, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-vue-next';

// Content structure; all user-facing copy lives in reports.disclosure.* / glossary.* i18n keys.
type GuidanceTag = 'term' | 'verification' | 'policy';
interface GuidanceEntry {
    id: string;
    tag: GuidanceTag;
    hasFormula?: boolean;
    topics: string[];
}

const FRAMEWORKS = [
    { id: 'ghgProtocol' },
    { id: 'cdp' },
    { id: 'tcfd' },
    { id: 'gri' },
    { id: 'iso14064' },
];

const GUIDANCE_ENTRIES: GuidanceEntry[] = [
    { id: 'emissionsReduced', tag: 'term', hasFormula: true, topics: ['emissions', 'esg'] },
    { id: 'vintageYear', tag: 'term', topics: ['vintage', 'credits'] },
    { id: 'mitigationType', tag: 'term', topics: ['methodology', 'esg'] },
    { id: 'howToVerify', tag: 'verification', hasFormula: false, topics: ['hashscan', 'traceability'] },
    { id: 'preApprovedSources', tag: 'policy', topics: ['imports', 'governance'] },
];

const GUIDANCE_TAG_CLASS: Record<GuidanceTag, string> = {
    term: 'bg-stat-blue/10 text-stat-blue',
    verification: 'bg-stat-green/10 text-stat-green',
    policy: 'bg-stat-amber/10 text-stat-amber',
};

const { t } = useI18n();
const { network } = useNetwork();

const query = ref('');
const openId = ref<string | null>(GUIDANCE_ENTRIES[0]?.id ?? null);

const filteredEntries = computed(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return GUIDANCE_ENTRIES;
    return GUIDANCE_ENTRIES.filter((e) => {
        const title = t(`reports.disclosure.entries.${e.id}.title`).toLowerCase();
        const body = t(`reports.disclosure.entries.${e.id}.body`).toLowerCase();
        const topics = e.topics.join(' ').toLowerCase();
        return title.includes(q) || body.includes(q) || topics.includes(q);
    });
});

function toggle(id: string) {
    openId.value = openId.value === id ? null : id;
}

const hashscanUrl = computed(() => `https://hashscan.io/${network.value}`);
</script>

<template>
    <div class="space-y-6">
        <!-- Framework alignment -->
        <div class="rounded-xl border bg-card p-5">
            <h3 class="text-sm font-semibold text-foreground">{{ $t('reports.disclosure.frameworksTitle') }}</h3>
            <p class="text-xs text-muted-foreground mt-1 mb-4">{{ $t('reports.disclosure.frameworksSubtitle') }}</p>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="f in FRAMEWORKS" :key="f.id" class="rounded-lg border bg-muted/20 px-4 py-3">
                    <p class="text-sm font-medium text-foreground">{{ $t(`reports.disclosure.frameworks.${f.id}.name`) }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ $t(`reports.disclosure.frameworks.${f.id}.desc`) }}</p>
                </div>
            </div>
        </div>

        <!-- Searchable guidance accordion -->
        <div class="rounded-xl border bg-card p-5">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 class="text-sm font-semibold text-foreground">{{ $t('reports.disclosure.entriesTitle') }}</h3>
                <div class="relative w-full sm:w-64">
                    <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        v-model="query"
                        type="text"
                        :placeholder="$t('reports.disclosure.searchPlaceholder')"
                        class="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            </div>

            <div class="divide-y border-t">
                <div v-if="filteredEntries.length === 0" class="py-8 text-center text-sm text-muted-foreground">
                    {{ $t('reports.disclosure.noResults') }}
                </div>
                <div v-for="e in filteredEntries" :key="e.id">
                    <button
                        type="button"
                        class="w-full flex items-center gap-3 py-3 text-left"
                        @click="toggle(e.id)"
                    >
                        <span
                            class="text-[10px] font-medium rounded-full px-2 py-0.5 uppercase shrink-0"
                            :class="GUIDANCE_TAG_CLASS[e.tag]"
                        >
                            {{ $t(`reports.disclosure.tags.${e.tag}`) }}
                        </span>
                        <span class="flex-1 text-sm font-medium text-foreground">{{ $t(`reports.disclosure.entries.${e.id}.title`) }}</span>
                        <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform" :class="openId === e.id ? 'rotate-180' : ''" />
                    </button>
                    <div v-if="openId === e.id" class="pb-4 pl-1 space-y-3">
                        <p class="text-sm text-muted-foreground leading-relaxed">{{ $t(`reports.disclosure.entries.${e.id}.body`) }}</p>
                        <pre v-if="e.hasFormula" class="text-xs bg-muted/40 rounded-md px-3 py-2 overflow-x-auto text-foreground">{{ $t(`reports.disclosure.entries.${e.id}.formula`) }}</pre>
                        <div class="flex flex-wrap gap-1.5">
                            <span v-for="tp in e.topics" :key="tp" class="text-[10px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground">#{{ tp }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Verification status callout (green) -->
        <div class="rounded-xl border border-stat-green/30 bg-stat-green/5 p-5">
            <div class="flex items-start gap-3">
                <ShieldCheck class="h-5 w-5 text-stat-green shrink-0 mt-0.5" />
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-foreground">{{ $t('reports.disclosure.verificationStatus.title') }}</h4>
                    <p class="text-xs text-muted-foreground mt-1">{{ $t('reports.disclosure.verificationStatus.body') }}</p>
                    <a :href="hashscanUrl" target="_blank" rel="noopener noreferrer"
                       class="inline-flex items-center gap-1 text-xs font-medium text-stat-green mt-2 hover:underline">
                        {{ $t('reports.disclosure.verificationStatus.hashscanLink') }}
                        <ExternalLink class="h-3 w-3" />
                    </a>
                </div>
            </div>
        </div>

        <!-- Assurance callout (amber) incl. Block Item Proof note -->
        <div class="rounded-xl border border-stat-amber/30 bg-stat-amber/5 p-5">
            <div class="flex items-start gap-3">
                <AlertTriangle class="h-5 w-5 text-stat-amber shrink-0 mt-0.5" />
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-foreground">{{ $t('reports.disclosure.assurance.title') }}</h4>
                    <p class="text-xs text-muted-foreground mt-1">{{ $t('reports.disclosure.assurance.body') }}</p>
                    <p class="text-xs text-muted-foreground mt-2 italic">{{ $t('reports.disclosure.assurance.blockItemProof') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
