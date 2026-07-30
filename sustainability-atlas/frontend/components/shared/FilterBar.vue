<script setup lang="ts">
import { Search, X, CalendarRange } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { encodeMultiValue, decodeMultiValue } from '~/lib/utils';

const { t, locale } = useI18n();

export interface FilterOption {
    key: string;
    label: string;
    options: { value: string; label: string; icon?: string }[];
    multiSelect?: boolean;
    searchable?: boolean;
    type?: 'select' | 'daterange' | 'yearrange' | 'numrange';
    emptyLabel?: string;
}

const props = defineProps<{
    searchPlaceholder?: string;
    filters?: FilterOption[];
    modelValue: string;
    activeFilters: Record<string, string>;
    resultCount: number;
    totalCount: number;
    hideSearch?: boolean;
    dropdownAlign?: 'left' | 'right';
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
    'filter': [key: string, value: string];
    'clear': [];
}>();

const openDropdown = ref<string | null>(null);
const dropdownRefs = ref<Record<string, HTMLElement | null>>({});
const dropdownSearch = ref<Record<string, string>>({});

const panelRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});

function bindPanelRef(el: Element | null) {
    if (el) {
        panelRef.value = el as HTMLElement;
        return;
    }
    if (!openDropdown.value) panelRef.value = null;
}

watch(openDropdown, (_newKey, oldKey) => {
    if (oldKey) dropdownSearch.value[oldKey] = '';
});

/**
 * Positions the currently-open panel as `position: fixed`, anchored to its
 * trigger's live `getBoundingClientRect()` — this is what lets it render
 * through a Teleport without being clipped by an ancestor's overflow-hidden.
 *
 * Range-type filters (daterange/yearrange/numrange) have always anchored to
 * the trigger's left edge regardless of `dropdownAlign` (matching the old
 * hardcoded `left-0` on those panels); only the select-style panels honor
 * `dropdownAlign="right"`. That distinction is preserved here.
 */
function updatePanelPosition() {
    const key = openDropdown.value;
    if (!key || !import.meta.client) return;
    const trigger = dropdownRefs.value[key];
    if (!trigger) return;

    const filter = props.filters?.find((f) => f.key === key);
    const isRangeType = filter?.type === 'daterange' || filter?.type === 'yearrange' || filter?.type === 'numrange';
    const rightAlign = !isRangeType && props.dropdownAlign === 'right';

    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const gap = 4; // matches the old `mt-1`

    if (rect.bottom < 0 || rect.top > viewportH) {
        openDropdown.value = null;
        return;
    }

    const style: Record<string, string> = { position: 'fixed', zIndex: '9999' };

    style.top = `${rect.bottom + gap}px`;
    if (rightAlign) {
        style.right = `${viewportW - rect.right}px`;
    } else {
        style.left = `${rect.left}px`;
    }

    const panel = panelRef.value;
    if (panel) {
        const panelRect = panel.getBoundingClientRect();

        let top = rect.bottom + gap;
        const overflowsBottom = top + panelRect.height > viewportH - 8;
        const roomAbove = rect.top - panelRect.height - gap > 8;
        if (overflowsBottom && roomAbove) {
            top = rect.top - panelRect.height - gap; // flip above the trigger
        }
        top = Math.max(8, Math.min(top, viewportH - panelRect.height - 8));

        let left = rightAlign ? rect.right - panelRect.width : rect.left;
        left = Math.max(8, Math.min(left, viewportW - panelRect.width - 8));

        style.top = `${top}px`;
        style.left = `${left}px`;
        delete style.right;
    }

    dropdownStyle.value = style;
}

function filteredOptions(filter: FilterOption): FilterOption['options'] {
    const q = (dropdownSearch.value[filter.key] ?? '').toLowerCase().trim();
    if (!q) return filter.options;
    return filter.options.filter(o => o.label.toLowerCase().includes(q));
}

