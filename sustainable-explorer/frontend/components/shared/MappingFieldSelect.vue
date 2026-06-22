<script setup lang="ts">
import { Search, ChevronDown, Check } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';

export interface MappingOption {
    value: string;
    label: string;
}
export interface MappingOptionGroup {
    label: string;
    options: MappingOption[];
}

const props = withDefaults(
    defineProps<{
        modelValue: string;
        groups: MappingOptionGroup[];
        /** Label for the "clear / not mapped" choice (also the empty-state trigger text). */
        unmappedLabel?: string;
        placeholder?: string;
        disabled?: boolean;
    }>(),
    { unmappedLabel: '— None —', placeholder: 'Search…', disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const search = ref('');
const rootEl = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

// The panel is teleported to <body> so it can't be clipped by an ancestor's
// overflow (the mapping table/card). That means it has to be positioned
// manually (fixed) relative to the trigger, and re-positioned on scroll/resize.
const panelStyle = ref<Record<string, string>>({});

// Flat lookup so the trigger can show the selected option's label regardless
// of which group it lives in.
const selectedLabel = computed(() => {
    if (!props.modelValue) return '';
    for (const g of props.groups) {
        const hit = g.options.find(o => o.value === props.modelValue);
        if (hit) return hit.label;
    }
    // Mapped to something not in the current option set (e.g. a value that
    // survived a schema change) — show the raw value so it's not silently blank.
    return props.modelValue;
});

const filteredGroups = computed<MappingOptionGroup[]>(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return props.groups;
    const out: MappingOptionGroup[] = [];
    for (const g of props.groups) {
        const opts = g.options.filter(
            o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
        );
        if (opts.length) out.push({ label: g.label, options: opts });
    }
    return out;
});

const totalFiltered = computed(() =>
    filteredGroups.value.reduce((n, g) => n + g.options.length, 0),
);

function updatePosition() {
    if (!import.meta.client) return;
    const el = triggerEl.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 4;
    const width = Math.min(Math.max(r.width, 288), window.innerWidth - 16);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    // Flip upward when there isn't enough room below and there's more above.
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(360, openUp ? spaceAbove : spaceBelow));
    const base: Record<string, string> = {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        width: `${Math.round(width)}px`,
        maxHeight: `${Math.round(maxHeight)}px`,
        zIndex: '9999',
    };
    panelStyle.value = openUp
        ? { ...base, bottom: `${Math.round(window.innerHeight - r.top + margin)}px` }
        : { ...base, top: `${Math.round(r.bottom + margin)}px` };
}

function toggle() {
    if (props.disabled) return;
    open.value = !open.value;
    if (open.value) {
        search.value = '';
        nextTick(() => {
            updatePosition();
            searchInput.value?.focus();
        });
    }
}

function select(value: string) {
    emit('update:modelValue', value);
    open.value = false;
}

// Clicks inside the teleported panel are "outside" rootEl, so ignore it explicitly.
onClickOutside(rootEl, () => { open.value = false; }, { ignore: [panelEl] });

if (import.meta.client) {
    const reposition = () => { if (open.value) updatePosition(); };
    onMounted(() => {
        // capture=true so we catch scrolling in any ancestor, not just window.
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
    });
    onUnmounted(() => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
    });
}
</script>

<template>
    <div ref="rootEl" class="relative w-full max-w-sm">
        <!-- Trigger -->
        <button
            ref="triggerEl"
            type="button"
            :disabled="disabled"
            class="flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            @click.stop="toggle"
        >
            <!-- truncate keeps the trigger one line; title shows the full text on hover -->
            <span
                class="truncate"
                :class="selectedLabel ? '' : 'text-muted-foreground'"
                :title="selectedLabel || undefined"
            >
                {{ selectedLabel || unmappedLabel }}
            </span>
            <ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>

        <!-- Panel — teleported to body so it escapes the table/card overflow clip. -->
        <Teleport to="body">
            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="open"
                    ref="panelEl"
                    :style="panelStyle"
                    class="flex flex-col overflow-hidden rounded-md border bg-popover shadow-md"
                >
                    <!-- Search -->
                    <div class="shrink-0 border-b border-border p-1">
                        <div class="relative">
                            <Search class="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                            <input
                                ref="searchInput"
                                v-model="search"
                                type="text"
                                :placeholder="placeholder"
                                class="h-7 w-full rounded-sm border border-input bg-background pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                @click.stop
                                @keydown.esc.stop="open = false"
                            />
                        </div>
                    </div>

                    <!-- Options (scrolls within the fixed panel height) -->
                    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1">
                        <!-- Unmapped / clear -->
                        <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                            :class="!modelValue ? 'font-medium text-foreground' : 'text-muted-foreground'"
                            @click="select('')"
                        >
                            <Check class="h-3 w-3 shrink-0" :class="!modelValue ? 'opacity-100' : 'opacity-0'" />
                            <span>{{ unmappedLabel }}</span>
                        </button>

                        <template v-for="group in filteredGroups" :key="group.label">
                            <div class="my-1 border-t" />
                            <div class="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {{ group.label }}
                            </div>
                            <button
                                v-for="opt in group.options"
                                :key="opt.value"
                                type="button"
                                class="flex w-full items-start gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                                :class="modelValue === opt.value ? 'font-medium text-foreground' : 'text-muted-foreground'"
                                :title="opt.label"
                                @click="select(opt.value)"
                            >
                                <Check class="mt-0.5 h-3 w-3 shrink-0" :class="modelValue === opt.value ? 'opacity-100' : 'opacity-0'" />
                                <!-- break-words wraps long field names so they're fully readable -->
                                <span class="min-w-0 break-words">{{ opt.label }}</span>
                            </button>
                        </template>

                        <!-- Empty state -->
                        <div v-if="totalFiltered === 0" class="px-2.5 py-3 text-center text-xs text-muted-foreground">
                            No matching fields
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
