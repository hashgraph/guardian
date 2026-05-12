<script setup lang="ts">
import {
    PanelLeft, Globe, ChevronDown, ChevronRight, Search, Check,
    LayoutDashboard, FolderKanban, Coins, BookOpen, Building2, Users,
    Target, BarChart3, Activity,
} from 'lucide-vue-next';
import { onClickOutside, useDebounceFn } from '@vueuse/core';
import { networkOptions } from '~/composables/useNetwork';
import { formatCredits } from '~/lib/format';

const { t, locale, locales, setLocale } = useI18n();

const collapsed = useState('sidebar-collapsed', () => false);
const { network, currentNetwork, setNetwork } = useNetwork();
const router = useRouter();
const route = useRoute();

// --- Breadcrumbs ---
const routeMeta = computed<Record<string, { label: string; icon: any }>>(() => ({
    '/': { label: t('nav.dashboard'), icon: LayoutDashboard },
    '/projects': { label: t('nav.projects'), icon: FolderKanban },
    '/credits': { label: t('nav.issuances'), icon: Coins },
    '/methodologies': { label: t('nav.methodologies'), icon: BookOpen },
    '/registries': { label: t('nav.registries'), icon: Building2 },
    '/developers': { label: t('nav.developers'), icon: Users },
    '/sdgs': { label: t('nav.sdgs'), icon: Target },
    '/analytics': { label: t('nav.analytics'), icon: BarChart3 },
    '/status': { label: t('nav.syncStatus'), icon: Activity },
}));

// Cache resolved detail names by `${parent}|${id}` so breadcrumbs stay stable
// across re-renders and don't refetch on every keystroke elsewhere on the page.
const detailLabelCache = ref<Record<string, string>>({});

async function resolveDetailLabel(parentPath: string, paramId: string) {
    const cacheKey = `${parentPath}|${paramId}`;
    if (detailLabelCache.value[cacheKey]) return;

    let endpoint: string | null = null;
    if (parentPath === '/projects') endpoint = `projects/${paramId}`;
    else if (parentPath === '/methodologies') endpoint = `methodologies/${paramId}`;
    if (!endpoint) return;

    if (!import.meta.client) return;

    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;

    try {
        const res = await $fetch<{ name?: string; displayName?: string }>(
            `/api/v1/${network.value}/${endpoint}`,
            { baseURL },
        );
        const label = res?.name || res?.displayName;
        if (label) detailLabelCache.value[cacheKey] = label;
    } catch {
        // Leave the cache untouched on error — breadcrumb shows raw id as fallback.
    }
}

watch(
    () => [route.path, network.value],
    () => {
        const segments = route.path.split('/').filter(Boolean);
        if (segments.length < 2) return;
        const parentPath = '/' + segments[0];
        const paramId = segments[1];
        resolveDetailLabel(parentPath, paramId);
    },
    { immediate: true },
);

const breadcrumbs = computed(() => {
    const path = route.path;
    const crumbs: { label: string; icon?: any; to?: string }[] = [];

    // Always start with Dashboard
    if (path === '/') {
        crumbs.push({ label: t('nav.dashboard'), icon: LayoutDashboard });
        return crumbs;
    }
    crumbs.push({ label: t('nav.dashboard'), icon: LayoutDashboard, to: '/' });

    // Split path into segments
    const segments = path.split('/').filter(Boolean);
    const parentPath = '/' + segments[0];
    const meta = routeMeta.value[parentPath];

    if (meta) {
        if (segments.length === 1) {
            // Top-level page (e.g. /projects) — no link, it's the current page
            crumbs.push({ label: meta.label, icon: meta.icon });
        } else {
            // Detail page (e.g. /projects/3) — parent is a link
            crumbs.push({ label: meta.label, icon: meta.icon, to: parentPath });

            // Resolve detail label live from the API; fall back to the raw param
            // until the fetch completes (or if it fails). Never show "Not Found"
            // — the row almost certainly exists, the breadcrumb just lacked data.
            const paramId = segments[1];
            const cacheKey = `${parentPath}|${paramId}`;
            const detailLabel = detailLabelCache.value[cacheKey] ?? paramId;
            crumbs.push({ label: detailLabel });
        }
    }

    return crumbs;
});

