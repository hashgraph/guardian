<script setup lang="ts">
import { FileText, FileJson, ChevronDown, Copy, Check } from 'lucide-vue-next';
import type { Project } from '~/types/models';

const props = defineProps<{
    project: Project;
    network: string;
}>();

const emit = defineEmits<{
    (e: 'view-vc-json', consensusTimestamp: string): void;
}>();

const { t } = useI18n();

// Per-schema open/closed state. First schema with vcCount > 0 starts expanded.
const schemaOpenState = ref<Record<string, boolean>>({});

watch(
    () => props.project,
    (p) => {
        if (!p?.linkedSchemas?.length) return;
        const state: Record<string, boolean> = {};
        let firstExpanded = false;
        for (const s of p.linkedSchemas) {
            if (!firstExpanded && s.vcCount > 0) {
                state[s.schemaUuid] = true;
                firstExpanded = true;
            } else {
                state[s.schemaUuid] = false;
            }
        }
        schemaOpenState.value = state;
    },
    { immediate: true },
);

function toggleSchema(uuid: string) {
    schemaOpenState.value = { ...schemaOpenState.value, [uuid]: !schemaOpenState.value[uuid] };
}

function schemaDisplayName(uuid: string, name: string | null): string {
    if (name) return name;
    return `${uuid.slice(0, 8)}...`;
}

function formatTimestamp(ts: string): string {
    if (!ts) return '—';
    const secs = parseFloat(ts);
    if (isNaN(secs)) return ts;
    return new Date(secs * 1000).toLocaleString();
}

const copiedTopicId = ref<string | null>(null);

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        copiedTopicId.value = text;
        setTimeout(() => { copiedTopicId.value = null; }, 1500);
    } catch { /* ignore */ }
}
</script>

<template>
    <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-5 py-3.5 border-b bg-muted/30">
            <h2 class="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText class="h-4 w-4 text-primary" />
                {{ $t('projects.detail.linkedVcs.title') }}
            </h2>
            <p class="text-[11px] text-muted-foreground mt-0.5">{{ $t('projects.detail.linkedVcs.subtitle') }}</p>
        </div>

        <!-- No tracking data at all -->
        <div v-if="!project.linkedSchemas?.length" class="px-5 py-8 text-center text-sm text-muted-foreground">
            {{ $t('projects.detail.linkedVcs.notTracked') }}
        </div>

        <!-- Schema cards -->
        <div v-else class="divide-y">
            <div
                v-for="schema in project.linkedSchemas"
                :key="schema.schemaUuid"
                :class="['transition-colors', schema.vcCount === 0 ? 'border-l-2 border-l-amber-300' : '']"
            >
                <!-- Schema header (collapsible toggle) -->
                <button
                    class="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-muted/30 transition-colors"
                    @click="toggleSchema(schema.schemaUuid)"
                >
                    <span class="flex items-center gap-2 min-w-0">
                        <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span class="text-sm font-medium text-foreground truncate">{{ schemaDisplayName(schema.schemaUuid, schema.schemaName) }}</span>
                        <span
                            v-if="schema.isProjectSchema"
                            class="shrink-0 inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium"
                        >
                            {{ $t('projects.detail.linkedVcs.projectSchemaBadge') }}
                        </span>
                        <span
                            v-if="schema.vcCount === 0"
                            class="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium"
                        >
                            0 VCs
                        </span>
                    </span>
                    <span class="flex items-center gap-2 shrink-0">
                        <span class="text-xs text-muted-foreground tabular-nums">{{ schema.vcCount }} VC(s)</span>
                        <ChevronDown
                            class="h-3.5 w-3.5 text-muted-foreground transition-transform"
                            :class="schemaOpenState[schema.schemaUuid] ? 'rotate-180' : ''"
                        />
                    </span>
                </button>

                <!-- Expanded content -->
                <div v-if="schemaOpenState[schema.schemaUuid]" class="border-t">
                    <!-- Empty state -->
                    <div v-if="schema.vcCount === 0" class="px-5 py-4 text-sm text-muted-foreground italic">
                        {{ $t('projects.detail.linkedVcs.empty') }}
                    </div>

                    <!-- VC table -->
                    <table v-else class="w-full text-sm">
                        <thead>
                            <tr class="bg-muted/20">
                                <th class="text-left py-2 px-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.linkedVcs.columns.timestamp') }}</th>
                                <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.linkedVcs.columns.topicId') }}</th>
                                <th class="text-left py-2 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ $t('projects.detail.linkedVcs.columns.csId') }}</th>
                                <th class="py-2 px-4" />
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="vc in schema.linkedVcs" :key="vc.consensusTimestamp" class="hover:bg-muted/30 transition-colors">
                                <td class="py-2.5 px-5 text-xs text-foreground tabular-nums">{{ formatTimestamp(vc.consensusTimestamp) }}</td>
                                <td class="py-2.5 px-4">
                                    <span class="group inline-flex items-center gap-1.5">
                                        <code class="text-xs font-mono text-foreground">{{ vc.topicId }}</code>
                                        <button
                                            class="opacity-0 group-hover:opacity-100 transition-opacity"
                                            :title="$t('common.copy')"
                                            @click.stop="copyToClipboard(vc.topicId)"
                                        >
                                            <Check v-if="copiedTopicId === vc.topicId" class="h-3 w-3 text-emerald-500" />
                                            <Copy v-else class="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </span>
                                </td>
                                <td class="py-2.5 px-4">
                                    <code v-if="vc.csId" class="text-xs font-mono text-muted-foreground" :title="vc.csId">
                                        {{ vc.csId.length > 16 ? vc.csId.slice(0, 14) + '…' : vc.csId }}
                                    </code>
                                    <span v-else class="text-xs text-muted-foreground">—</span>
                                </td>
                                <td class="py-2.5 px-4 text-right">
                                    <button
                                        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                        @click="emit('view-vc-json', vc.consensusTimestamp)"
                                    >
                                        <FileJson class="h-3.5 w-3.5 text-primary" />
                                        {{ $t('projects.detail.linkedVcs.viewJson') }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
