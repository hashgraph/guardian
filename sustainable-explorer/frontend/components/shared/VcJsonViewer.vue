<script setup lang="ts">
import { X, Copy, Check, Download, FileJson, ChevronUp, ChevronDown } from 'lucide-vue-next';

const props = defineProps<{
    open: boolean;
    title: string;
    data: Record<string, any> | null;
}>();

const emit = defineEmits<{
    close: [];
}>();

const ACTIVE_MARK_CLASS = 'bg-chart-3/80';
const INACTIVE_MARK_CLASS = 'bg-chart-3/40';

const copied = ref(false);
const searchQuery = ref('');
const debouncedQuery = ref('');
const currentMatchIndex = ref(0);
const totalMatches = ref(0);
const preRef = ref<HTMLPreElement | null>(null);

let markEls: HTMLElement[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const jsonString = computed(() => {
    if (!props.data) return '';
    return JSON.stringify(props.data, null, 2);
});

const highlightedJson = computed(() => {
    let json = jsonString.value;
    if (!json) return '';

    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"([^"]+)":/g, '<span class="text-stat-blue">"$1"</span>:')
        .replace(/: "(.*?)"/g, ': <span class="text-stat-green">"$1"</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="text-stat-amber">$1</span>')
        .replace(/: (true|false)/g, ': <span class="text-stat-rose">$1</span>')
        .replace(/: (null)/g, ': <span class="text-muted-foreground">$1</span>');

    if (debouncedQuery.value.trim()) {
        const q = debouncedQuery.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        json = json.replace(new RegExp(`(${q})`, 'gi'), `<mark class="${INACTIVE_MARK_CLASS} rounded px-0.5">$1</mark>`);
    }

    return json;
});

function applyActiveMark(scroll: boolean) {
    for (const el of markEls) {
        el.classList.remove(ACTIVE_MARK_CLASS);
        el.classList.add(INACTIVE_MARK_CLASS);
    }
    if (currentMatchIndex.value < 1) return;

    const active = markEls[currentMatchIndex.value - 1];
    if (!active) return;

    active.classList.remove(INACTIVE_MARK_CLASS);
    active.classList.add(ACTIVE_MARK_CLASS);

    if (scroll) {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function refreshMatches() {
    const root = preRef.value;
    markEls = root ? Array.from(root.querySelectorAll<HTMLElement>('mark')) : [];
    totalMatches.value = markEls.length;
    currentMatchIndex.value = markEls.length > 0 ? 1 : 0;
    applyActiveMark(true);
}

function nextMatch() {
    if (totalMatches.value === 0) return;
    currentMatchIndex.value =
        currentMatchIndex.value >= totalMatches.value ? 1 : currentMatchIndex.value + 1;
    applyActiveMark(true);
}

function prevMatch() {
    if (totalMatches.value === 0) return;
    currentMatchIndex.value =
        currentMatchIndex.value <= 1 ? totalMatches.value : currentMatchIndex.value - 1;
    applyActiveMark(true);
}

async function copyToClipboard() {
    await navigator.clipboard.writeText(jsonString.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
}

function downloadJson() {
    const blob = new Blob([jsonString.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.title.replace(/\s+/g, '-').toLowerCase()}-vc.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close');
}

watch(searchQuery, (val) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (val === '') {
        debouncedQuery.value = '';
        return;
    }
    debounceTimer = setTimeout(() => {
        debouncedQuery.value = val;
    }, 200);
});

watch(highlightedJson, () => {
    refreshMatches();
}, { flush: 'post' });

watch(() => props.open, (val) => {
    if (val) {
        searchQuery.value = '';
        debouncedQuery.value = '';
        currentMatchIndex.value = 0;
        totalMatches.value = 0;
        markEls = [];
        document.addEventListener('keydown', onKeydown);
    } else {
        document.removeEventListener('keydown', onKeydown);
    }
});

onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div v-if="open" class="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" @click="emit('close')" />
        </Transition>

        <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-4 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-4"
        >
            <div
                v-if="open"
                class="fixed inset-4 z-[9999] flex items-center justify-center pointer-events-none"
            >
                <div class="pointer-events-auto w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border bg-card shadow-2xl" @click.stop>
                    <!-- Header -->
                    <div class="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
                        <div class="flex items-center gap-2.5">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <FileJson class="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>
                                <p class="text-[11px] text-muted-foreground">{{ $t('vcViewer.rawDataOnBlockchain') }}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button
                                class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                @click="copyToClipboard"
                            >
                                <Check v-if="copied" class="h-3.5 w-3.5 text-stat-green" />
                                <Copy v-else class="h-3.5 w-3.5" />
                                {{ copied ? $t('common.copied') : $t('common.copy') }}
                            </button>
                            <button
                                class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                @click="downloadJson"
                            >
                                <Download class="h-3.5 w-3.5" />
                                {{ $t('common.download') }}
                            </button>
                            <button
                                class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
                                @click="emit('close')"
                            >
                                <X class="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <!-- Search -->
                    <div class="px-5 py-2.5 border-b shrink-0">
                        <div class="flex items-center gap-2">
                            <div class="relative flex-1">
                                <svg class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    v-model="searchQuery"
                                    :placeholder="$t('vcViewer.searchInJson')"
                                    class="w-full h-7 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>

                            <!-- Counter + navigation: only visible when a query is committed -->
                            <div v-if="debouncedQuery.trim()" class="flex items-center gap-1 shrink-0">
                                <span class="text-[11px] tabular-nums text-muted-foreground min-w-[3.5rem] text-right">
                                    <template v-if="totalMatches > 0">
                                        {{ $t('vcViewer.matchCount', { current: currentMatchIndex, total: totalMatches }) }}
                                    </template>
                                    <template v-else>
                                        {{ $t('vcViewer.noMatches') }}
                                    </template>
                                </span>
                                <button
                                    type="button"
                                    :disabled="totalMatches < 2"
                                    class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                    :title="$t('vcViewer.prevMatch')"
                                    @click="prevMatch"
                                >
                                    <ChevronUp class="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    :disabled="totalMatches < 2"
                                    class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                    :title="$t('vcViewer.nextMatch')"
                                    @click="nextMatch"
                                >
                                    <ChevronDown class="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- JSON Content -->
                    <div class="flex-1 overflow-auto p-5">
                        <pre
                            ref="preRef"
                            class="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-words"
                            v-html="highlightedJson"
                        />
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-between px-5 py-2.5 border-t shrink-0 text-[11px] text-muted-foreground">
                        <span>{{ jsonString.split('\n').length }} {{ $t('common.lines') }}</span>
                        <span>{{ (jsonString.length / 1024).toFixed(1) }} KB</span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
