<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onClickOutside, useDebounceFn } from '@vueuse/core';
import { ChevronDown, X } from 'lucide-vue-next';

export type FilterFieldType =
    | 'text'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'daterange'
    | 'boolean'
    | 'custom';

export interface FilterFieldOption {
    value: string;
    label: string;
}

export interface FilterField {
    key: string;
    label: string;
    type: FilterFieldType;
    placeholder?: string;
    helpText?: string;
    width?: 'sm' | 'md' | 'lg' | 'auto';
    required?: boolean;
    options?: FilterFieldOption[];
    debounce?: number;
    defaultValue?: any;
    visible?: (filters: Record<string, any>) => boolean;
}

interface Props {
    fields: FilterField[];
    modelValue: Record<string, any>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:modelValue': [filters: Record<string, any>];
    'clear': [];
}>();

// Local buffered copy of the filters used for text/number inputs so the
// user can type freely without each keystroke triggering a fetch. Non-debounced
// types (select, date, checkbox) commit directly.
const localText = ref<Record<string, any>>({});

// Initialize local text state from modelValue
function syncLocalFromModel() {
    for (const field of props.fields) {
        if (field.type === 'text' || field.type === 'number') {
            localText.value[field.key] = props.modelValue[field.key] ?? '';
        }
    }
}
syncLocalFromModel();

watch(
    () => props.modelValue,
    (val) => {
        for (const field of props.fields) {
            if (field.type === 'text' || field.type === 'number') {
                const incoming = val[field.key] ?? '';
                if (localText.value[field.key] !== incoming) {
                    localText.value[field.key] = incoming;
                }
            }
        }
    },
    { deep: true },
);

function commit(key: string, value: any) {
    const next = { ...props.modelValue, [key]: value };
    emit('update:modelValue', next);
}

// Create one debounced committer per text/number field, respecting the
// per-field debounce setting.
const debouncedCommitters = computed(() => {
    const map: Record<string, (v: any) => void> = {};
    for (const field of props.fields) {
        if (field.type === 'text' || field.type === 'number') {
            const ms = field.debounce ?? 300;
            map[field.key] = useDebounceFn((v: any) => commit(field.key, v), ms);
        }
    }
    return map;
});

function onTextInput(field: FilterField, e: Event) {
    const target = e.target as HTMLInputElement;
    const raw = target.value;
    const value = field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
    localText.value[field.key] = value;
    debouncedCommitters.value[field.key]?.(value === '' ? '' : value);
}

function onSelect(field: FilterField, e: Event) {
    const target = e.target as HTMLSelectElement;
    commit(field.key, target.value);
}

function onDate(field: FilterField, e: Event) {
    const target = e.target as HTMLInputElement;
    commit(field.key, target.value);
}

function onDateRange(field: FilterField, which: 'from' | 'to', e: Event) {
    const target = e.target as HTMLInputElement;
    const current = props.modelValue[field.key] ?? { from: '', to: '' };
    commit(field.key, { ...current, [which]: target.value });
}

function onCheckbox(field: FilterField, e: Event) {
    const target = e.target as HTMLInputElement;
    commit(field.key, target.checked);
}

// --- Select popover state ---
const openSelect = ref<string | null>(null);
const selectRefs = ref<Record<string, HTMLElement | null>>({});

function setSelectRef(key: string) {
    return (el: any) => {
        selectRefs.value[key] = (el as HTMLElement) ?? null;
    };
}

function toggleSelect(key: string) {
    openSelect.value = openSelect.value === key ? null : key;
}

function selectOption(field: FilterField, value: string) {
    commit(field.key, value);
    openSelect.value = null;
}

function selectLabel(field: FilterField): string {
    const current = props.modelValue[field.key];
    if (!current) return field.placeholder || field.label;
    return field.options?.find(o => o.value === current)?.label ?? (field.placeholder || field.label);
}

watch(openSelect, (key) => {
    if (!key) return;
    const el = selectRefs.value[key];
    if (!el) return;
    const stop = onClickOutside(el, () => {
        if (openSelect.value === key) openSelect.value = null;
        stop();
    });
});

// --- Multiselect popover state ---
const openMultiselect = ref<string | null>(null);
const multiselectRefs = ref<Record<string, HTMLElement | null>>({});

function setMultiselectRef(key: string) {
    return (el: any) => {
        multiselectRefs.value[key] = (el as HTMLElement) ?? null;
    };
}

function toggleMultiselect(key: string) {
    openMultiselect.value = openMultiselect.value === key ? null : key;
}

function isMultiselectChecked(field: FilterField, optionValue: string): boolean {
    const current = props.modelValue[field.key];
    return Array.isArray(current) && current.includes(optionValue);
}

function toggleMultiselectOption(field: FilterField, optionValue: string) {
    const current = Array.isArray(props.modelValue[field.key])
        ? [...props.modelValue[field.key]]
        : [];
    const idx = current.indexOf(optionValue);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(optionValue);
    commit(field.key, current);
}

