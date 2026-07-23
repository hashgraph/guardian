<script setup lang="ts">
import { X } from 'lucide-vue-next';

const props = defineProps<{
    open: boolean;
    summary: { label: string; value: string }[];
    /** Name of an existing saved search whose criteria exactly match the current filters, if any. */
    existingMatchName?: string | null;
}>();
const emit = defineEmits<{ close: []; save: [name: string] }>();

const name = ref('');
const error = ref('');
const saving = ref(false);

watch(() => props.open, (isOpen) => {
    if (isOpen) { name.value = ''; error.value = ''; saving.value = false; }
});

async function onSave() {
    if (!name.value.trim()) return;
    saving.value = true;
    error.value = '';
    emit('save', name.value.trim());
}

// Called by the parent after the save() API call resolves, to show a 409/validation error inline.
defineExpose({
    setError(message: string) { error.value = message; saving.value = false; },
});
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0"
        >
            <div v-if="open" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
                <div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
                    <div class="mb-4 flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-foreground">{{ $t('savedSearch.dialogTitle') }}</h2>
                            <p class="mt-0.5 text-sm text-muted-foreground">{{ $t('savedSearch.dialogSubtitle') }}</p>
                        </div>
                        <button class="rounded-md p-1 text-muted-foreground hover:bg-muted" @click="emit('close')">
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <div v-if="existingMatchName" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        {{ $t('savedSearch.duplicateCriteria', { name: existingMatchName }) }}
                    </div>

                    <template v-else>
                        <label class="text-xs font-medium text-muted-foreground">{{ $t('savedSearch.nameLabel') }}</label>
                        <input
                            v-model="name"
                            maxlength="30"
                            class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            :placeholder="$t('savedSearch.namePlaceholder')"
                            @keydown.enter="onSave"
                        />
                        <div class="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span v-if="error" class="text-destructive">{{ error }}</span>
                            <span class="ml-auto">{{ name.length }}/30</span>
                        </div>
                    </template>

                    <div class="mt-4">
                        <p class="text-xs font-medium text-muted-foreground mb-1.5">{{ $t('savedSearch.summaryTitle') }}</p>
                        <div class="flex flex-wrap gap-1.5 rounded-md bg-muted/40 p-2">
                            <span
                                v-for="item in summary" :key="item.label"
                                class="rounded-md bg-background border px-2 py-0.5 text-[11px] text-foreground"
                            >
                                {{ item.label }}: <strong>{{ item.value }}</strong>
                            </span>
                        </div>
                    </div>

                    <div class="mt-6 flex justify-end gap-2">
                        <button class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted" @click="emit('close')">
                            {{ existingMatchName ? $t('savedSearch.ok') : $t('savedSearch.cancel') }}
                        </button>
                        <button
                            v-if="!existingMatchName"
                            :disabled="!name.trim() || saving"
                            class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                            @click="onSave"
                        >
                            {{ $t('savedSearch.saveButton') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
