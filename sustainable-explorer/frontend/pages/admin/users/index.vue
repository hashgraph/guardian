<script setup lang="ts">
import { UserPlus, Shield, User as UserIcon, Loader2, CheckCircle2, XCircle, Gauge } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { AdminUser, AdminRole } from '~/composables/useAdminUsers';
import type { FilterOption } from '~/components/shared/FilterBar.vue';

definePageMeta({ middleware: 'admin' });

const { user: currentUser } = useAuth();
const adminUsers = useAdminUsers();
const rl = useRateLimit();
const { t } = useI18n();

const showCreate = ref(false);
const busyId = ref<string | null>(null);
const tab = ref<'users' | 'requests'>('users');
const pendingCount = ref(0);

// Fetch all users up-front (client-side search/filter/paginate via the shared
// table stack). limit:1000 covers realistic user counts; beyond that we'd move to
// server-side paging.
const { data, pending, refresh } = await useAsyncData('admin-users', () =>
    adminUsers.list({ limit: 1000 }),
);

// Whether rate limiting is actually enforced — when off, the quota/requests
// controls are cosmetic, so they're disabled (faded + tooltip).
const { data: rlSummary } = await useAsyncData('admin-rl-flag', () => rl.getMine());
const rlEnforced = computed(() => rlSummary.value?.rateLimitEnforced ?? false);

const counts = computed(() => data.value?.counts ?? { active: 0, inactive: 0, total: 0 });

// Derive rows with helper fields so client-side filters can match on them.
const rows = computed(() =>
    (data.value?.data ?? []).map(u => ({
        ...u,
        verified: u.emailVerifiedAt ? 'verified' : 'unverified',
        status: u.isActive ? 'active' : 'inactive',
    })),
);

// ── useFilteredPagination ──────────────────────────────────────────────────────
const {
    searchQuery,
    currentPage,
    paginated,
    filtered,
    totalPages,
    pageSize,
    activeFilters,
    sortKey,
    sortDir,
    toggleSort,
    setFilter,
    clearFilters,
} = useFilteredPagination(rows, {
    searchFields: ['firstName', 'lastName', 'email', 'organisation', 'jobTitle', 'country'],
    pageSize: 25,
    defaultSort: { key: 'createdAt', dir: 'desc' },
    syncUrl: false,
});

const filters = computed<FilterOption[]>(() => [
    {
        key: 'role',
        label: t('userMgmt.role'),
        options: [
            { value: 'admin', label: t('userMgmt.roleAdmin') },
            { value: 'system_user', label: t('userMgmt.roleUser') },
        ],
    },
    {
        key: 'status',
        label: t('userMgmt.colStatus'),
        options: [
            { value: 'active', label: t('userMgmt.active') },
            { value: 'inactive', label: t('userMgmt.inactive') },
        ],
    },
    {
        key: 'verified',
        label: t('userMgmt.colVerified'),
        options: [
            { value: 'verified', label: t('userMgmt.verified') },
            { value: 'unverified', label: t('userMgmt.unverified') },
        ],
    },
]);