async function toggleDropdown(key: string) {
    if (openDropdown.value === key) {
        openDropdown.value = null;
        return;
    }
    openDropdown.value = key;
    await nextTick();
    updatePanelPosition();
}

function selectFilter(key: string, value: string) {
    emit('filter', key, value);
    openDropdown.value = null;
}

function toggleMultiSelect(key: string, value: string) {
    const current = props.activeFilters[key] || '';
    const values = decodeMultiValue(current);
    const idx = values.indexOf(value);
    if (idx >= 0) {
        values.splice(idx, 1);
    } else {
        values.push(value);
    }
    emit('filter', key, values.length > 0 ? encodeMultiValue(values) : 'all');
}

function isMultiSelected(key: string, value: string): boolean {
    const current = props.activeFilters[key] || '';
    if (!current || current === 'all') return false;
    return decodeMultiValue(current).includes(value);
}

// ── Numeric range helpers ─────────────────────────────────────────────────

function getNumRangeValue(key: string): { from: string; to: string } {
    const val = props.activeFilters[key] || '';
    if (!val || val === 'all') return { from: '', to: '' };
    const parts = val.split('|');
    return { from: parts[0] || '', to: parts[1] || '' };
}

function setNumRangeFrom(key: string, from: string) {
    const { to } = getNumRangeValue(key);
    emit('filter', key, (from || to) ? `${from}|${to}` : 'all');
}

function setNumRangeTo(key: string, to: string) {
    const { from } = getNumRangeValue(key);
    emit('filter', key, (from || to) ? `${from}|${to}` : 'all');
}

function clearNumRange(key: string) {
    emit('filter', key, 'all');
    openDropdown.value = null;
}

function isNumRangeActive(key: string): boolean {
    const { from, to } = getNumRangeValue(key);
    return !!(from || to);
}

function formatNumLabel(val: string): string {
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return n.toLocaleString();
}

// ── Year range helpers ────────────────────────────────────────────────────

function getYearRangeValue(key: string): { from: string; to: string } {
    return getDateRangeValue(key); // same "from|to" format
}

function setYearRangeFrom(key: string, from: string) {
    const { to } = getYearRangeValue(key);
    const newVal = `${from}|${to}`;
    emit('filter', key, (from || to) ? newVal : 'all');
}

function setYearRangeTo(key: string, to: string) {
    const { from } = getYearRangeValue(key);
    const newVal = `${from}|${to}`;
    emit('filter', key, (from || to) ? newVal : 'all');
}

function clearYearRange(key: string) {
    emit('filter', key, 'all');
    openDropdown.value = null;
}

function isYearRangeActive(key: string): boolean {
    const { from, to } = getYearRangeValue(key);
    return !!(from || to);
}

// ── Date range helpers ────────────────────────────────────────────────────

function getDateRangeValue(key: string): { from: string; to: string } {
    const val = props.activeFilters[key] || '';
    if (!val || val === 'all') return { from: '', to: '' };
    const parts = val.split('|');
    return { from: parts[0] || '', to: parts[1] || '' };
}

function setDateRangeFrom(key: string, from: string) {
    const { to } = getDateRangeValue(key);
    const newVal = `${from}|${to}`;
    emit('filter', key, (from || to) ? newVal : 'all');
}

function setDateRangeTo(key: string, to: string) {
    const { from } = getDateRangeValue(key);
    const newVal = `${from}|${to}`;
    emit('filter', key, (from || to) ? newVal : 'all');
}

function clearDateRange(key: string) {
    emit('filter', key, 'all');
    openDropdown.value = null;
}

function isDateRangeActive(key: string): boolean {
    const { from, to } = getDateRangeValue(key);
    return !!(from || to);
}

const localeTag = computed(() => (locale.value === 'es' ? 'es-ES' : 'en-US'));

