<script setup lang="ts">
import { ExternalLink, Loader2, Search } from 'lucide-vue-next';
import type { TabItem } from '~/components/ui/Tabs.vue';
import { isValidHederaId, isValidHederaTxId, HEDERA_TX_ID_RE } from '~/lib/hedera-id';
import { mirrorNodeBaseUrl, toMirrorTransactionId } from '~/lib/mirror-node';
import { formatDate } from '~/lib/format';

type EntityType = 'topic' | 'token' | 'contract' | 'account' | 'transaction';
interface SummaryRow { label: string; value: string }

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { network } = useNetwork();

const entityType = ref<EntityType>('topic');
const id = ref('');
const pending = ref(false);
const error = ref('');
const summary = ref<SummaryRow[] | null>(null);

watch(() => props.open, (isOpen) => {
    if (isOpen) {
        entityType.value = 'topic';
        id.value = '';
        pending.value = false;
        error.value = '';
        summary.value = null;
    }
});

// A new tab means a different ID format — the old value (and any warning or
// summary it produced) no longer applies, so start that tab's field fresh.
watch(entityType, () => { id.value = ''; summary.value = null; error.value = ''; });

// A hand-edited id invalidates any summary already on screen.
watch(id, () => { summary.value = null; error.value = ''; });

const tabs = computed<TabItem[]>(() => [
    { value: 'topic', label: t('hashscanVerify.tabs.topic') },
    { value: 'token', label: t('hashscanVerify.tabs.token') },
    { value: 'contract', label: t('hashscanVerify.tabs.contract') },
    { value: 'account', label: t('hashscanVerify.tabs.account') },
    { value: 'transaction', label: t('hashscanVerify.tabs.transaction') },
]);

const isValid = computed(() =>
    entityType.value === 'transaction' ? isValidHederaTxId(id.value) : isValidHederaId(id.value),
);

const hashscanUrl = computed(() => `https://hashscan.io/${network.value}/${entityType.value}/${id.value.trim()}`);

async function fetchTopicSummary(base: string, cleanId: string): Promise<SummaryRow[]> {
    const data = await $fetch<Record<string, unknown>>(`${base}/api/v1/topics/${encodeURIComponent(cleanId)}`, { timeout: 8000 });
    return [
        { label: t('hashscanVerify.fields.memo'), value: (data.memo as string) || '—' },
        { label: t('hashscanVerify.fields.created'), value: formatDate(data.created_timestamp as string) },
        { label: t('hashscanVerify.fields.adminKey'), value: data.admin_key ? t('common.yes') : t('common.no') },
        { label: t('hashscanVerify.fields.submitKey'), value: data.submit_key ? t('common.yes') : t('common.no') },
        { label: t('hashscanVerify.fields.autoRenewAccount'), value: (data.auto_renew_account as string) || '—' },
    ];
}

async function fetchTokenSummary(base: string, cleanId: string): Promise<SummaryRow[]> {
    const data = await $fetch<Record<string, unknown>>(`${base}/api/v1/tokens/${encodeURIComponent(cleanId)}`, { timeout: 8000 });
    return [
        { label: t('hashscanVerify.fields.name'), value: (data.name as string) || '—' },
        { label: t('hashscanVerify.fields.symbol'), value: (data.symbol as string) || '—' },
        { label: t('hashscanVerify.fields.tokenType'), value: (data.type as string) || '—' },
        { label: t('hashscanVerify.fields.totalSupply'), value: (data.total_supply as string) ?? '—' },
        { label: t('hashscanVerify.fields.decimals'), value: (data.decimals as string) ?? '—' },
        { label: t('hashscanVerify.fields.treasury'), value: (data.treasury_account_id as string) || '—' },
        { label: t('hashscanVerify.fields.created'), value: formatDate(data.created_timestamp as string) },
    ];
}

async function fetchContractSummary(base: string, cleanId: string): Promise<SummaryRow[]> {
    const data = await $fetch<Record<string, unknown>>(`${base}/api/v1/contracts/${encodeURIComponent(cleanId)}`, { timeout: 8000 });
    return [
        { label: t('hashscanVerify.fields.evmAddress'), value: (data.evm_address as string) || '—' },
        { label: t('hashscanVerify.fields.memo'), value: (data.memo as string) || '—' },
        { label: t('hashscanVerify.fields.autoRenewPeriod'), value: data.auto_renew_period != null ? String(data.auto_renew_period) : '—' },
        { label: t('hashscanVerify.fields.created'), value: formatDate(data.created_timestamp as string) },
    ];
}

async function fetchAccountSummary(base: string, cleanId: string): Promise<SummaryRow[]> {
    const data = await $fetch<Record<string, any>>(`${base}/api/v1/accounts/${encodeURIComponent(cleanId)}`, { timeout: 8000 });
    const tinybars = data.balance?.balance;
    const hbar = typeof tinybars === 'number' ? `${(tinybars / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 })} ℏ` : '—';
    return [
        { label: t('hashscanVerify.fields.balance'), value: hbar },
        { label: t('hashscanVerify.fields.keyType'), value: data.key?._type || '—' },
        { label: t('hashscanVerify.fields.evmAddress'), value: data.evm_address || '—' },
        { label: t('hashscanVerify.fields.created'), value: formatDate(data.created_timestamp) },
    ];
}

