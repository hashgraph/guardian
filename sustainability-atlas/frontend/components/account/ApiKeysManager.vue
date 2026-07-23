<script setup lang="ts">
import { KeyRound, Plus, Copy, Check, Trash2, Loader2, X, ShieldAlert } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import type { ApiKey, CreatedApiKey } from '~/composables/useApiKeys';

const MAX_ACTIVE = 3;

const apiKeys = useApiKeys();
const { t } = useI18n();

const { data, pending, refresh } = await useAsyncData('my-api-keys', () => apiKeys.list());
const keys = computed<ApiKey[]>(() => data.value ?? []);
const activeCount = computed(() => keys.value.filter((k) => k.status === 'active').length);
const atLimit = computed(() => activeCount.value >= MAX_ACTIVE);

// When data access isn't enforced, the API is publicly readable, so keys aren't
// required — disable the key controls (existing keys stay visible). Shares the
// RateLimitCard's getMine fetch via the same useAsyncData key.
const rl = useRateLimit();
const { data: rlSummary } = await useAsyncData('my-rate-limit', () => rl.getMine());
const publicAccess = computed(() => (rlSummary.value ? !rlSummary.value.dataAccessEnforced : false));

const showGenerate = ref(false);
const newName = ref('');
const creating = ref(false);
const error = ref('');

const created = ref<CreatedApiKey | null>(null);
const copied = ref(false);
const revokingId = ref<string | null>(null);

function openGenerate() {
    newName.value = '';
    error.value = '';
    showGenerate.value = true;
}

async function onGenerate() {
    error.value = '';
    if (!newName.value.trim()) {
        error.value = t('apiKeys.nameRequired');
        return;
    }
    creating.value = true;
    try {
        created.value = await apiKeys.create(newName.value.trim());
        showGenerate.value = false;
        await refresh();
    } catch (err) {
        const e = err as { data?: { message?: string | string[] } };
        const m = e?.data?.message;
        error.value = (Array.isArray(m) ? m[0] : m) || t('auth.errorGeneric');
    } finally {
        creating.value = false;
    }
}

async function copyKey() {
    if (!created.value) return;
    try {
        await navigator.clipboard.writeText(created.value.key);
        copied.value = true;
        setTimeout(() => (copied.value = false), 2000);
    } catch {
        toast.error(t('apiKeys.copyFailed'));
    }
}

function dismissCreated() {
    created.value = null;
    copied.value = false;
}

async function onRevoke(k: ApiKey) {
    revokingId.value = k.id;
    try {
        await apiKeys.revoke(k.id);
        toast.success(t('apiKeys.revokedToast'));
        await refresh();
    } catch (err) {
        const e = err as { data?: { message?: string } };
        toast.error(e?.data?.message || t('auth.errorGeneric'));
    } finally {
        revokingId.value = null;
    }
}

function fmtDate(d: string | null) {
    return d ? new Date(d).toLocaleDateString() : '—';
}
</script>