// ── Actions ───────────────────────────────────────────────────────────────────
function apiError(err: unknown): string {
    const e = err as { data?: { message?: string | string[] } };
    const m = e?.data?.message;
    return (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
}

async function onCreated() {
    toast.success(t('userMgmt.createdToast'));
    await refresh();
}

async function toggleStatus(u: AdminUser) {
    busyId.value = u.id;
    try {
        await adminUsers.setStatus(u.id, !u.isActive);
        toast.success(u.isActive ? t('userMgmt.deactivatedToast') : t('userMgmt.activatedToast'));
        await refresh();
    } catch (err) {
        toast.error(apiError(err));
    } finally {
        busyId.value = null;
    }
}

// ── Rate-limit (quota) adjustment ─────────────────────────────────────────────
const quotaUser = ref<AdminUser | null>(null);
const quotaValue = ref<number | null>(null);
const quotaJustification = ref('');
const quotaSaving = ref(false);

function openQuota(u: AdminUser) {
    quotaUser.value = u;
    quotaValue.value = u.apiQuotaPerHour ?? null;
    quotaJustification.value = '';
}
function closeQuota() {
    quotaUser.value = null;
}

async function saveQuota() {
    if (!quotaUser.value || quotaValue.value == null) return;
    if (!quotaJustification.value.trim()) {
        toast.error(t('userMgmt.quota.justificationRequired'));
        return;
    }
    quotaSaving.value = true;
    try {
        await adminUsers.setQuota(quotaUser.value.id, quotaValue.value, quotaJustification.value.trim());
        toast.success(t('userMgmt.quota.savedToast'));
        closeQuota();
        await refresh();
    } catch (err) {
        toast.error(apiError(err));
    } finally {
        quotaSaving.value = false;
    }
}

const skeletonRows = computed(() => Array.from({ length: Math.min(pageSize.value, 10) }, (_, i) => i));
</script>

<template>
    <div class="mx-auto w-full max-w-[1600px] xl:max-w-full px-4 sm:px-6 py-8">
        <header class="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold text-foreground">{{ $t('userMgmt.title') }}</h1>
                <p class="mt-1 text-sm text-muted-foreground">{{ $t('userMgmt.subtitle') }}</p>
            </div>
            <button
                v-if="tab === 'users'"
                class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
                @click="showCreate = true"
            >
                <UserPlus class="h-4 w-4" />
                {{ $t('userMgmt.createButton') }}
            </button>
        </header>

        <!-- Tabs -->
        <div class="mb-5 flex gap-1 border-b overflow-x-auto">
            <button
                class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                :class="tab === 'users' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                @click="tab = 'users'"
            >
                {{ $t('userMgmt.tabUsers') }}
            </button>
            <span
                class="-mb-px inline-flex"
                :class="{ 'cursor-not-allowed': !rlEnforced }"
                :title="!rlEnforced ? $t('rateLimit.disabledTooltip') : undefined"
            >
                <button
                    :disabled="!rlEnforced"
                    class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 whitespace-nowrap"
                    :class="tab === 'requests' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
                    @click="tab = 'requests'"
                >
                    {{ $t('userMgmt.tabRequests') }}
                    <span v-if="pendingCount > 0" class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{{ pendingCount }}</span>
                </button>
            </span>
        </div>

        <!-- Users tab -->
        <div v-if="tab === 'users'">

            <!-- Counts bar -->
            <div class="mb-4 flex flex-wrap gap-3 text-sm">
                <span class="rounded-md bg-muted px-3 py-1.5 text-muted-foreground">
                    {{ $t('userMgmt.total') }}: <b class="text-foreground">{{ counts.total }}</b>
                </span>
                <span class="rounded-md bg-green-50 px-3 py-1.5 text-green-700 dark:bg-green-950/30 dark:text-green-300">
                    {{ counts.active }} {{ $t('userMgmt.active') }}
                </span>
                <span class="rounded-md bg-gray-100 px-3 py-1.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {{ counts.inactive }} {{ $t('userMgmt.inactive') }}
                </span>
            </div>

            <!-- FilterBar -->
            <div class="mb-4">
                <FilterBar
                    v-model="searchQuery"
                    :filters="filters"
                    :active-filters="activeFilters"
                    :result-count="filtered.length"
                    :total-count="counts.total"
                    :search-placeholder="$t('userMgmt.searchPlaceholder')"
                    @filter="setFilter"
                    @clear="clearFilters"
                />
            </div>

            <!-- Table -->
            <div class="rounded-xl border bg-card overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm" style="min-width: 1100px">
                        <thead class="bg-muted/30">
                            <tr class="border-b">
                                <SortableHeader
                                    :label="$t('userMgmt.colFirstName')"
                                    sort-key="firstName"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.colLastName')"
                                    sort-key="lastName"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('auth.email')"
                                    sort-key="email"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.colOrganisation')"
                                    sort-key="organisation"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.colJobTitle')"
                                    sort-key="jobTitle"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.colCountry')"
                                    sort-key="country"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.role')"
                                    sort-key="role"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.colStatus')"
                                    sort-key="status"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <SortableHeader
                                    :label="$t('userMgmt.colCreated')"
                                    sort-key="createdAt"
                                    :active-sort-key="sortKey as string"
                                    :sort-dir="sortDir"
                                    @sort="toggleSort($event as any)"
                                />
                                <th class="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                    {{ $t('userMgmt.colActions') }}
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <!-- Loading skeleton -->
                            <template v-if="pending && paginated.length === 0">
                                <tr v-for="i in skeletonRows" :key="`sk-${i}`">
                                    <td v-for="col in 10" :key="col" class="py-3 px-4">
                                        <Skeleton class="h-4 w-full max-w-[100px]" />
                                    </td>
                                </tr>
                            </template>

                            <template v-else>
                                <tr v-if="paginated.length === 0">
                                    <td colspan="10" class="py-12 text-center text-sm text-muted-foreground">
                                        {{ $t('userMgmt.empty') }}
                                    </td>
                                </tr>

                                <tr
                                    v-for="u in paginated"
                                    :key="u.id"
                                    class="hover:bg-muted/30 transition-colors"
                                >
                                    <!-- First Name -->
                                    <td class="px-4 py-3">
                                        <span class="font-medium text-foreground">{{ u.firstName || '—' }}</span>
                                        <span v-if="u.id === currentUser?.id" class="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                            {{ $t('userMgmt.you') }}
                                        </span>
                                    </td>
                                    <!-- Last Name -->
                                    <td class="px-4 py-3 text-muted-foreground">{{ u.lastName || '—' }}</td>
                                    <!-- Email -->
                                    <td class="px-4 py-3 text-muted-foreground">{{ u.email }}</td>
                                    <!-- Organisation -->
                                    <td class="px-4 py-3 text-muted-foreground">{{ u.organisation || '—' }}</td>
                                    <!-- Job Title -->
                                    <td class="px-4 py-3 text-muted-foreground">{{ u.jobTitle || '—' }}</td>
                                    <!-- Country -->
                                    <td class="px-4 py-3 text-muted-foreground">
                                        {{ u.country ? (countryFlag(u.country) + ' ' + countryName(u.country)).trim() : '—' }}
                                    </td>
                                    <!-- Role -->
                                    <td class="px-4 py-3">
                                        <span
                                            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                            :class="u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-muted text-muted-foreground'"
                                        >
                                            <component :is="u.role === 'admin' ? Shield : UserIcon" class="h-3 w-3" />
                                            {{ u.role === 'admin' ? $t('userMgmt.roleAdmin') : $t('userMgmt.roleUser') }}
                                        </span>
                                    </td>
                                    <!-- Status -->
                                    <td class="px-4 py-3">
                                        <span class="inline-flex items-center gap-1.5 text-xs">
                                            <span class="h-1.5 w-1.5 rounded-full" :class="u.isActive ? 'bg-green-500' : 'bg-gray-400'" />
                                            {{ u.isActive ? $t('userMgmt.active') : $t('userMgmt.inactive') }}
                                        </span>
                                    </td>
                                    <!-- Created -->
                                    <td class="px-4 py-3 text-xs text-muted-foreground" :title="new Date(u.createdAt).toLocaleString()">
                                        {{ timeAgo(u.createdAt) }}
                                    </td>
                                    <!-- Actions (fixed-width slots so buttons align across rows) -->
                                    <td class="px-4 py-3">
                                        <div class="flex items-center justify-end gap-2">
                                            <!-- Limit slot: fixed width; an invisible placeholder keeps admin rows aligned -->
                                            <span
                                                v-if="u.role === 'system_user'"
                                                class="inline-flex w-[76px]"
                                                :class="{ 'cursor-not-allowed': !rlEnforced }"
                                                :title="!rlEnforced ? $t('rateLimit.disabledTooltip') : undefined"
                                            >
                                                <button
                                                    :disabled="busyId === u.id || !rlEnforced"
                                                    class="inline-flex w-full items-center justify-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                                    @click="openQuota(u)"
                                                >
                                                    <Gauge class="h-3.5 w-3.5" />
                                                    {{ $t('userMgmt.quota.button') }}
                                                </button>
                                            </span>
                                            <span v-else class="w-[76px]" aria-hidden="true" />
                                            <!-- Status: fixed width so 'Activate'/'Deactivate' don't resize the button -->
                                            <button
                                                :disabled="busyId === u.id || u.id === currentUser?.id"
                                                class="inline-flex w-[104px] items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                                                :class="u.isActive ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'"
                                                @click="toggleStatus(u)"
                                            >
                                                <Loader2 v-if="busyId === u.id" class="h-3.5 w-3.5 animate-spin" />
                                                <template v-else>
                                                    {{ u.isActive ? $t('userMgmt.deactivate') : $t('userMgmt.activate') }}
                                                </template>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Pagination -->
            <Pagination
                :current-page="currentPage"
                :page-size="pageSize"
                :total-pages="totalPages"
                :total-items="filtered.length"
                @update:current-page="currentPage = $event"
                @update:page-size="pageSize = $event"
            />
        </div>

        <!-- Rate limit requests tab -->
        <RateLimitRequestsPanel v-else @pending-count="pendingCount = $event" />

        <AdminCreateUserModal :open="showCreate" @close="showCreate = false" @created="onCreated" />

        <!-- Reduce / set rate limit -->
        <Teleport to="body">
            <div
                v-if="quotaUser"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
                @click.self="closeQuota()"
            >
                <div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
                    <div class="mb-1 flex items-center gap-2">
                        <Gauge class="h-5 w-5 text-primary" />
                        <h2 class="text-lg font-semibold text-foreground">{{ $t('userMgmt.quota.title') }}</h2>
                    </div>
                    <p class="mb-4 text-sm text-muted-foreground">{{ $t('userMgmt.quota.subtitle', { email: quotaUser.email }) }}</p>

                    <form class="space-y-3" @submit.prevent="saveQuota()">
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('userMgmt.quota.limitLabel') }}</label>
                            <input
                                v-model.number="quotaValue" type="number" min="1" required
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p class="mt-1 text-xs text-muted-foreground">
                                {{ $t('userMgmt.quota.currentHint', { current: quotaUser.apiQuotaPerHour ?? $t('userMgmt.quota.roleDefault') }) }}
                            </p>
                        </div>
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('userMgmt.quota.justificationLabel') }}</label>
                            <textarea
                                v-model="quotaJustification" rows="3" maxlength="1000" required
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            ></textarea>
                        </div>
                        <div class="flex justify-end gap-2 pt-1">
                            <button type="button" class="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted" @click="closeQuota()">
                                {{ $t('userMgmt.quota.cancel') }}
                            </button>
                            <button
                                type="submit" :disabled="quotaSaving"
                                class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                            >
                                <Loader2 v-if="quotaSaving" class="h-4 w-4 animate-spin" />
                                {{ $t('userMgmt.quota.save') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>
    </div>
</template>
