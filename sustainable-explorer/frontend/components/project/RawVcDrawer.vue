<script setup lang="ts">
import { ShieldCheck, X, Loader2, ExternalLink } from 'lucide-vue-next';

const props = defineProps<{
    open: boolean;
    projectId: string;
    network: string;
    consensusTimestamp: string;
    schemaName: string | null;
    topicId?: string | null;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const config = useRuntimeConfig();

const loading = ref(false);
const error = ref(false);
const vcDoc = ref<Record<string, any> | null>(null);
const fieldLabels = ref<Record<string, string>>({});

const SYSTEM_KEYS = new Set(['@context', 'type', 'id', 'policyId', 'ref', 'uuid']);

interface DisplayField { label: string; value: string }

function humanizeKey(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Label for a (possibly nested) field path. Guardian VCs nest sub-schema data as
// objects whose keys are generic (field0, field1…). The policy's schemaFields are
// flattened to dotted paths (e.g. "field0.field3" → "Project Name"), and the
// backend returns those in fieldLabels — so a nested key resolves via its full
// dotted path, falling back to a humanized key when unlabeled.
function labelForPath(path: string, key: string): string {
    return fieldLabels.value[path] || humanizeKey(key);
}

function formatValue(v: unknown, pathPrefix = ''): string {
    if (v == null || v === '') return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) {
        if (v.length === 0) return '—';
        // Array items share the parent's sub-paths (schema paths carry no index).
        return v.map(x => (x && typeof x === 'object' ? formatValue(x, pathPrefix) : String(x))).join(', ');
    }
    if (typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).filter(k => !SYSTEM_KEYS.has(k));
        if (keys.length === 0) return '—';
        return keys
            .map(k => {
                const childPath = pathPrefix ? `${pathPrefix}.${k}` : k;
                return `${labelForPath(childPath, k)}: ${obj[k] && typeof obj[k] === 'object' ? '…' : String(obj[k] ?? '—')}`;
            })
            .join(' · ');
    }
    return String(v);
}

async function load() {
    if (!import.meta.client) return;
    if (!props.consensusTimestamp || !props.projectId) return;
    loading.value = true;
    error.value = false;
    vcDoc.value = null;
    fieldLabels.value = {};
    try {
        const baseURL = config.public.apiBaseUrl as string;
        const res = await $fetch<{ document: Record<string, any>; fieldLabels: Record<string, string> }>(
            `/api/v1/${props.network}/projects/${props.projectId}/vc-evidence/${props.consensusTimestamp}`,
            { baseURL },
        );
        vcDoc.value = res.document ?? null;
        fieldLabels.value = (res.fieldLabels ?? {}) as Record<string, string>;
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}

watch(() => props.open, (isOpen) => { if (isOpen) load(); });
watch(() => props.consensusTimestamp, () => { if (props.open) load(); });

const credentialSubject = computed<Record<string, any> | null>(() => {
    const doc = vcDoc.value;
    if (!doc) return null;
    const cs = doc['credentialSubject'];
    if (Array.isArray(cs)) return (cs[0] ?? null) as Record<string, any> | null;
    if (cs && typeof cs === 'object') return cs as Record<string, any>;
    return null;
});

const issuer = computed<string | null>(() => {
    const doc = vcDoc.value;
    if (!doc) return null;
    const iss = doc['issuer'];
    if (typeof iss === 'string') return iss;
    if (iss && typeof iss === 'object' && typeof (iss as Record<string, unknown>)['id'] === 'string') {
        return (iss as Record<string, string>)['id'];
    }
    return null;
});

const fields = computed<DisplayField[]>(() => {
    const cs = credentialSubject.value;
    if (!cs) return [];
    const out: DisplayField[] = [];
    for (const [key, val] of Object.entries(cs)) {
        if (SYSTEM_KEYS.has(key)) continue;
        if (val == null || val === '') continue;
        out.push({ label: fieldLabels.value[key] || humanizeKey(key), value: formatValue(val, key) });
    }
    return out;
});

const formattedTimestamp = computed(() => {
    const ts = props.consensusTimestamp;
    if (!ts) return '';
    const secs = parseFloat(ts);
    return isNaN(secs) ? ts : new Date(secs * 1000).toLocaleString();
});

const hashscanUrl = computed(() => (props.topicId ? `https://hashscan.io/${props.network}/topic/${props.topicId}` : ''));
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
            <div class="absolute inset-0 bg-black/40" @click="emit('close')" />
            <div class="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-card shadow-xl">
                <!-- Header -->
                <div class="flex items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary">
                            <ShieldCheck class="h-3.5 w-3.5" />
                            On-chain evidence
                        </div>
                        <h3 class="mt-1 truncate text-sm font-semibold text-foreground">{{ schemaName || 'Verifiable Credential' }}</h3>
                        <p class="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{{ formattedTimestamp }}</p>
                    </div>
                    <button class="shrink-0 text-muted-foreground transition-colors hover:text-foreground" @click="emit('close')">
                        <X class="h-4 w-4" />
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                        <Loader2 class="h-4 w-4 animate-spin" />
                        Loading on-chain document…
                    </div>
                    <div v-else-if="error" class="py-10 text-center text-xs text-destructive">
                        Failed to load the VC document.
                    </div>
                    <template v-else-if="credentialSubject">
                        <div v-if="issuer" class="rounded-lg border bg-muted/20 px-4 py-3">
                            <div class="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Issuer DID</div>
                            <code class="break-all font-mono text-xs text-foreground">{{ issuer }}</code>
                        </div>

                        <div class="overflow-hidden rounded-lg border">
                            <div
                                v-for="(f, i) in fields"
                                :key="f.label"
                                :class="['px-4 py-2.5', i % 2 ? 'bg-card' : 'bg-muted/10']"
                            >
                                <div class="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{{ f.label }}</div>
                                <div class="break-words text-sm text-foreground">{{ f.value }}</div>
                            </div>
                            <div v-if="fields.length === 0" class="px-4 py-6 text-center text-xs text-muted-foreground">
                                No readable fields in this credential.
                            </div>
                        </div>

                        <a
                            v-if="hashscanUrl"
                            :href="hashscanUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                            <ExternalLink class="h-3.5 w-3.5" />
                            View topic on HashScan
                        </a>
                    </template>
                    <div v-else class="py-10 text-center text-xs text-muted-foreground">No credential data.</div>
                </div>
            </div>
        </div>
    </Teleport>
</template>
