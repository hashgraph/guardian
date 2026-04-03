<script setup lang="ts">
import { X, Copy, Check, Download, FileJson } from 'lucide-vue-next';

const props = defineProps<{
    open: boolean;
    title: string;
    data: Record<string, any> | null;
}>();

const emit = defineEmits<{
    close: [];
}>();

const copied = ref(false);
const searchQuery = ref('');

const jsonString = computed(() => {
    if (!props.data) return '';
    return JSON.stringify(props.data, null, 2);
});

const highlightedJson = computed(() => {
    let json = jsonString.value;
    if (!json) return '';

    // Syntax highlighting
    json = json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"([^"]+)":/g, '<span class="text-stat-blue">"$1"</span>:')
        .replace(/: "(.*?)"/g, ': <span class="text-stat-green">"$1"</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="text-stat-amber">$1</span>')
        .replace(/: (true|false)/g, ': <span class="text-stat-rose">$1</span>')
        .replace(/: (null)/g, ': <span class="text-muted-foreground">$1</span>');

    // Highlight search matches
    if (searchQuery.value.trim()) {
        const q = searchQuery.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        json = json.replace(new RegExp(`(${q})`, 'gi'), '<mark class="bg-chart-3/40 rounded px-0.5">$1</mark>');
    }

    return json;
});

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

watch(() => props.open, (val) => {
    if (val) {
        searchQuery.value = '';
        document.addEventListener('keydown', onKeydown);
    } else {
        document.removeEventListener('keydown', onKeydown);
    }
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
                                <p class="text-[11px] text-muted-foreground">Raw Data on the blockchain</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button
                                class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                @click="copyToClipboard"
                            >
                                <Check v-if="copied" class="h-3.5 w-3.5 text-stat-green" />
                                <Copy v-else class="h-3.5 w-3.5" />
                                {{ copied ? 'Copied' : 'Copy' }}
                            </button>
                            <button
                                class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                @click="downloadJson"
                            >
                                <Download class="h-3.5 w-3.5" />
                                Download
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
                        <div class="relative">
                            <svg class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                v-model="searchQuery"
                                placeholder="Search in JSON..."
                                class="w-full h-7 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                    </div>

                    <!-- JSON Content -->
                    <div class="flex-1 overflow-auto p-5">
                        <pre
                            class="text-[12px] leading-relaxed font-mono whitespace-pre-wrap break-words"
                            v-html="highlightedJson"
                        />
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-between px-5 py-2.5 border-t shrink-0 text-[11px] text-muted-foreground">
                        <span>{{ jsonString.split('\n').length }} lines</span>
                        <span>{{ (jsonString.length / 1024).toFixed(1) }} KB</span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