// --- Language dropdown ---
const languageDropdownOpen = ref(false);
const languageRef = ref<HTMLElement | null>(null);
onClickOutside(languageRef, () => { languageDropdownOpen.value = false; });

// Map locale codes to country codes for flag display
const localeToCountry: Record<string, string> = {
    en: 'us',
    es: 'es',
};

function flagForLocale(code: string): string {
    return localeToCountry[code] || code;
}

async function selectLanguage(code: string) {
    await setLocale(code as any);
    languageDropdownOpen.value = false;
}

// --- Network dropdown ---
const networkDropdownOpen = ref(false);
const networkRef = ref<HTMLElement | null>(null);
onClickOutside(networkRef, () => { networkDropdownOpen.value = false; });

function selectNetwork(id: 'mainnet' | 'testnet') {
    setNetwork(id);
    networkDropdownOpen.value = false;
}

// --- Search with autocomplete ---
const searchQuery = ref('');
const searchOpen = ref(false);
const searchRef = ref<HTMLElement | null>(null);
const selectedIndex = ref(-1);

onClickOutside(searchRef, () => { searchOpen.value = false; });

// Live global search across projects / methodologies / registries / credits.
// Each list endpoint already supports a `search` query param backed by
// PostgreSQL tsvector + pg_trgm \u2014 we fan out in parallel and merge top hits.

interface GlobalResult {
    type: string;
    icon: any;
    color: string;
    title: string;
    sub: string;
    to: string;
}

const filteredResults = ref<GlobalResult[]>([]);
const searchPending = ref(false);
let searchSeq = 0;

const PER_TYPE_LIMIT = 4;

async function runGlobalSearch(rawQuery: string) {
    const q = rawQuery.trim();
    if (q.length < 2) {
        filteredResults.value = [];
        searchPending.value = false;
        return;
    }

    const seq = ++searchSeq;
    searchPending.value = true;

    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;
    const net = network.value;

    const fetchList = async <T = any>(path: string): Promise<T[]> => {
        try {
            const res = await $fetch<{ data?: T[] }>(
                `/api/v1/${net}/${path}`,
                {
                    baseURL,
                    params: { search: q, limit: PER_TYPE_LIMIT, page: 1 },
                },
            );
            return res?.data ?? [];
        } catch {
            return [];
        }
    };

    const [projects, methodologies, registries, credits] = await Promise.all([
        fetchList<any>('projects'),
        fetchList<any>('methodologies'),
        fetchList<any>('registries'),
        fetchList<any>('credits'),
    ]);

    // A more recent search may have started while this one was in flight \u2014
    // discard stale results to avoid flicker.
    if (seq !== searchSeq) return;

    const items: GlobalResult[] = [];

    for (const p of projects) {
        items.push({
            type: t('topbar.itemType.project'),
            icon: FolderKanban,
            color: 'text-stat-amber',
            title: p.name ?? p.displayName ?? '\u2014',
            sub: [p.registry ?? p.registryName, p.methodology, p.status]
                .filter(Boolean).join(' \u00b7 '),
            // The /projects/:id route accepts sourceTimestamp or projectKey;
            // p.id is the business_view row PK (numeric), which the API doesn't
            // resolve and produces a 404.
            to: `/projects/${p.sourceTimestamp ?? p.projectKey ?? p.id}`,
        });
    }

    for (const m of methodologies) {
        items.push({
            type: t('topbar.itemType.methodology'),
            icon: BookOpen,
            color: 'text-stat-green',
            title: m.name ?? m.displayName ?? '\u2014',
            sub: [m.registryName, m.version && `v${m.version}`,
                  m.stats?.projectCount != null && `${m.stats.projectCount} ${t('topbar.projectsLabel')}`,
            ].filter(Boolean).join(' \u00b7 '),
            to: `/methodologies/${m.topicId ?? m.id}`,
        });
    }

    for (const r of registries) {
        items.push({
            type: t('topbar.itemType.registry'),
            icon: Building2,
            color: 'text-stat-blue',
            title: r.name ?? r.displayName ?? '\u2014',
            sub: [r.stats?.policyCount != null && `${r.stats.policyCount} ${t('topbar.policies')}`,
                  r.stats?.projectCount != null && `${r.stats.projectCount} ${t('topbar.projectsLabel')}`,
            ].filter(Boolean).join(' \u00b7 '),
            to: `/registries${r.did ? `?did=${encodeURIComponent(r.did)}` : ''}`,
        });
    }

    for (const c of credits) {
        items.push({
            type: t('topbar.itemType.issuance'),
            icon: Coins,
            color: 'text-stat-rose',
            title: c.symbol ? `${c.name ?? '\u2014'} (${c.symbol})` : (c.name ?? '\u2014'),
            sub: [c.tokenId && `${t('topbar.token')} ${c.tokenId}`,
                  c.supply != null && formatCredits(Number(c.supply)),
            ].filter(Boolean).join(' \u00b7 '),
            to: '/credits',
        });
    }

    filteredResults.value = items;
    searchPending.value = false;
}