function multiselectLabel(field: FilterField): string {
    const current = props.modelValue[field.key];
    if (Array.isArray(current) && current.length > 0) {
        return `${field.label} (${current.length})`;
    }
    return field.placeholder || field.label;
}

// Close any open multiselect on outside click
watch(openMultiselect, (key) => {
    if (!key) return;
    const el = multiselectRefs.value[key];
    if (!el) return;
    const stop = onClickOutside(el, () => {
        if (openMultiselect.value === key) openMultiselect.value = null;
        stop();
    });
});

// Escape to close multiselect
if (import.meta.client) {
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (openMultiselect.value) openMultiselect.value = null;
            if (openSelect.value) openSelect.value = null;
        }
    };
    window.addEventListener('keydown', onKey);
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}

// --- Visibility / width helpers ---
const visibleFields = computed(() =>
    props.fields.filter((f) => (f.visible ? f.visible(props.modelValue) : true)),
);

function widthClass(field: FilterField): string {
    switch (field.width) {
        case 'sm':
            return 'w-32';
        case 'md':
            return 'w-48';
        case 'lg':
            return 'w-64';
        case 'auto':
        default:
            return 'w-auto flex-1 min-w-[10rem]';
    }
}

// Visual active-state markers — mirror FilterBar's chip pattern so a populated
// filter input gets the same primary-tint border + background across the app.
// Reads `localText` for text/number (so the highlight tracks what the user
// sees, not the debounced value) and falls through to modelValue elsewhere.
function isFieldActive(field: FilterField): boolean {
    if (field.type === 'text' || field.type === 'number') {
        return !isEmpty(localText.value[field.key]);
    }
    return !isEmpty(props.modelValue[field.key]);
}

function fieldActiveClass(field: FilterField): string {
    return isFieldActive(field)
        ? 'border-primary/40 bg-primary/5 text-primary'
        : 'border-input bg-background text-foreground';
}

// --- Active filters / clear ---
function isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') {
        // daterange: empty if both from and to are empty
        return Object.values(value).every((v) => v === '' || v === null || v === undefined);
    }
    if (typeof value === 'boolean') return value === false;
    return false;
}

const activeCount = computed(() => {
    let n = 0;
    for (const field of props.fields) {
        if (!isEmpty(props.modelValue[field.key])) n++;
    }
    return n;
});

function clearAll() {
    const next: Record<string, any> = {};
    for (const field of props.fields) {
        if (field.defaultValue !== undefined) {
            next[field.key] = field.defaultValue;
        } else if (field.type === 'multiselect') {
            next[field.key] = [];
        } else if (field.type === 'boolean') {
            next[field.key] = false;
        } else if (field.type === 'daterange') {
            next[field.key] = { from: '', to: '' };
        } else {
            next[field.key] = '';
        }
    }
    // refresh local buffered state too
    for (const field of props.fields) {
        if (field.type === 'text' || field.type === 'number') {
            localText.value[field.key] = next[field.key] ?? '';
        }
    }
    emit('update:modelValue', next);
    emit('clear');
}
</script>

