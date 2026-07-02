<script setup lang="ts">
import { LogOut, Pencil, KeyRound, Loader2, Building2, Briefcase, MapPin, CalendarDays, Activity, ChevronLeft, ChevronRight, X } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { MyActivityResult } from '~/composables/useAuth';

definePageMeta({ middleware: 'auth' });

const { user, isAdmin, updateProfile, fetchActivity, fetchMe, changePassword, logout } = useAuth();
const { t } = useI18n();
const router = useRouter();

const fullName = computed(() => {
    const u = user.value;
    if (!u) return '';
    return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || '—';
});

const initials = computed(() => {
    const u = user.value;
    if (!u) return '';
    const f = u.firstName?.trim();
    const l = u.lastName?.trim();
    if (f || l) return `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase();
    return u.email.slice(0, 2).toUpperCase();
});

function apiError(err: unknown): string {
    const e = err as { data?: { message?: string | string[] } };
    const m = e?.data?.message;
    return (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
}

// ── Profile edit ─────────────────────────────────────────────────────────────
const editing = ref(false);
const savingProfile = ref(false);
const form = reactive({ firstName: '', lastName: '', organisation: '', jobTitle: '', country: '' });

function startEdit() {
    const u = user.value;
    form.firstName = u?.firstName ?? '';
    form.lastName = u?.lastName ?? '';
    form.organisation = u?.organisation ?? '';
    form.jobTitle = u?.jobTitle ?? '';
    form.country = u?.country ?? '';
    editing.value = true;
}

async function saveProfile() {
    savingProfile.value = true;
    try {
        // Send trimmed strings; an empty string clears the field (the API maps "" → null).
        await updateProfile({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            organisation: form.organisation.trim(),
            jobTitle: form.jobTitle.trim(),
            country: form.country.trim(),
        });
        toast.success(t('account.savedToast'));
        editing.value = false;
    } catch (err) {
        toast.error(apiError(err));
    } finally {
        savingProfile.value = false;
    }
}

// ── Change password (modal) ───────────────────────────────────────────────────
const showPwModal = ref(false);
const pw = reactive({ current: '', next: '', confirm: '' });
const savingPw = ref(false);
const pwError = ref('');

function openPwModal() {
    pw.current = '';
    pw.next = '';
    pw.confirm = '';
    pwError.value = '';
    showPwModal.value = true;
}

async function submitPassword() {
    pwError.value = '';
    if (pw.next !== pw.confirm) {
        pwError.value = t('auth.errorPasswordMismatch');
        return;
    }
    savingPw.value = true;
    try {
        await changePassword(pw.current, pw.next);
        toast.success(t('account.passwordChangedToast'));
        showPwModal.value = false;
    } catch (err) {
        pwError.value = apiError(err);
    } finally {
        savingPw.value = false;
    }
}

async function onLogout() {
    await logout();
    router.push('/');
}

// ── Activity log ─────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
    'auth.login': 'Signed in',
    'auth.logout': 'Signed out',
    'auth.signup': 'Account created',
    'auth.email_verify': 'Email verified',
    'auth.forgot_password': 'Password reset requested',
    'auth.password_reset': 'Password reset',
    'auth.change_password': 'Password changed',
    'auth.resend_verification': 'Verification email resent',
    'auth.update_profile': 'Profile updated',
    'auth.refresh_reuse': 'Session reuse detected',
    'admin.user_create': 'Created a user',
    'admin.user_activate': 'Activated a user',
    'admin.user_deactivate': 'Deactivated a user',
    'admin.user_role_change': 'Changed a user role',
    'admin.rate_limit_resolve': 'Resolved a rate-limit request',
    'admin.rate_limit_set': 'Adjusted a user rate limit',
};
function actionLabel(a: string): string {
    return ACTION_LABELS[a]
        ?? (a.split('.').pop() ?? a).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const ACTIVITY_PAGE_SIZE = 8;
const activity = ref<MyActivityResult | null>(null);
const actPage = ref(1);
const actFilter = ref('');
const actLoading = ref(false);

const actTotalPages = computed(() =>
    Math.max(1, Math.ceil((activity.value?.total ?? 0) / ACTIVITY_PAGE_SIZE)),
);

async function loadActivity() {
    actLoading.value = true;
    try {
        activity.value = await fetchActivity({
            page: actPage.value,
            pageSize: ACTIVITY_PAGE_SIZE,
            action: actFilter.value || undefined,
        });
    } catch {
        /* read-only widget — leave previous data on transient error */
    } finally {
        actLoading.value = false;
    }
}

function goActPage(p: number) {
    if (p < 1 || p > actTotalPages.value) return;
    actPage.value = p;
    loadActivity();
}

function onActFilter() {
    actPage.value = 1;
    loadActivity();
}

onMounted(() => {
    // Refresh the profile from the server so the page always reflects the latest
    // saved data (not a stale login-time snapshot).
    void fetchMe();
    void loadActivity();
});

const memberSince = computed(() =>
    user.value ? new Date(user.value.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—',
);
</script>

<template>
    <div class="mx-auto max-w-full px-6 py-8">
        <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold text-foreground">{{ $t('account.title') }}</h1>
                <p class="mt-1 text-sm text-muted-foreground">{{ $t('account.subtitle') }}</p>
            </div>
            <button
                class="inline-flex shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                @click="onLogout()"
            >
                <LogOut class="h-4 w-4" />
                {{ $t('auth.signOut') }}
            </button>
        </header>

        <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            <section class="rounded-lg border bg-card lg:col-span-2">
                <div class="h-20 rounded-t-lg bg-gradient-to-r from-primary/20 via-primary/5 to-transparent"></div>
                <div class="px-6 pb-6">
                    <div class="-mt-10 flex flex-wrap items-end justify-between gap-4">
                        <div class="flex items-end gap-4">
                            <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-sm ring-4 ring-card">
                                {{ initials }}
                            </div>
                            <div class="pb-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <h2 class="text-xl font-semibold text-foreground">{{ fullName }}</h2>
                                    <span class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                        {{ isAdmin ? $t('auth.roleAdmin') : $t('auth.roleUser') }}
                                    </span>
                                </div>
                                <p class="text-sm text-muted-foreground">{{ user?.email }}</p>
                            </div>
                        </div>
                        <div v-if="!editing" class="flex items-center gap-2">
                            <button
                                class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                                @click="startEdit()"
                            >
                                <Pencil class="h-3.5 w-3.5" />
                                {{ $t('account.edit') }}
                            </button>
                            <button
                                class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                                @click="openPwModal()"
                            >
                                <KeyRound class="h-3.5 w-3.5" />
                                {{ $t('account.changePassword') }}
                            </button>
                        </div>
                    </div>

                    <!-- View mode: detail tiles -->
                    <dl v-if="!editing" class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex items-start gap-3 rounded-lg border bg-background/40 p-3">
                            <Building2 class="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <dt class="text-xs text-muted-foreground">{{ $t('account.fields.organisation') }}</dt>
                                <dd class="text-sm font-medium text-foreground">{{ user?.organisation || '—' }}</dd>
                            </div>
                        </div>
                        <div class="flex items-start gap-3 rounded-lg border bg-background/40 p-3">
                            <Briefcase class="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <dt class="text-xs text-muted-foreground">{{ $t('account.fields.jobTitle') }}</dt>
                                <dd class="text-sm font-medium text-foreground">{{ user?.jobTitle || '—' }}</dd>
                            </div>
                        </div>
                        <div class="flex items-start gap-3 rounded-lg border bg-background/40 p-3">
                            <MapPin class="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <dt class="text-xs text-muted-foreground">{{ $t('account.fields.country') }}</dt>
                                <dd class="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <CountryFlag v-if="user?.country && isCountryCode(user.country)" :code="user.country" size="sm" />
                                    {{ user?.country ? countryName(user.country) : '—' }}
                                </dd>
                            </div>
                        </div>
                        <div class="flex items-start gap-3 rounded-lg border bg-background/40 p-3">
                            <CalendarDays class="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                                <dt class="text-xs text-muted-foreground">{{ $t('account.fields.memberSince') }}</dt>
                                <dd class="text-sm font-medium text-foreground">{{ memberSince }}</dd>
                            </div>
                        </div>
                    </dl>

                    <!-- Edit mode -->
                    <form v-else class="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2" @submit.prevent="saveProfile()">
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('account.fields.firstName') }}</label>
                            <input v-model="form.firstName" type="text" maxlength="120"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('account.fields.lastName') }}</label>
                            <input v-model="form.lastName" type="text" maxlength="120"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div class="sm:col-span-2">
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('account.fields.email') }}</label>
                            <input :value="user?.email" type="email" disabled
                                class="w-full cursor-not-allowed rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground" />
                            <p class="mt-1 text-xs text-muted-foreground">{{ $t('account.emailImmutable') }}</p>
                        </div>
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('account.fields.organisation') }}</label>
                            <input v-model="form.organisation" type="text" maxlength="200"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('account.fields.jobTitle') }}</label>
                            <input v-model="form.jobTitle" type="text" maxlength="120"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div class="relative">
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('account.fields.country') }}</label>
                            <CountrySelect v-model="form.country" :placeholder="$t('country.placeholder')" />
                        </div>
                        <div class="flex items-center gap-2 sm:col-span-2">
                            <button type="submit" :disabled="savingProfile"
                                class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                                <Loader2 v-if="savingProfile" class="h-4 w-4 animate-spin" />
                                {{ $t('account.save') }}
                            </button>
                            <button type="button" :disabled="savingProfile"
                                class="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                                @click="editing = false">
                                {{ $t('account.cancel') }}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <!-- ── Rate limit (1/3 right rail; stretches to fill row height) ──── -->
            <div class="lg:col-span-1">
                <RateLimitCard />
            </div>

            <!-- ── API keys (full width; Change Password moved to the hero modal) ─ -->
            <div class="lg:col-span-3">
                <ApiKeysManager />
            </div>

            <!-- ── Activity log (full width) ──────────────────────────────────── -->
            <section class="rounded-lg border bg-card p-6 lg:col-span-3">
                <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                        <Activity class="h-5 w-5 text-primary" />
                        <h2 class="text-base font-medium text-foreground">{{ $t('account.activity.title') }}</h2>
                    </div>
                    <select
                        v-model="actFilter"
                        class="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        @change="onActFilter()"
                    >
                        <option value="">{{ $t('account.activity.allTypes') }}</option>
                        <option v-for="a in activity?.actions ?? []" :key="a" :value="a">{{ actionLabel(a) }}</option>
                    </select>
                </div>

                <div class="overflow-x-auto rounded-lg border">
                    <table class="w-full text-sm">
                        <slot />
                        <thead class="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th class="px-4 py-3 font-medium">{{ $t('account.activity.colActivity') }}</th>
                                <th class="px-4 py-3 font-medium">{{ $t('account.activity.colStatus') }}</th>
                                <th class="px-4 py-3 font-medium">{{ $t('account.activity.colIp') }}</th>
                                <th class="px-4 py-3 text-right font-medium">{{ $t('account.activity.colWhen') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-if="actLoading && !activity">
                                <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">
                                    <Loader2 class="mx-auto h-5 w-5 animate-spin" />
                                </td>
                            </tr>
                            <tr v-else-if="(activity?.items.length ?? 0) === 0">
                                <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">{{ $t('account.activity.empty') }}</td>
                            </tr>
                            <tr v-for="ev in activity?.items ?? []" :key="ev.id" class="hover:bg-muted/30">
                                <td class="px-4 py-3 font-medium text-foreground">{{ actionLabel(ev.action) }}</td>
                                <td class="px-4 py-3">
                                    <span
                                        class="inline-flex items-center gap-1.5 text-xs"
                                        :class="ev.outcome === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                                    >
                                        <span class="h-1.5 w-1.5 rounded-full" :class="ev.outcome === 'success' ? 'bg-green-500' : 'bg-red-500'" />
                                        {{ ev.outcome }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-muted-foreground">{{ ev.ip || '—' }}</td>
                                <td class="px-4 py-3 text-right text-xs text-muted-foreground" :title="new Date(ev.createdAt).toLocaleString()">
                                    {{ timeAgo(ev.createdAt) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="(activity?.total ?? 0) > ACTIVITY_PAGE_SIZE" class="mt-4 flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">{{ $t('account.activity.page', { page: actPage, pages: actTotalPages }) }}</span>
                    <div class="flex items-center gap-2">
                        <button
                            class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                            :disabled="actPage <= 1 || actLoading"
                            @click="goActPage(actPage - 1)"
                        >
                            <ChevronLeft class="h-3.5 w-3.5" /> {{ $t('account.activity.prev') }}
                        </button>
                        <button
                            class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                            :disabled="actPage >= actTotalPages || actLoading"
                            @click="goActPage(actPage + 1)"
                        >
                            {{ $t('account.activity.next') }} <ChevronRight class="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </section>
        </div>

        <!-- Change-password modal (triggered from the hero) -->
        <Teleport to="body">
            <div
                v-if="showPwModal"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
            >
                <div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
                    <div class="mb-4 flex items-start justify-between">
                        <div class="mb-1 flex items-center gap-2">
                            <KeyRound class="h-5 w-5 text-primary" />
                            <h2 class="text-lg font-semibold text-foreground">{{ $t('account.changePassword') }}</h2>
                        </div>
                        <button class="rounded-md p-1 text-muted-foreground hover:bg-muted" @click="showPwModal = false">
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <p class="mb-4 text-sm text-muted-foreground">{{ $t('account.securityHint') }}</p>

                    <div v-if="pwError" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                        {{ pwError }}
                    </div>

                    <form class="space-y-3" @submit.prevent="submitPassword()">
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('forcePassword.current') }}</label>
                            <input v-model="pw.current" type="password" required autocomplete="current-password"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('forcePassword.new') }}</label>
                            <input v-model="pw.next" type="password" required minlength="12" autocomplete="new-password"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('auth.confirmPassword') }}</label>
                            <input v-model="pw.confirm" type="password" required minlength="12" autocomplete="new-password"
                                class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <p class="text-xs text-muted-foreground">{{ $t('auth.passwordHint') }}</p>
                        <div class="flex justify-end gap-2 pt-1">
                            <button type="button" class="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted" @click="showPwModal = false">
                                {{ $t('account.cancel') }}
                            </button>
                            <button type="submit" :disabled="savingPw"
                                class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                                <Loader2 v-if="savingPw" class="h-4 w-4 animate-spin" />
                                {{ $t('account.changePassword') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Teleport>
    </div>
</template>
