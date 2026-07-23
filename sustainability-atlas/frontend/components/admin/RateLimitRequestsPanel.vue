<script setup lang="ts">
import { Loader2, Check, SlidersHorizontal, Ban, X } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { AdminRateLimitRequest } from '~/composables/useRateLimit';

const emit = defineEmits<{ (e: 'pendingCount', n: number): void }>();

const rl = useRateLimit();
const { t } = useI18n();

const { data, pending, refresh } = await useAsyncData('admin-rate-limits', () => rl.adminList());
const rows = computed<AdminRateLimitRequest[]>(() => data.value ?? []);

watchEffect(() => {
    emit('pendingCount', rows.value.filter((r) => r.status === 'pending').length);
});

const busyId = ref<string | null>(null);
const adjustingId = ref<string | null>(null);
const adjustValue = ref<number | null>(null);
const adjustNote = ref('');

const statusClass: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    adjusted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    declined: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

function name(r: AdminRateLimitRequest) {
    return [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email;
}

function openAdjust(r: AdminRateLimitRequest) {
    adjustingId.value = r.id;
    adjustValue.value = r.requestedQuota;
    adjustNote.value = '';
}

async function resolve(r: AdminRateLimitRequest, decision: 'approved' | 'adjusted' | 'declined') {
    busyId.value = r.id;
    try {
        const body =
            decision === 'adjusted'
                ? { decision, approvedQuota: adjustValue.value ?? undefined, note: adjustNote.value.trim() || undefined }
                : { decision };
        await rl.adminResolve(r.id, body);
        toast.success(t('rateLimit.resolvedToast'));
        adjustingId.value = null;
        await refresh();
    } catch (err) {
        const e = err as { data?: { message?: string | string[] } };
        const m = e?.data?.message;
        toast.error((Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric'));
    } finally {
        busyId.value = null;
    }
}

function fmtDate(d: string | null) {
    return d ? new Date(d).toLocaleDateString() : '—';
}
</script>

<template>
    <div>
        <div v-if="pending" class="py-8 text-center text-muted-foreground"><Loader2 class="mx-auto h-5 w-5 animate-spin" /></div>
        <p v-else-if="rows.length === 0" class="py-8 text-center text-sm text-muted-foreground">{{ $t('rateLimit.noRequests') }}</p>

        <ul v-else class="space-y-3">
            <li v-for="r in rows" :key="r.id" class="rounded-lg border p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-medium text-foreground">{{ name(r) }} <span class="text-xs font-normal text-muted-foreground">· {{ r.email }}</span></p>
                        <p class="mt-1 text-sm text-muted-foreground">
                            {{ $t('rateLimit.current') }}: <b class="text-foreground">{{ (r.currentQuota ?? '—').toLocaleString?.() ?? r.currentQuota ?? '—' }}</b>
                            → {{ $t('rateLimit.requested') }}: <b class="text-foreground">{{ r.requestedQuota.toLocaleString() }}</b> {{ $t('rateLimit.perHour') }}
                        </p>
                        <p class="mt-1 text-sm text-foreground"><span class="text-muted-foreground">{{ $t('rateLimit.justification') }}:</span> {{ r.justification }}</p>
                        <p class="mt-1 text-xs text-muted-foreground">{{ $t('rateLimit.submitted') }} {{ fmtDate(r.createdAt) }}</p>
                    </div>
                    <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass[r.status]">
                        {{ $t('rateLimit.status.' + r.status) }}
                    </span>
                </div>

                <!-- Resolved note -->
                <p v-if="r.status !== 'pending' && r.resolvedNote" class="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {{ r.resolvedNote }}
                </p>

                <!-- Pending actions -->
                <template v-if="r.status === 'pending'">
                    <div v-if="adjustingId === r.id" class="mt-3 rounded-md border p-3">
                        <div class="mb-2 flex items-center justify-between">
                            <label class="text-xs font-medium text-foreground">{{ $t('rateLimit.approvedQuota') }}</label>
                            <button class="text-muted-foreground hover:text-foreground" @click="adjustingId = null"><X class="h-4 w-4" /></button>
                        </div>
                        <input v-model.number="adjustValue" type="number" min="1"
                            class="mb-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        <input v-model="adjustNote" type="text" maxlength="1000" :placeholder="$t('rateLimit.notePlaceholder')"
                            class="mb-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        <p class="mb-2 text-xs text-muted-foreground">{{ $t('rateLimit.adjustHint') }}</p>
                        <button :disabled="busyId === r.id" class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60" @click="resolve(r, 'adjusted')">
                            {{ $t('rateLimit.applyAdjustment') }}
                        </button>
                    </div>
                    <div v-else class="mt-3 flex flex-wrap items-center gap-2">
                        <button :disabled="busyId === r.id" class="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50" @click="resolve(r, 'approved')">
                            <Check class="h-3.5 w-3.5" /> {{ $t('rateLimit.approve') }}
                        </button>
                        <button :disabled="busyId === r.id" class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50" @click="openAdjust(r)">
                            <SlidersHorizontal class="h-3.5 w-3.5" /> {{ $t('rateLimit.adjust') }}
                        </button>
                        <button :disabled="busyId === r.id" class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30" @click="resolve(r, 'declined')">
                            <Ban class="h-3.5 w-3.5" /> {{ $t('rateLimit.decline') }}
                        </button>
                    </div>
                </template>
            </li>
        </ul>
    </div>
</template>
