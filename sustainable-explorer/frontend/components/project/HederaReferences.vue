<script setup lang="ts">
import { Shield, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-vue-next';
import type { Project } from '~/types/models';
import { formatDate } from '~/lib/format';

const props = defineProps<{
    project: Project;
    network: string;
}>();

const hashscanTopicUrl = computed(() => {
    if (!props.project.topicId) return '';
    return `https://hashscan.io/${props.network}/topic/${props.project.topicId}`;
});

const hashscanPolicyUrl = computed(() => {
    if (!props.project.policyTopicId) return '';
    return `https://hashscan.io/${props.network}/topic/${props.project.policyTopicId}`;
});

const vcTimestamp = computed(() => {
    const ts = props.project.sourceTimestamp;
    if (!ts) return null;
    return formatDate(ts);
});

const copiedValue = ref<string | null>(null);

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        copiedValue.value = text;
        setTimeout(() => { copiedValue.value = null; }, 1500);
    } catch { /* ignore */ }
}
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield class="h-4 w-4 text-primary" />
                Hedera On-Chain References
            </h2>
        </div>
        <div class="px-5 py-4 space-y-4">
            <!-- Verified badge -->
            <div class="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                    <div class="text-sm font-medium text-emerald-800">Verified on Hedera</div>
                    <div class="text-xs text-emerald-700">This project is governed by an on-chain Guardian policy anchored to the Hedera network.</div>
                </div>
            </div>

            <!-- Reference grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden border">
                <!-- Instance Topic ID -->
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Instance Topic ID</div>
                    <div class="group flex items-center gap-2">
                        <code class="text-sm font-mono text-foreground">{{ project.topicId ?? '—' }}</code>
                        <button
                            v-if="project.topicId"
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy"
                            @click="copyToClipboard(project.topicId)"
                        >
                            <Check v-if="copiedValue === project.topicId" class="h-3.5 w-3.5 text-emerald-500" />
                            <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                        <a
                            v-if="hashscanTopicUrl"
                            :href="hashscanTopicUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View on HashScan"
                        >
                            <ExternalLink class="h-3.5 w-3.5 text-primary" />
                        </a>
                    </div>
                </div>

                <!-- Policy Topic ID -->
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Policy Topic ID</div>
                    <div class="group flex items-center gap-2">
                        <code class="text-sm font-mono text-foreground">{{ project.policyTopicId ?? '—' }}</code>
                        <button
                            v-if="project.policyTopicId"
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy"
                            @click="copyToClipboard(project.policyTopicId)"
                        >
                            <Check v-if="copiedValue === project.policyTopicId" class="h-3.5 w-3.5 text-emerald-500" />
                            <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                        <a
                            v-if="hashscanPolicyUrl"
                            :href="hashscanPolicyUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View on HashScan"
                        >
                            <ExternalLink class="h-3.5 w-3.5 text-primary" />
                        </a>
                    </div>
                </div>

                <!-- First VC Anchored At -->
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">First VC Anchored At</div>
                    <div class="text-sm text-foreground">{{ vcTimestamp ?? '—' }}</div>
                </div>

                <!-- Registry DID -->
                <div class="bg-card px-5 py-4">
                    <div class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Registry DID</div>
                    <div class="group flex items-start gap-2">
                        <code class="text-xs font-mono text-muted-foreground break-all flex-1">{{ project.registryDid ?? '—' }}</code>
                        <button
                            v-if="project.registryDid"
                            class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                            title="Copy"
                            @click="copyToClipboard(project.registryDid)"
                        >
                            <Check v-if="copiedValue === project.registryDid" class="h-3.5 w-3.5 text-emerald-500" />
                            <Copy v-else class="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- External links -->
            <div class="flex flex-wrap items-center gap-4">
                <a
                    v-if="hashscanTopicUrl"
                    :href="hashscanTopicUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                    <ExternalLink class="h-4 w-4" />
                    View Instance Topic on HashScan
                </a>
                <a
                    v-if="hashscanPolicyUrl"
                    :href="hashscanPolicyUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                    <ExternalLink class="h-4 w-4" />
                    View Policy Topic on HashScan
                </a>
            </div>
        </div>
    </div>
</template>
