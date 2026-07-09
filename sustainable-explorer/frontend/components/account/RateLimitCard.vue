<script setup lang="ts">
import { Gauge, Loader2, X, Clock } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const rl = useRateLimit();
const { t } = useI18n();
// Admins already hold the admin quota and are the approvers — they don't request.
const { isAdmin } = useAuth();

const { data, pending, refresh } = await useAsyncData('my-rate-limit', () => rl.getMine());
const summary = computed(() => data.value);

const showForm = ref(false);
const requested = ref<number | null>(null);
const justification = ref('');
const submitting = ref(false);
const error = ref('');

// Inline history shows a short preview; the rest opens in a popup.
const HISTORY_PREVIEW = 4;
const showHistory = ref(false);
const previewHistory = computed(() => summary.value?.data.slice(0, HISTORY_PREVIEW) ?? []);

function openForm() {
    requested.value = summary.value ? summary.value.currentQuota * 2 : null;
    justification.value = '';
    error.value = '';
    showForm.value = true;
}

const statusClass: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    adjusted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    declined: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

async function onSubmit() {
    error.value = '';
    if (!requested.value || requested.value < 1) {
        error.value = t('rateLimit.invalidQuota');
        return;
    }
    if (summary.value && requested.value > summary.value.maxQuota) {
        error.value = t('rateLimit.exceedsMax', { max: summary.value.maxQuota });
        return;
    }
    if (justification.value.trim().length < 10) {
        error.value = t('rateLimit.justificationShort');
        return;
    }
    submitting.value = true;
    try {
        await rl.submit(requested.value, justification.value.trim());
        showForm.value = false;
        toast.success(t('rateLimit.submittedToast'));
        await refresh();
    } catch (err) {
        const e = err as { data?: { message?: string | string[] } };
        const m = e?.data?.message;
        error.value = (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
    } finally {
        submitting.value = false;
    }
}

function fmtDate(d: string | null) {
    return d ? new Date(d).toLocaleDateString() : '—';
}
</script>

<template>
    <section
        class="flex h-full flex-col rounded-lg border bg-card p-6 transition-opacity"
        :class="{ 'cursor-not-allowed opacity-60': summary && !summary.rateLimitEnforced }"
        :title="summary && !summary.rateLimitEnforced ? $t('rateLimit.disabledTooltip') : undefined"
    >
        <div class="mb-1 flex items-center gap-2">
            <Gauge class="h-5 w-5 text-primary" />
            <h2 class="text-base font-medium text-foreground">{{ $t('rateLimit.title') }}</h2>
            <span
                v-if="summary && !summary.rateLimitEnforced"
                class="ml-auto inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                :title="$t('rateLimit.disabledTooltip')"
            >
                {{ $t('rateLimit.disabledBadge') }}
            </span>
        </div>

        <div v-if="pending" class="py-4 text-center text-muted-foreground"><Loader2 class="mx-auto h-5 w-5 animate-spin" /></div>

        <div v-else-if="summary" class="flex flex-1 flex-col">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p class="text-2xl font-semibold text-foreground">{{ summary.currentQuota.toLocaleString() }} <span class="text-sm font-normal text-muted-foreground">{{ $t('rateLimit.perHour') }}</span></p>
                    <p class="text-xs text-muted-foreground">{{ $t('rateLimit.roleDefault', { n: summary.roleDefault.toLocaleString() }) }}</p>
                </div>
                <span v-if="summary.hasPending" class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Clock class="h-3.5 w-3.5" /> {{ $t('rateLimit.pending') }}
                </span>
                <button
                    v-else-if="!isAdmin"
                    :disabled="!summary.rateLimitEnforced"
                    class="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    @click="openForm()"
                >
                    {{ $t('rateLimit.requestIncrease') }}
                </button>
                <span v-else class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    {{ $t('rateLimit.adminQuota') }}
                </span>
            </div>

            <!-- Request form -->
            <div v-if="showForm" class="mt-4 rounded-md border p-4">
                <div class="mb-2 flex items-center justify-between">
                    <h3 class="text-sm font-medium text-foreground">{{ $t('rateLimit.requestIncrease') }}</h3>
                    <button class="text-muted-foreground hover:text-foreground" @click="showForm = false"><X class="h-4 w-4" /></button>
                </div>
                <div v-if="error" class="mb-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{{ error }}</div>
                <div class="space-y-3">
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('rateLimit.requestedQuota') }}</label>
                        <input v-model.number="requested" type="number" min="1" :max="summary.maxQuota"
                            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        <p class="mt-1 text-xs text-muted-foreground">{{ $t('rateLimit.maxNote', { max: summary.maxQuota.toLocaleString() }) }}</p>
                    </div>
                    <div>
                        <label class="mb-1 block text-xs font-medium text-foreground">{{ $t('rateLimit.justification') }}</label>
                        <textarea v-model="justification" rows="3" maxlength="2000" :placeholder="$t('rateLimit.justificationPlaceholder')"
                            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
                    </div>
                    <button :disabled="submitting" class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60" @click="onSubmit()">
                        <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                        {{ $t('rateLimit.submit') }}
                    </button>
                </div>
            </div>

            <!-- Admins don't request increases — show an approver-oriented panel instead. -->
            <div v-if="isAdmin" class="mt-4 flex flex-1 flex-col items-center justify-center gap-3 border-t pt-5 text-center">
                <p class="max-w-xs text-sm text-muted-foreground">{{ $t('rateLimit.adminNote') }}</p>
                <AppLink
                    v-if="summary.rateLimitEnforced"
                    to="/admin/users"
                    class="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                    {{ $t('rateLimit.reviewRequests') }}
                </AppLink>
                <span
                    v-else
                    class="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium opacity-50"
                    :title="$t('rateLimit.disabledTooltip')"
                >
                    {{ $t('rateLimit.reviewRequests') }}
                </span>
            </div>

            <!-- History (flex-1 so the card fills the available height) -->
            <div v-else class="mt-4 flex flex-1 flex-col border-t pt-3">
                <div class="mb-2 flex items-center justify-between">
                    <h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ $t('rateLimit.history') }}</h3>
                    <button
                        v-if="summary.data.length > HISTORY_PREVIEW"
                        class="text-xs font-medium text-primary hover:underline"
                        @click="showHistory = true"
                    >
                        {{ $t('rateLimit.viewAll', { n: summary.data.length }) }}
                    </button>
                </div>
                <ul v-if="previewHistory.length" class="space-y-2">
                    <li v-for="r in previewHistory" :key="r.id" class="flex items-center justify-between gap-2 text-sm">
                        <span class="text-muted-foreground">{{ fmtDate(r.createdAt) }} · {{ r.requestedQuota.toLocaleString() }} {{ $t('rateLimit.perHour') }}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusClass[r.status]">
                            {{ $t('rateLimit.status.' + r.status) }}<template v-if="r.approvedQuota"> · {{ r.approvedQuota.toLocaleString() }}</template>
                        </span>
                    </li>
                </ul>
                <p v-else class="text-sm text-muted-foreground">{{ $t('rateLimit.noHistory') }}</p>
            </div>
        </div>

        <!-- Full history popup -->
        <Teleport to="body">
            <div
                v-if="showHistory"
                class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
                @click.self="showHistory = false"
            >
                <div class="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg border bg-background shadow-xl">
                    <div class="flex items-center justify-between border-b px-5 py-3">
                        <h3 class="text-base font-semibold text-foreground">{{ $t('rateLimit.history') }}</h3>
                        <button class="text-muted-foreground hover:text-foreground" @click="showHistory = false"><X class="h-4 w-4" /></button>
                    </div>
                    <ul class="divide-y overflow-y-auto px-5 py-2">
                        <li v-for="r in summary?.data ?? []" :key="r.id" class="flex items-center justify-between gap-2 py-2.5 text-sm">
                            <span class="text-muted-foreground">{{ fmtDate(r.createdAt) }} · {{ r.requestedQuota.toLocaleString() }} {{ $t('rateLimit.perHour') }}</span>
                            <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusClass[r.status]">
                                {{ $t('rateLimit.status.' + r.status) }}<template v-if="r.approvedQuota"> · {{ r.approvedQuota.toLocaleString() }}</template>
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </Teleport>
    </section>
</template>
