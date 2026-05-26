<script setup lang="ts">
import { Search, X } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

export interface FilterOption {
    key: string;
    label: string;
    options: { value: string; label: string; icon?: string }[];
    multiSelect?: boolean;
}

const props = defineProps<{
    searchPlaceholder?: string;
    filters?: FilterOption[];
    modelValue: string;
    activeFilters: Record<string, string>;
    resultCount: number;
    totalCount: number;
    // Hide the text-search input when the host page has no use for it
    // (e.g. the dashboard's global developer/registry filters). The filter
    // chips and clear-all button still render so visual idiom stays
    // identical to the search-enabled variants on Projects/Credits/etc.
    hideSearch?: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
    'filter': [key: string, value: string];
    'clear': [];
}>();

const openDropdown = ref<string | null>(null);
const dropdownRefs = ref<Record<string, HTMLElement | null>>({});

function toggleDropdown(key: string) {
    openDropdown.value = openDropdown.value === key ? null : key;
}

function selectFilter(key: string, value: string) {
    emit('filter', key, value);
    openDropdown.value = null;
}

function toggleMultiSelect(key: string, value: string) {
    const current = props.activeFilters[key] || '';
    const values = current ? current.split(',') : [];
    const idx = values.indexOf(value);
    if (idx >= 0) {
        values.splice(idx, 1);
    } else {
        values.push(value);
    }
    emit('filter', key, values.length > 0 ? values.join(',') : 'all');
}

function isMultiSelected(key: string, value: string): boolean {
    const current = props.activeFilters[key] || '';
    if (!current || current === 'all') return false;
    return current.split(',').includes(value);
}

function getActiveLabel(filter: FilterOption): string {
    const active = props.activeFilters[filter.key];
    if (!active || active === 'all') return filter.label;
    if (filter.multiSelect) {
        const count = active.split(',').length;
        return `${filter.label} (${count})`;
    }
    return filter.options.find(o => o.value === active)?.label ?? filter.label;
}

const hasActiveFilters = computed(() => {
    const chipsActive = Object.values(props.activeFilters).some(v => v && v !== 'all');
    if (props.hideSearch) return chipsActive;
    return props.modelValue.trim() !== '' || chipsActive;
});

// Close dropdown when clicking outside
if (import.meta.client) {
    const handler = (e: MouseEvent) => {
        if (openDropdown.value) {
            const el = dropdownRefs.value[openDropdown.value];
            if (el && !el.contains(e.target as Node)) {
                openDropdown.value = null;
            }
        }
    };
    onMounted(() => document.addEventListener('click', handler));
    onUnmounted(() => document.removeEventListener('click', handler));
}
</script>

<template>
    <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
        <!-- Text search -->
        <div v-if="!hideSearch" class="relative">
            <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
                :value="modelValue"
                @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                :placeholder="searchPlaceholder || $t('common.searchEllipsis')"
                class="h-8 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
        </div>

        <!-- Filter dropdowns -->
        <div
            v-for="filter in filters"
            :key="filter.key"
            :ref="(el) => { if (el) dropdownRefs[filter.key] = el as HTMLElement }"
            class="relative"
        >
            <button
                class="inline-flex items-center justify-start text-left gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                :class="activeFilters[filter.key] && activeFilters[filter.key] !== 'all'
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-input text-muted-foreground'"
                @click.stop="toggleDropdown(filter.key)"
            >
                {{ getActiveLabel(filter) }}
                <svg class="h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <!-- Multi-select dropdown -->
                <div
                    v-if="openDropdown === filter.key && filter.multiSelect"
                    class="absolute right-0 top-full mt-1 z-[9999] min-w-[12rem] max-h-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md text-left"
                >
                    <button
                        class="flex w-full items-center justify-start text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors hover:bg-accent text-muted-foreground"
                        @click="emit('filter', filter.key, 'all')"
                    >
                        {{ $t('common.clearSelection') }}
                    </button>
                    <div class="my-1 border-t" />
                    <button
                        v-for="opt in filter.options"
                        :key="opt.value"
                        class="flex w-full items-center justify-start text-left gap-2 rounded-sm px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                        :class="isMultiSelected(filter.key, opt.value) ? 'font-medium text-foreground' : 'text-muted-foreground'"
                        @click.stop="toggleMultiSelect(filter.key, opt.value)"
                    >
                        <span
                            class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors"
                            :class="isMultiSelected(filter.key, opt.value) ? 'bg-primary border-primary' : 'border-input'"
                        >
                            <svg v-if="isMultiSelected(filter.key, opt.value)" class="h-2.5 w-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        <img v-if="opt.icon" :src="opt.icon" :alt="opt.label" class="h-4 w-4 rounded-sm shrink-0" />
                        <span class="text-left">{{ opt.label }}</span>
                    </button>
                </div>

                <!-- Single-select dropdown -->
                <div
                    v-else-if="openDropdown === filter.key"
                    class="absolute right-0 top-full mt-1 z-[9999] min-w-[10rem] max-h-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md text-left"
                >
                    <button
                        v-for="opt in [{ value: 'all', label: `${t('common.all')} ${filter.label}` }, ...filter.options]"
                        :key="opt.value"
                        class="flex w-full items-center justify-start text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                        :class="(activeFilters[filter.key] || 'all') === opt.value ? 'font-medium text-foreground' : 'text-muted-foreground'"
                        @click="selectFilter(filter.key, opt.value)"
                    >
                        {{ opt.label }}
                    </button>
                </div>
            </Transition>
        </div>

        <!-- Clear filters -->
        <button
            v-if="hasActiveFilters"
            class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('clear')"
        >
            <X class="h-3 w-3" />
            {{ $t('common.clear') }}
        </button>
    </div>
    </div>
</template>
