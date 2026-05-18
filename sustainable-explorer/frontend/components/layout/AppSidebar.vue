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
        class="sticky top-0 flex h-screen flex-col border-r bg-card text-sidebar-foreground transition-[width] duration-300 ease-out"
        :class="collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'"
    >
        <!-- Logo -->
        <div class="flex h-12 items-center gap-2.5 px-4">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary ring-1 ring-primary/20 transition-transform hover:scale-105">
                <Leaf class="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <Transition
                enter-active-class="transition-all duration-200 delay-100 ease-out"
                enter-from-class="opacity-0 -translate-x-2"
                enter-to-class="opacity-100 translate-x-0"
                leave-active-class="transition-all duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0 -translate-x-2"
            >
                <div v-if="!collapsed" class="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span class="text-sm font-semibold text-foreground tracking-tight">{{ $t('nav.sustainable') }}</span>
                    <span class="text-xs text-muted-foreground">{{ $t('nav.explorer') }}</span>
                </div>
            </Transition>
        </div>

        <!-- Navigation. The `group` parent + `before:` pseudo-element draws an
             active-state indicator pill on the left edge of the active item;
             a brief scale on the icon under hover gives the row tactile
             feedback without animating layout properties. Title-attribute
             tooltip activates only when collapsed so icon-only items remain
             discoverable. -->
        <nav class="flex-1 space-y-0.5 px-2 pt-1 overflow-y-auto overflow-x-hidden">
            <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                :title="collapsed ? item.label : undefined"
                class="group relative flex items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:scale-y-0 before:rounded-r-full before:bg-primary before:transition-transform before:duration-200 before:ease-out"
                active-class="!bg-primary/8 !text-primary !font-semibold before:!scale-y-100"
            >
                <component
                    :is="item.icon"
                    class="h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110"
                />
                <Transition
                    enter-active-class="transition-all duration-150 delay-75 ease-out"
                    enter-from-class="opacity-0 -translate-x-1"
                    enter-to-class="opacity-100 translate-x-0"
                    leave-active-class="transition-opacity duration-75"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                >
                    <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
                </Transition>
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
