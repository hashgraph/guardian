<script setup lang="ts">
import { Download } from 'lucide-vue-next';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { authFetch } = useApiFetch();

const cid = ref('');
const pending = ref(false);
const error = ref('');

watch(() => props.open, (isOpen) => {
    if (isOpen) { cid.value = ''; error.value = ''; pending.value = false; }
});

// Loose client-side shape check; the backend is the source of truth for real
// CID validation (IpfsService.parseCID).
const isPlausibleCid = computed(() => /^\S{10,}$/.test(cid.value.trim()));

function apiBase(): string {
    return (useRuntimeConfig().public.apiBaseUrl as string) || '';
}

async function onDownload() {
    if (!import.meta.client || !isPlausibleCid.value || pending.value) return;
    pending.value = true;
    error.value = '';
    try {
        const res = await authFetch(`${apiBase()}/api/v1/ipfs/${encodeURIComponent(cid.value.trim())}`);
        if (!res.ok) {
            let message =
                res.status === 400 ? t('ipfsFetch.invalidCid')
                    : res.status === 401 ? t('ipfsFetch.authRequired')
                        : res.status === 404 ? t('ipfsFetch.notFound')
                            : res.status === 503 ? t('ipfsFetch.unreachable')
                                : t('ipfsFetch.genericError');
            try {
                const body = await res.json();
                if (body?.message) message = body.message;
            } catch { /* not JSON — keep localized fallback */ }
            error.value = message;
            return;
        }
        const disposition = res.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match?.[1] || cid.value.trim();

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        emit('close');
    } catch {
        error.value = t('ipfsFetch.genericError');
    } finally {
        pending.value = false;
    }
}
</script>

<template>
    <HelpModalShell
        :open="open"
        :title="$t('ipfsFetch.dialogTitle')"
        :subtitle="$t('ipfsFetch.dialogSubtitle')"
        @close="emit('close')"
    >
        <label class="text-xs font-medium text-muted-foreground">{{ $t('ipfsFetch.cidLabel') }}</label>
        <input
            v-model="cid"
            type="text"
            :placeholder="$t('ipfsFetch.cidPlaceholder')"
            class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            @keydown.enter="onDownload"
        />
        <p v-if="error" class="mt-1.5 text-xs text-destructive">{{ error }}</p>

        <div class="mt-6 flex justify-end gap-2">
            <button class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted" @click="emit('close')">
                {{ $t('ipfsFetch.cancel') }}
            </button>
            <button
                :disabled="!isPlausibleCid || pending"
                class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                @click="onDownload"
            >
                <Download class="h-3.5 w-3.5" />
                {{ pending ? $t('ipfsFetch.downloading') : $t('ipfsFetch.downloadButton') }}
            </button>
        </div>
    </HelpModalShell>
</template>