const debouncedSearch = useDebounceFn((q: string) => {
    runGlobalSearch(q);
    searchOpen.value = q.trim().length >= 2;
    selectedIndex.value = -1;
}, 250);

function onSearchInput() {
    debouncedSearch(searchQuery.value);
}

// Re-run when the network switches so results match the current scope.
watch(network, () => {
    if (searchQuery.value.trim().length >= 2) runGlobalSearch(searchQuery.value);
});

function onSearchFocus() {
    if (searchQuery.value.trim().length >= 2) {
        searchOpen.value = true;
    }
}

function selectResult(result: GlobalResult) {
    searchOpen.value = false;
    searchQuery.value = '';
    router.push(result.to);
}

function onSearchKeydown(e: KeyboardEvent) {
    if (!searchOpen.value || filteredResults.value.length === 0) {
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex.value = Math.min(selectedIndex.value + 1, filteredResults.value.length - 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex.value >= 0) {
            selectResult(filteredResults.value[selectedIndex.value]);
        }
    } else if (e.key === 'Escape') {
        searchOpen.value = false;
    }
}
</script>

<template>
    <header class="relative z-40 flex shrink-0 items-center h-12 border-b bg-card px-4 gap-4">
        <!-- Left: sidebar toggle -->
        <button
            class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            @click="collapsed = !collapsed"
        >
            <PanelLeft class="h-4 w-4" />
        </button>

        <!-- Breadcrumbs -->
        <nav v-if="breadcrumbs.length > 0" class="flex items-center gap-1.5 min-w-0">
            <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
                <ChevronRight v-if="idx > 0" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                <NuxtLink
                    v-if="crumb.to"
                    :to="crumb.to"
                    class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    <component :is="crumb.icon" v-if="crumb.icon" class="h-3.5 w-3.5" />
                    {{ crumb.label }}
                </NuxtLink>
                <span
                    v-else
                    class="flex items-center gap-1 text-xs font-medium text-foreground truncate max-w-[200px]"
                >
                    <component :is="crumb.icon" v-if="crumb.icon" class="h-3.5 w-3.5 shrink-0" />
                    {{ crumb.label }}
                </span>
            </template>
        </nav>

        <!-- Center: search with autocomplete -->
        <div class="flex-1 flex justify-center">
            <div ref="searchRef" class="relative w-full max-w-md">
                <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                    v-model="searchQuery"
                    :placeholder="$t('topbar.searchPlaceholder')"
                    class="w-full h-8 rounded-md border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    @input="onSearchInput"
                    @focus="onSearchFocus"
                    @keydown="onSearchKeydown"
                />

                <!-- Autocomplete dropdown -->
                <Transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 -translate-y-1"
                >
                    <div
                        v-if="searchOpen"
                        class="absolute left-0 right-0 top-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden"
                    >
                        <div class="px-3 py-1.5 border-b bg-muted/30 flex items-center justify-between">
                            <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Results</span>
                            <span v-if="searchPending" class="text-[10px] text-muted-foreground">{{ $t('common.searchEllipsis') }}</span>
                        </div>
                        <div v-if="filteredResults.length > 0" class="py-1">
                            <button
                                v-for="(result, idx) in filteredResults"
                                :key="idx"
                                class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors"
                                :class="idx === selectedIndex ? 'bg-accent' : 'hover:bg-muted/50'"
                                @click="selectResult(result)"
                                @mouseenter="selectedIndex = idx"
                            >
                                <div :class="[result.color, 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted']">
                                    <component :is="result.icon" class="h-3.5 w-3.5" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs font-medium text-foreground truncate">{{ result.title }}</p>
                                    <p class="text-[11px] text-muted-foreground truncate">{{ result.sub }}</p>
                                </div>
                                <span class="text-[10px] font-medium text-muted-foreground/60 uppercase">{{ result.type }}</span>
                            </button>
                        </div>
                        <div v-else-if="!searchPending" class="px-3 py-4 text-center text-xs text-muted-foreground">
                            No results
                        </div>
                    </div>
                </Transition>
            </div>
        </div>

        <!-- Right: language selector -->
        <div ref="languageRef" class="relative flex items-center">
            <button
                class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                :class="languageDropdownOpen ? 'bg-muted text-foreground' : 'text-muted-foreground'"
                :aria-label="$t('topbar.language')"
                @click="languageDropdownOpen = !languageDropdownOpen"
            >
                <CountryFlag :code="flagForLocale(locale)" size="sm" />
                <span class="uppercase">{{ locale }}</span>
                <ChevronDown
                    class="h-3 w-3 opacity-50 transition-transform"
                    :class="languageDropdownOpen ? 'rotate-180' : ''"
                />
            </button>

            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
            >
                <div
                    v-if="languageDropdownOpen"
                    class="absolute right-0 top-full mt-1 w-40 rounded-md border bg-popover p-1 shadow-md"
                >
                    <button
                        v-for="lang in locales"
                        :key="(lang as any).code"
                        class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="selectLanguage((lang as any).code)"
                    >
                        <CountryFlag :code="flagForLocale((lang as any).code)" size="sm" />
                        <span class="flex-1 text-left">{{ (lang as any).name }}</span>
                        <Check
                            v-if="locale === (lang as any).code"
                            class="h-3.5 w-3.5 text-primary"
                        />
                    </button>
                </div>
            </Transition>
        </div>

        <!-- Right: network selector -->
        <div ref="networkRef" class="relative flex items-center">
            <button
                class="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                :class="networkDropdownOpen ? 'bg-muted text-foreground' : 'text-muted-foreground'"
                @click="networkDropdownOpen = !networkDropdownOpen"
            >
                <Globe class="h-3.5 w-3.5" />
                <span
                    class="h-2 w-2 rounded-full"
                    :class="currentNetwork.dotColor"
                />
                <span>{{ currentNetwork.label }}</span>
                <ChevronDown
                    class="h-3 w-3 opacity-50 transition-transform"
                    :class="networkDropdownOpen ? 'rotate-180' : ''"
                />
            </button>

            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
            >
                <div
                    v-if="networkDropdownOpen"
                    class="absolute right-0 top-full mt-1 w-52 rounded-md border bg-popover p-1 shadow-md"
                >
                    <button
                        v-for="option in networkOptions"
                        :key="option.id"
                        class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="selectNetwork(option.id)"
                    >
                        <span
                            class="h-2 w-2 rounded-full"
                            :class="option.dotColor"
                        />
                        <span class="flex-1 text-left">{{ option.label }}</span>
                        <Check
                            v-if="currentNetwork.id === option.id"
                            class="h-3.5 w-3.5 text-primary"
                        />
                    </button>
                </div>
            </Transition>
        </div>
    </header>
</template>
