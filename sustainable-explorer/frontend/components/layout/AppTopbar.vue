<script setup lang="ts">
import {
    PanelLeft, Globe, ChevronDown, ChevronRight, Search, Check,
    LayoutDashboard, FolderKanban, Coins, BookOpen, Building2, Users,
    Target, BarChart3, Activity, ArrowRight,
} from 'lucide-vue-next';
import { onClickOutside, useDebounceFn } from '@vueuse/core';
import { networkOptions } from '~/composables/useNetwork';
import { MOCK_PROJECTS, MOCK_CREDITS } from '~/data';
import { formatCredits } from '~/lib/format';

const collapsed = useState('sidebar-collapsed', () => false);
const { currentNetwork, setNetwork } = useNetwork();
const router = useRouter();
const route = useRoute();

// --- Breadcrumbs ---
const routeMeta: Record<string, { label: string; icon: any }> = {
    '/': { label: 'Dashboard', icon: LayoutDashboard },
    '/projects': { label: 'Projects', icon: FolderKanban },
    '/credits': { label: 'Issuances', icon: Coins },
    '/methodologies': { label: 'Methodologies', icon: BookOpen },
    '/registries': { label: 'Registries', icon: Building2 },
    '/developers': { label: 'Developers', icon: Users },
    '/sdgs': { label: 'SDGs', icon: Target },
    '/analytics': { label: 'Analytics', icon: BarChart3 },
    '/status': { label: 'Sync Status', icon: Activity },
};

const breadcrumbs = computed(() => {
    const path = route.path;
    const crumbs: { label: string; icon: any; to?: string }[] = [];

    // Always start with Dashboard
    if (path === '/') {
        crumbs.push({ label: 'Dashboard', icon: LayoutDashboard });
        return crumbs;
    }
    crumbs.push({ label: 'Dashboard', icon: LayoutDashboard, to: '/' });

    // Split path into segments
    const segments = path.split('/').filter(Boolean);
    const parentPath = '/' + segments[0];
    const meta = routeMeta[parentPath];

    if (meta) {
        if (segments.length === 1) {
            // Top-level page (e.g. /projects) — no link, it's the current page
            crumbs.push({ label: meta.label, icon: meta.icon });
        } else {
            // Detail page (e.g. /projects/3) — parent is a link
            crumbs.push({ label: meta.label, icon: meta.icon, to: parentPath });

            // Resolve detail label from mock data
            const paramId = segments[1];
            let detailLabel = paramId;
            if (parentPath === '/projects') {
                const project = MOCK_PROJECTS.find(p => p.id === paramId);
                detailLabel = project?.name || 'Not Found';
            }
            crumbs.push({ label: detailLabel });
        }
    }

    return crumbs;
});

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

// Search index derived from mock data
const searchIndex = computed(() => {
    const items: { type: string; icon: any; color: string; title: string; sub: string; to: string }[] = [];

    // Projects
    for (const p of MOCK_PROJECTS) {
        items.push({
            type: 'Project',
            icon: FolderKanban,
            color: 'text-stat-amber',
            title: p.name,
            sub: `${p.registry} ${p.methodology} \u00b7 ${p.status}`,
            to: `/projects/${p.id}`,
        });
    }

    // Credits
    for (const c of MOCK_CREDITS) {
        items.push({
            type: 'Issuance',
            icon: Coins,
            color: 'text-stat-rose',
            title: `${c.name} (${c.symbol})`,
            sub: `Token ${c.tokenId} \u00b7 ${formatCredits(c.supply)}`,
            to: '/credits',
        });
    }

    // Methodologies (derived from projects)
    const methMap: Record<string, { name: string; registry: string; projects: number }> = {};
    for (const p of MOCK_PROJECTS) {
        if (!methMap[p.methodologyId]) {
            methMap[p.methodologyId] = { name: p.methodology, registry: p.registry, projects: 0 };
        }
        methMap[p.methodologyId].projects++;
    }
    for (const m of Object.values(methMap)) {
        items.push({
            type: 'Methodology',
            icon: BookOpen,
            color: 'text-stat-green',
            title: m.name,
            sub: `${m.registry} \u00b7 ${m.projects} projects`,
            to: '/methodologies',
        });
    }

    // Registries (derived from projects)
    const regMap: Record<string, { policies: Set<string>; projects: number }> = {};
    for (const p of MOCK_PROJECTS) {
        if (!regMap[p.registry]) regMap[p.registry] = { policies: new Set(), projects: 0 };
        regMap[p.registry].policies.add(p.methodologyId);
        regMap[p.registry].projects++;
    }
    for (const [name, data] of Object.entries(regMap)) {
        items.push({
            type: 'Registry',
            icon: Building2,
            color: 'text-stat-blue',
            title: name,
            sub: `${data.policies.size} policies \u00b7 ${data.projects} projects`,
            to: '/registries',
        });
    }

    return items;
});

const filteredResults = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex.value
        .filter(item => item.title.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q) || item.type.toLowerCase().includes(q))
        .slice(0, 7);
});

const debouncedOpen = useDebounceFn(() => {
    searchOpen.value = searchQuery.value.trim().length >= 2;
    selectedIndex.value = -1;
}, 150);

function onSearchInput() {
    debouncedOpen();
}

function onSearchFocus() {
    if (searchQuery.value.trim().length >= 2) {
        searchOpen.value = true;
    }
}

function selectResult(result: typeof searchIndex.value[0]) {
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
                    placeholder="Search projects, credits, registries..."
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
                        v-if="searchOpen && filteredResults.length > 0"
                        class="absolute left-0 right-0 top-full mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden"
                    >
                        <div class="py-1">
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

                    </div>
                </Transition>
            </div>
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