<template>
    <section
        id="api-keys"
        class="rounded-lg border bg-card p-6 transition-opacity"
        :class="{ 'cursor-not-allowed opacity-60': publicAccess }"
        :title="publicAccess ? $t('apiKeys.disabledTooltip') : undefined"
    >
        <div class="mb-1 flex items-center gap-2">
            <KeyRound class="h-5 w-5 text-primary" />
            <h2 class="text-base font-medium text-foreground">{{ $t('account.apiKeys') }}</h2>
            <span class="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ activeCount }}/{{ MAX_ACTIVE }} {{ $t('apiKeys.active') }}
            </span>
            <span
                v-if="publicAccess"
                class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                :title="$t('apiKeys.disabledTooltip')"
            >
                {{ $t('apiKeys.disabledBadge') }}
            </span>
            <button
                :disabled="atLimit || publicAccess"
                class="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                @click="openGenerate()"
            >
                <Plus class="h-3.5 w-3.5" /> {{ $t('apiKeys.generate') }}
            </button>
        </div>
        <p class="mb-4 text-sm text-muted-foreground">{{ $t('apiKeys.intro') }}</p>

        <p v-if="atLimit" class="mb-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <ShieldAlert class="h-4 w-4 shrink-0" /> {{ $t('apiKeys.limitReached') }}
        </p>

        <!-- One-time reveal of a newly created key -->
        <div v-if="created" class="mb-4 rounded-md border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            <p class="text-sm font-medium text-green-800 dark:text-green-300">{{ $t('apiKeys.createdTitle') }}</p>
            <p class="mt-0.5 text-xs text-green-700 dark:text-green-400">{{ $t('apiKeys.createdOnce') }}</p>
            <div class="mt-3 flex items-center gap-2">
                <code class="flex-1 overflow-x-auto rounded bg-background px-3 py-2 font-mono text-xs">{{ created.key }}</code>
                <button class="inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-medium hover:bg-muted" @click="copyKey()">
                    <component :is="copied ? Check : Copy" class="h-3.5 w-3.5" />
                    {{ copied ? $t('apiKeys.copied') : $t('apiKeys.copy') }}
                </button>
            </div>
            <button class="mt-3 text-xs font-medium text-green-800 underline dark:text-green-300" @click="dismissCreated()">
                {{ $t('apiKeys.savedDone') }}
            </button>
        </div>

        <!-- Generate panel -->
        <div v-if="showGenerate" class="mb-4 rounded-md border p-4">
            <div class="mb-2 flex items-center justify-between">
                <label class="text-xs font-medium text-foreground">{{ $t('apiKeys.keyName') }}</label>
                <button class="text-muted-foreground hover:text-foreground" @click="showGenerate = false"><X class="h-4 w-4" /></button>
            </div>
            <div v-if="error" class="mb-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{{ error }}</div>
            <div class="flex items-center gap-2">
                <input
                    v-model="newName" type="text" :placeholder="$t('apiKeys.namePlaceholder')" maxlength="120"
                    class="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    @keyup.enter="onGenerate()"
                />
                <button :disabled="creating" class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60" @click="onGenerate()">
                    <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
                    {{ $t('apiKeys.generate') }}
                </button>
            </div>
        </div>

        <!-- Key list -->
        <div v-if="pending" class="py-6 text-center text-muted-foreground"><Loader2 class="mx-auto h-5 w-5 animate-spin" /></div>
        <p v-else-if="keys.length === 0" class="py-6 text-center text-sm text-muted-foreground">{{ $t('apiKeys.empty') }}</p>
        <table v-else class="w-full text-sm">
            <thead class="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                    <th class="py-2 pr-4 font-medium">{{ $t('apiKeys.colName') }}</th>
                    <th class="py-2 pr-4 font-medium">{{ $t('apiKeys.colCreated') }}</th>
                    <th class="py-2 pr-4 font-medium">{{ $t('apiKeys.colLastUsed') }}</th>
                    <th class="py-2 pr-4 font-medium">{{ $t('apiKeys.colStatus') }}</th>
                    <th class="py-2 text-right font-medium">{{ $t('apiKeys.colAction') }}</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                <tr v-for="k in keys" :key="k.id">
                    <td class="py-3 pr-4">
                        <span class="font-medium text-foreground">{{ k.name }}</span>
                        <span class="ml-2 font-mono text-xs text-muted-foreground">se_{{ k.prefix }}…</span>
                    </td>
                    <td class="py-3 pr-4 text-muted-foreground">{{ fmtDate(k.createdAt) }}</td>
                    <td class="py-3 pr-4 text-muted-foreground">{{ fmtDate(k.lastUsedAt) }}</td>
                    <td class="py-3 pr-4">
                        <span class="inline-flex items-center gap-1.5 text-xs">
                            <span class="h-1.5 w-1.5 rounded-full" :class="k.status === 'active' ? 'bg-green-500' : 'bg-gray-400'" />
                            {{ k.status === 'active' ? $t('apiKeys.active') : $t('apiKeys.revoked') }}
                        </span>
                    </td>
                    <td class="py-3 text-right">
                        <button
                            v-if="k.status === 'active'"
                            :disabled="revokingId === k.id || publicAccess"
                            class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-950/30"
                            @click="onRevoke(k)"
                        >
                            <Trash2 class="h-3.5 w-3.5" /> {{ $t('apiKeys.revoke') }}
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </section>
</template>
