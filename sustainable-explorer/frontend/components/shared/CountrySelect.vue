<script setup lang="ts">
import { Search, Check } from 'lucide-vue-next';
import { onClickOutside } from '@vueuse/core';

const props = withDefaults(defineProps<{
    modelValue: string | null;
    placeholder?: string;
    id?: string;
}>(), {
    placeholder: 'Select a country',
    id: undefined,
});

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const { t } = useI18n();

const open = ref(false);
const searchQuery = ref('');
const rootRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

onClickOutside(rootRef, () => {
    open.value = false;
});

const filteredCountries = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
        c => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
});

const displayValue = computed(() => {
    if (!props.modelValue) return '';
    return countryLabel(props.modelValue);
});

function toggle() {
    open.value = !open.value;
    if (open.value) {
        searchQuery.value = '';
        nextTick(() => {
            searchInputRef.value?.focus();
        });
    }
}

function select(code: string) {
    emit('update:modelValue', code);
    open.value = false;
    searchQuery.value = '';
}
</script>

<template>
    <div ref="rootRef" class="relative">
        <!-- Trigger -->
        <button
            :id="id"
            type="button"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary"
            :class="modelValue ? 'text-foreground' : 'text-muted-foreground'"
            @click="toggle()"
        >
            {{ displayValue || placeholder }}
        </button>

        <!-- Dropdown panel -->
        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="open"
                class="absolute z-[60] mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md"
            >
                <!-- Search input -->
                <div class="flex items-center gap-2 border-b px-3 py-2">
                    <Search class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                        ref="searchInputRef"
                        v-model="searchQuery"
                        type="text"
                        class="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        :placeholder="t('country.searchPlaceholder')"
                    />
                </div>

                <!-- Country list -->
                <ul class="max-h-52 overflow-y-auto py-1">
                    <li v-if="filteredCountries.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
                        {{ $t('common.noResults') }}
                    </li>
                    <li
                        v-for="c in filteredCountries"
                        :key="c.code"
                        class="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                        :class="modelValue === c.code ? 'text-foreground font-medium' : 'text-foreground'"
                        @click="select(c.code)"
                    >
                        <span>{{ countryFlag(c.code) }} {{ c.name }}</span>
                        <Check v-if="modelValue === c.code" class="h-3.5 w-3.5 shrink-0 text-primary" />
                    </li>
                </ul>
            </div>
        </Transition>
    </div>
</template>