async function fetchTransactionSummary(base: string, cleanId: string): Promise<SummaryRow[]> {
    // Two accepted forms: a full transaction id (looked up directly by its
    // Mirror Node path form) or a bare consensus timestamp (looked up via the
    // transactions list filtered to that exact timestamp).
    const data = HEDERA_TX_ID_RE.test(cleanId)
        ? await $fetch<{ transactions: Record<string, any>[] }>(
            `${base}/api/v1/transactions/${encodeURIComponent(toMirrorTransactionId(cleanId))}`,
            { timeout: 8000 },
        )
        : await $fetch<{ transactions: Record<string, any>[] }>(
            `${base}/api/v1/transactions`,
            { timeout: 8000, query: { timestamp: cleanId } },
        );
    const tx = data.transactions?.[0];
    if (!tx) throw new Error('not-found');
    const fee = typeof tx.charged_tx_fee === 'number' ? `${(tx.charged_tx_fee / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 })} ℏ` : '—';
    return [
        { label: t('hashscanVerify.fields.txType'), value: tx.name || '—' },
        { label: t('hashscanVerify.fields.result'), value: tx.result || '—' },
        { label: t('hashscanVerify.fields.consensusTimestamp'), value: formatDate(tx.consensus_timestamp) },
        { label: t('hashscanVerify.fields.chargedFee'), value: fee },
    ];
}

async function onLookup() {
    if (!isValid.value || pending.value) return;
    pending.value = true;
    error.value = '';
    summary.value = null;
    const base = mirrorNodeBaseUrl(network.value);
    const cleanId = id.value.trim();
    try {
        switch (entityType.value) {
            case 'topic': summary.value = await fetchTopicSummary(base, cleanId); break;
            case 'token': summary.value = await fetchTokenSummary(base, cleanId); break;
            case 'contract': summary.value = await fetchContractSummary(base, cleanId); break;
            case 'account': summary.value = await fetchAccountSummary(base, cleanId); break;
            case 'transaction': summary.value = await fetchTransactionSummary(base, cleanId); break;
        }
    } catch (err: unknown) {
        const status = (err as { response?: { status?: number }; statusCode?: number })?.response?.status
            ?? (err as { statusCode?: number })?.statusCode;
        error.value = status === 404 || (err as Error)?.message === 'not-found'
            ? t('hashscanVerify.notFoundError')
            : t('hashscanVerify.unreachableError');
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <HelpModalShell
        :open="open"
        :title="$t('hashscanVerify.dialogTitle')"
        :subtitle="$t('hashscanVerify.dialogSubtitle')"
        panel-class="max-w-2xl"
        @close="emit('close')"
    >
        <Tabs v-model="entityType" :tabs="tabs" list-class="flex-wrap h-auto">
            <template #topic>
                <label class="text-xs font-medium text-muted-foreground">{{ $t('hashscanVerify.idLabel') }}</label>
                <input
                    v-model="id"
                    type="text"
                    placeholder="0.0.1234"
                    class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    @keydown.enter="onLookup"
                />
            </template>

            <template #token>
                <label class="text-xs font-medium text-muted-foreground">{{ $t('hashscanVerify.idLabel') }}</label>
                <input
                    v-model="id"
                    type="text"
                    placeholder="0.0.1234"
                    class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    @keydown.enter="onLookup"
                />
            </template>

            <template #contract>
                <label class="text-xs font-medium text-muted-foreground">{{ $t('hashscanVerify.idLabel') }}</label>
                <input
                    v-model="id"
                    type="text"
                    placeholder="0.0.1234"
                    class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    @keydown.enter="onLookup"
                />
            </template>

            <template #account>
                <label class="text-xs font-medium text-muted-foreground">{{ $t('hashscanVerify.idLabel') }}</label>
                <input
                    v-model="id"
                    type="text"
                    placeholder="0.0.1234"
                    class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    @keydown.enter="onLookup"
                />
            </template>

            <template #transaction>
                <label class="text-xs font-medium text-muted-foreground">{{ $t('hashscanVerify.idLabel') }}</label>
                <input
                    v-model="id"
                    type="text"
                    placeholder="0.0.1234@1690000000.000000000"
                    class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    @keydown.enter="onLookup"
                />
            </template>
        </Tabs>

        <p v-if="id && !isValid" class="mt-2 text-xs text-destructive">{{ $t('hashscanVerify.invalidFormat') }}</p>
        <p v-if="error" class="mt-2 text-xs text-destructive">{{ error }}</p>

        <div v-if="pending" class="py-6 text-center text-muted-foreground">
            <Loader2 class="mx-auto h-5 w-5 animate-spin" />
        </div>

        <template v-else-if="summary">
            <div class="mt-4 rounded-lg border overflow-hidden">
                <div class="divide-y">
                    <div v-for="row in summary" :key="row.label" class="flex items-center justify-between gap-4 px-4 py-2.5">
                        <span class="text-xs font-medium text-muted-foreground shrink-0">{{ row.label }}</span>
                        <span class="text-sm text-foreground font-mono text-right break-all">{{ row.value }}</span>
                    </div>
                </div>
            </div>
            <div class="mt-3 flex justify-end">
                <a
                    :href="hashscanUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                    <ExternalLink class="h-3.5 w-3.5" />
                    {{ $t('hashscanVerify.seeMoreButton') }}
                </a>
            </div>
        </template>

        <div class="mt-6 flex justify-end gap-2">
            <button class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted" @click="emit('close')">
                {{ $t('hashscanVerify.cancel') }}
            </button>
            <button
                :disabled="!isValid || pending"
                class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                @click="onLookup"
            >
                <Loader2 v-if="pending" class="h-3.5 w-3.5 animate-spin" />
                <Search v-else class="h-3.5 w-3.5" />
                {{ $t('hashscanVerify.lookupButton') }}
            </button>
        </div>
    </HelpModalShell>
</template>