<template>
    <div class="flex flex-wrap items-end gap-3">
        <template v-for="field in visibleFields" :key="field.key">
            <div :class="['flex flex-col gap-1', widthClass(field)]">
                <label
                    :for="`filter-${field.key}`"
                    class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                >
                    {{ field.label }}
                    <span v-if="field.helpText" :title="field.helpText" class="ml-1 cursor-help">?</span>
                </label>

                <!-- text -->
                <input
                    v-if="field.type === 'text'"
                    :id="`filter-${field.key}`"
                    type="text"
                    :placeholder="field.placeholder"
                    :value="localText[field.key] ?? ''"
                    :aria-label="field.label"
                    :class="['h-8 w-full rounded-md border px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors', fieldActiveClass(field)]"
                    @input="onTextInput(field, $event)"
                />

                <!-- number -->
                <input
                    v-else-if="field.type === 'number'"
                    :id="`filter-${field.key}`"
                    type="number"
                    :placeholder="field.placeholder"
                    :value="localText[field.key] ?? ''"
                    :aria-label="field.label"
                    :class="['h-8 w-full rounded-md border px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors', fieldActiveClass(field)]"
                    @input="onTextInput(field, $event)"
                />

                <!-- select (custom popover so long values wrap instead of scrolling) -->
                <div
                    v-else-if="field.type === 'select'"
                    :ref="setSelectRef(field.key)"
                    class="relative"
                >
                    <button
                        type="button"
                        :aria-label="field.label"
                        :aria-expanded="openSelect === field.key"
                        :class="['flex h-8 w-full items-center justify-between rounded-md border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-colors', fieldActiveClass(field)]"
                        @click="toggleSelect(field.key)"
                    >
                        <span class="truncate">{{ selectLabel(field) }}</span>
                        <ChevronDown class="ml-1 h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                    <div
                        v-if="openSelect === field.key"
                        class="absolute z-20 mt-1 w-full min-w-[12rem] max-h-60 overflow-y-auto overflow-x-hidden rounded-md border border-input bg-popover p-1 shadow-md"
                    >
                        <button
                            type="button"
                            class="flex w-full items-center justify-start rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                            @click="selectOption(field, '')"
                        >
                            {{ field.placeholder || $t('common.all') }}
                        </button>
                        <button
                            v-for="opt in field.options || []"
                            :key="opt.value"
                            type="button"
                            class="flex w-full items-start justify-start text-left rounded px-2 py-1 text-xs hover:bg-muted/50"
                            :class="(modelValue[field.key] ?? '') === opt.value ? 'font-medium text-foreground' : 'text-muted-foreground'"
                            @click="selectOption(field, opt.value)"
                        >
                            <span class="min-w-0 break-words text-left">{{ opt.label }}</span>
                        </button>
                        <div v-if="!(field.options && field.options.length)" class="px-2 py-1 text-xs text-muted-foreground">
                            {{ $t('common.noOptions') }}
                        </div>
                    </div>
                </div>

                <!-- multiselect -->
                <div
                    v-else-if="field.type === 'multiselect'"
                    :ref="setMultiselectRef(field.key)"
                    class="relative"
                >
                    <button
                        type="button"
                        :aria-label="field.label"
                        :aria-expanded="openMultiselect === field.key"
                        :class="['flex h-8 w-full items-center justify-between rounded-md border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-colors', fieldActiveClass(field)]"
                        @click="toggleMultiselect(field.key)"
                    >
                        <span class="truncate">{{ multiselectLabel(field) }}</span>
                        <ChevronDown class="ml-1 h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                    <div
                        v-if="openMultiselect === field.key"
                        class="absolute z-20 mt-1 w-full min-w-[12rem] max-h-60 overflow-auto rounded-md border border-input bg-popover p-1 shadow-md"
                    >
                        <label
                            v-for="opt in field.options || []"
                            :key="opt.value"
                            class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-foreground hover:bg-muted/50"
                        >
                            <input
                                type="checkbox"
                                :checked="isMultiselectChecked(field, opt.value)"
                                class="h-3.5 w-3.5 rounded border-input"
                                @change="toggleMultiselectOption(field, opt.value)"
                            />
                            <span>{{ opt.label }}</span>
                        </label>
                        <div v-if="!(field.options && field.options.length)" class="px-2 py-1 text-xs text-muted-foreground">
                            {{ $t('common.noOptions') }}
                        </div>
                    </div>
                </div>

                <!-- date -->
                <input
                    v-else-if="field.type === 'date'"
                    :id="`filter-${field.key}`"
                    type="date"
                    :value="modelValue[field.key] ?? ''"
                    :aria-label="field.label"
                    class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    @change="onDate(field, $event)"
                />

                <!-- daterange -->
                <div v-else-if="field.type === 'daterange'" class="flex items-center gap-1">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-muted-foreground">{{ $t('common.from') }}</span>
                        <input
                            type="date"
                            :value="(modelValue[field.key] && modelValue[field.key].from) || ''"
                            :aria-label="`${field.label} from`"
                            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            @change="onDateRange(field, 'from', $event)"
                        />
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] text-muted-foreground">{{ $t('common.to') }}</span>
                        <input
                            type="date"
                            :value="(modelValue[field.key] && modelValue[field.key].to) || ''"
                            :aria-label="`${field.label} to`"
                            class="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            @change="onDateRange(field, 'to', $event)"
                        />
                    </div>
                </div>

                <!-- boolean -->
                <label
                    v-else-if="field.type === 'boolean'"
                    class="flex h-8 items-center gap-2 text-xs text-foreground"
                >
                    <input
                        :id="`filter-${field.key}`"
                        type="checkbox"
                        :checked="!!modelValue[field.key]"
                        :aria-label="field.label"
                        class="h-3.5 w-3.5 rounded border-input"
                        @change="onCheckbox(field, $event)"
                    />
                    <span class="text-muted-foreground">{{ field.placeholder || $t('common.enabled') }}</span>
                </label>

                <!-- custom -->
                <slot
                    v-else-if="field.type === 'custom'"
                    :name="`field-${field.key}`"
                    :field="field"
                    :value="modelValue[field.key]"
                    :set-value="(v: any) => commit(field.key, v)"
                />
            </div>
        </template>

        <!-- Active-count + clear styled to match FilterBar's clear chip so the
             two filter shells visually rhyme across the app. -->
        <div v-if="activeCount > 0" class="flex items-center gap-2 pb-0.5">
            <span class="text-[11px] text-muted-foreground">{{ $t('common.activeCount', { count: activeCount }) }}</span>
            <button
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                @click="clearAll"
            >
                <X class="h-3 w-3" />
                {{ $t('common.clearAll') }}
            </button>
        </div>
    </div>
</template>