function formatShortDate(d: string): string {
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(localeTag.value, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────

function isFilterActive(filter: FilterOption): boolean {
    if (filter.type === 'daterange') return isDateRangeActive(filter.key);
    if (filter.type === 'yearrange') return isYearRangeActive(filter.key);
    if (filter.type === 'numrange') return isNumRangeActive(filter.key);
    return !!(props.activeFilters[filter.key] && props.activeFilters[filter.key] !== 'all');
}

function getActiveLabel(filter: FilterOption): string {
    if (filter.type === 'numrange') {
        const { from, to } = getNumRangeValue(filter.key);
        if (!from && !to) return filter.label;
        if (from && to) return `${formatNumLabel(from)} – ${formatNumLabel(to)}`;
        if (from) return `≥ ${formatNumLabel(from)}`;
        return `≤ ${formatNumLabel(to)}`;
    }
    if (filter.type === 'yearrange') {
        const { from, to } = getYearRangeValue(filter.key);
        if (!from && !to) return filter.label;
        if (from && to) return `${from} – ${to}`;
        if (from) return `${t('common.from')} ${from}`;
        return `${t('common.to')} ${to}`;
    }
    if (filter.type === 'daterange') {
        const { from, to } = getDateRangeValue(filter.key);
        if (!from && !to) return filter.label;
        if (from && to) return `${formatShortDate(from)} – ${formatShortDate(to)}`;
        if (from) return `${t('common.from')} ${formatShortDate(from)}`;
        return `${t('common.to')} ${formatShortDate(to)}`;
    }
    const active = props.activeFilters[filter.key];
    if (!active || active === 'all') return filter.emptyLabel ?? filter.label;
    if (filter.multiSelect) {
        const count = decodeMultiValue(active).length;
        return `${filter.label} (${count})`;
    }
    return filter.options.find(o => o.value === active)?.label ?? filter.label;
}

const hasActiveFilters = computed(() => {
    const chipsActive = Object.values(props.activeFilters).some(v => v && v !== 'all');
    if (props.hideSearch) return chipsActive;
    return props.modelValue.trim() !== '' || chipsActive;
});

// Close dropdown when clicking outside. The panel is teleported to <body>,
// so it's no longer a DOM descendant of the trigger wrapper — it must be
// checked separately, or every click inside the panel (an option, a date
// input, the inline search box) would be misread as "outside" and close it.
if (import.meta.client) {
    const handler = (e: MouseEvent) => {
        if (openDropdown.value) {
            const target = e.target as Node;
            const trigger = dropdownRefs.value[openDropdown.value];
            const panel = panelRef.value;
            const insideTrigger = !!trigger && trigger.contains(target);
            const insidePanel = !!panel && panel.contains(target);
            if (!insideTrigger && !insidePanel) {
                openDropdown.value = null;
            }
        }
    };
    const reposition = () => {
        if (openDropdown.value) updatePanelPosition();
    };
    onMounted(() => {
        document.addEventListener('click', handler);
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
    });
    onUnmounted(() => {
        document.removeEventListener('click', handler);
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
    });
}
</script>

<template>
    <div data-tour="filter-bar" class="space-y-2">
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
                :class="isFilterActive(filter)
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-input text-muted-foreground'"
                @click.stop="toggleDropdown(filter.key)"
            >
                <CalendarRange v-if="filter.type === 'daterange' || filter.type === 'yearrange'" class="h-3 w-3 opacity-60 shrink-0" />
                <svg v-else-if="filter.type === 'numrange'" class="h-3 w-3 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18M3 12h12M3 18h6" /></svg>
                {{ getActiveLabel(filter) }}
                <svg class="h-3 w-3 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <!-- Teleported to <body> so the panel can render as `position: fixed`
                 (see updatePanelPosition()) and escape any ancestor's
                 overflow-hidden (e.g. the rounded card shells that clip an
                 absolutely-positioned panel otherwise). -->
            <Teleport to="body">
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
                    :ref="bindPanelRef"
                    :style="dropdownStyle"
                    class="fixed min-w-[12rem] max-w-[16rem] rounded-md border bg-popover shadow-md text-left"
                >
                    <!-- Inline search for searchable multi-select dropdowns -->
                    <div v-if="filter.searchable" class="p-1 border-b border-border">
                        <div class="relative">
                            <Search class="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                v-model="dropdownSearch[filter.key]"
                                type="text"
                                :placeholder="$t('common.searchEllipsis')"
                                class="h-7 w-full rounded-sm border border-input bg-background pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                @click.stop
                                @keydown.esc.stop="openDropdown = null"
                            />
                        </div>
                    </div>
                    <div class="p-1 max-h-64 overflow-y-auto overflow-x-hidden">
                        <button
                            class="flex w-full items-center justify-start text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors hover:bg-accent text-muted-foreground"
                            @click="emit('filter', filter.key, 'all')"
                        >
                            {{ $t('common.clearSelection') }}
                        </button>
                        <div class="my-1 border-t" />
                        <button
                            v-for="opt in filteredOptions(filter)"
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
                            <span class="text-left whitespace-normal break-words">{{ opt.label }}</span>
                        </button>
                    </div>
                </div>

                <!-- Numeric range dropdown -->
                <div
                    v-else-if="openDropdown === filter.key && filter.type === 'numrange'"
                    :ref="bindPanelRef"
                    :style="dropdownStyle"
                    class="fixed w-56 rounded-md border bg-popover p-3 shadow-md"
                >
                    <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ filter.label }}</p>
                    <div class="space-y-2.5">
                        <div class="space-y-1">
                            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {{ $t('common.numMin') }}
                            </label>
                            <input
                                type="number"
                                :value="getNumRangeValue(filter.key).from"
                                min="0"
                                step="1"
                                placeholder="e.g. 10000"
                                class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                @change="setNumRangeFrom(filter.key, ($event.target as HTMLInputElement).value)"
                            />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {{ $t('common.numMax') }}
                            </label>
                            <input
                                type="number"
                                :value="getNumRangeValue(filter.key).to"
                                min="0"
                                step="1"
                                placeholder="e.g. 1000000"
                                class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                @change="setNumRangeTo(filter.key, ($event.target as HTMLInputElement).value)"
                            />
                        </div>
                        <button
                            v-if="isNumRangeActive(filter.key)"
                            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-0.5"
                            @click="clearNumRange(filter.key)"
                        >
                            <X class="h-3 w-3" />
                            {{ $t('common.clearRange') }}
                        </button>
                    </div>
                </div>

                <!-- Date range dropdown -->
                <div
                    v-else-if="openDropdown === filter.key && filter.type === 'daterange'"
                    :ref="bindPanelRef"
                    :style="dropdownStyle"
                    class="fixed w-64 rounded-md border bg-popover p-3 shadow-md"
                >
                    <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ filter.label }}</p>
                    <div class="space-y-2.5">
                        <div class="space-y-1">
                            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {{ $t('common.dateFrom') }}
                            </label>
                            <input
                                type="date"
                                :value="getDateRangeValue(filter.key).from"
                                :max="getDateRangeValue(filter.key).to || undefined"
                                class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                @change="setDateRangeFrom(filter.key, ($event.target as HTMLInputElement).value)"
                            />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {{ $t('common.dateTo') }}
                            </label>
                            <input
                                type="date"
                                :value="getDateRangeValue(filter.key).to"
                                :min="getDateRangeValue(filter.key).from || undefined"
                                class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                @change="setDateRangeTo(filter.key, ($event.target as HTMLInputElement).value)"
                            />
                        </div>
                        <button
                            v-if="isDateRangeActive(filter.key)"
                            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-0.5"
                            @click="clearDateRange(filter.key)"
                        >
                            <X class="h-3 w-3" />
                            {{ $t('common.dateRangeClear') }}
                        </button>
                    </div>
                </div>

                <!-- Year range dropdown -->
                <div
                    v-else-if="openDropdown === filter.key && filter.type === 'yearrange'"
                    :ref="bindPanelRef"
                    :style="dropdownStyle"
                    class="fixed w-52 rounded-md border bg-popover p-3 shadow-md"
                >
                    <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ filter.label }}</p>
                    <div class="space-y-2.5">
                        <div class="space-y-1">
                            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {{ $t('common.yearFrom') }}
                            </label>
                            <input
                                type="number"
                                :value="getYearRangeValue(filter.key).from"
                                :max="getYearRangeValue(filter.key).to || '2100'"
                                min="1900"
                                placeholder="e.g. 2020"
                                class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                @change="setYearRangeFrom(filter.key, ($event.target as HTMLInputElement).value)"
                            />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {{ $t('common.yearTo') }}
                            </label>
                            <input
                                type="number"
                                :value="getYearRangeValue(filter.key).to"
                                :min="getYearRangeValue(filter.key).from || '1900'"
                                max="2100"
                                placeholder="e.g. 2025"
                                class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                @change="setYearRangeTo(filter.key, ($event.target as HTMLInputElement).value)"
                            />
                        </div>
                        <button
                            v-if="isYearRangeActive(filter.key)"
                            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-0.5"
                            @click="clearYearRange(filter.key)"
                        >
                            <X class="h-3 w-3" />
                            {{ $t('common.dateRangeClear') }}
                        </button>
                    </div>
                </div>

                <!-- Single-select dropdown -->
                <div
                    v-else-if="openDropdown === filter.key"
                    :ref="bindPanelRef"
                    :style="dropdownStyle"
                    class="fixed min-w-[10rem] max-w-[16rem] rounded-md border bg-popover shadow-md text-left"
                >
                    <!-- Inline search for searchable dropdowns -->
                    <div v-if="filter.searchable" class="p-1 border-b border-border">
                        <div class="relative">
                            <Search class="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                v-model="dropdownSearch[filter.key]"
                                type="text"
                                :placeholder="$t('common.searchEllipsis')"
                                class="h-7 w-full rounded-sm border border-input bg-background pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                @click.stop
                                @keydown.esc.stop="openDropdown = null"
                            />
                        </div>
                    </div>
                    <!-- Options list -->
                    <div :class="['p-1 overflow-y-auto overflow-x-hidden', filter.searchable ? 'max-h-52' : 'max-h-64']">
                        <button
                            v-for="opt in [{ value: 'all', label: t('common.all') }, ...filteredOptions(filter)]"
                            :key="opt.value"
                            class="flex w-full items-center justify-start text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                            :class="(activeFilters[filter.key] || 'all') === opt.value ? 'font-medium text-foreground' : 'text-muted-foreground'"
                            @click="selectFilter(filter.key, opt.value)"
                        >
                            <span class="min-w-0 break-words">{{ opt.label }}</span>
                        </button>
                    </div>
                </div>
            </Transition>
            </Teleport>
        </div>

        <!-- Extra text-style action (e.g. Save Search) rendered immediately
             before Clear, matching its plain-text look. Distinct from the
             default slot below (which stays right-aligned for e.g. Download
             Data buttons) so adding this doesn't affect other FilterBar usages. -->
        <slot name="before-clear" />

        <!-- Clear filters. No horizontal padding: the parent's `gap-2` already
             spaces flex children, but that gap sits outside a pill button's
             border while it would sit outside this borderless button's own
             padding too — doubling the visible gap. Dropping px-* here keeps
             the gap visually equal to the gap between two bordered pills. -->
        <button
            v-if="hasActiveFilters"
            class="inline-flex items-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            @click="emit('clear')"
        >
            <X class="h-3 w-3" />
            {{ $t('common.clear') }}
        </button>

        <!-- Actions slot (e.g. download button) — pushed to the right -->
        <div v-if="$slots.default" class="ml-auto">
            <slot />
        </div>
    </div>
    </div>
</template>
