<script setup lang="ts">
import {
    LayoutDashboard,
    FolderKanban,
    Coins,
    BookOpen,
    Building2,
    Users,
    Target,
    BarChart3,
    Activity,
    Leaf,
    CheckCircle2,
} from 'lucide-vue-next';

const { t, locale } = useI18n();

const collapsed = useState('sidebar-collapsed', () => false);

// Mock last sync timestamp (e.g. 15 minutes ago)
const lastSyncDate = new Date(Date.now() - 15 * 60 * 1000);
const localeTag = computed(() => (locale.value === 'es' ? 'es-ES' : 'en-US'));
const lastSyncFormatted = computed(() =>
    lastSyncDate.toLocaleDateString(localeTag.value, { month: 'short', day: 'numeric', year: 'numeric' }),
);
const lastSyncTime = computed(() =>
    lastSyncDate.toLocaleTimeString(localeTag.value, { hour: '2-digit', minute: '2-digit', hour12: true }),
);

const navItems = computed(() => [
    { label: t('nav.dashboard'), icon: LayoutDashboard, to: '/' },
    { label: t('nav.projects'), icon: FolderKanban, to: '/projects' },
    { label: t('nav.issuances'), icon: Coins, to: '/credits' },
    { label: t('nav.methodologies'), icon: BookOpen, to: '/methodologies' },
    { label: t('nav.registries'), icon: Building2, to: '/registries' },
    { label: t('nav.developers'), icon: Users, to: '/developers' },
    { label: t('nav.sdgs'), icon: Target, to: '/sdgs' },
    { label: t('nav.analytics'), icon: BarChart3, to: '/analytics' },
    { label: t('nav.syncStatus'), icon: Activity, to: '/status' },
]);
</script>

<template>
    <aside
        class="sticky top-0 flex h-screen flex-col border-r bg-card text-sidebar-foreground transition-all duration-300"
        :class="collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'"
    >
        <!-- Logo -->
        <div class="flex h-12 items-center gap-2.5 px-4">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Leaf class="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div v-if="!collapsed" class="flex items-baseline gap-1.5">
                <span class="text-sm font-semibold text-foreground">{{ $t('nav.sustainable') }}</span>
                <span class="text-xs text-muted-foreground">{{ $t('nav.explorer') }}</span>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-0.5 px-2 pt-1 overflow-y-auto">
            <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="group flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                active-class="!bg-primary/8 !text-primary !font-semibold"
            >
                <component
                    :is="item.icon"
                    class="h-[18px] w-[18px] shrink-0 transition-colors group-hover:text-foreground"
                />
                <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </NuxtLink>
        </nav>

        <!-- Last Synced -->
        <div class="shrink-0 border-t px-3 py-3">
            <div v-if="!collapsed" class="flex items-start gap-2">
                <CheckCircle2 class="h-3.5 w-3.5 shrink-0 text-stat-green mt-0.5" />
                <div>
                    <div class="text-[11px] font-medium text-muted-foreground">{{ $t('nav.dataSyncedUpTo') }}</div>
                    <div class="text-[11px] text-foreground">{{ lastSyncFormatted }}, {{ lastSyncTime }}</div>
                </div>
            </div>
            <div v-else class="flex justify-center" :title="`${$t('nav.dataSyncedUpTo')}: ${lastSyncFormatted}, ${lastSyncTime}`">
                <CheckCircle2 class="h-4 w-4 text-stat-green" />
            </div>
        </div>
    </aside>
</template>
