<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { EXPORT_ROW_CAP } from '~/composables/useApiDownload';

const props = defineProps<{
    open: boolean;
    /** True count of matching records — always exceeds EXPORT_ROW_CAP when this dialog is shown. */
    total: number;
}>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();

const config = useRuntimeConfig();
// apiBaseUrl is intentionally blank on the client in dev (only /api/v1/** is
// proxied via routeRules; /api/docs isn't) — a relative href would resolve
// against the frontend's own origin instead of the API. sseApiBaseUrl is
// this codebase's existing "always absolute, direct-to-API" config value
// (same reasoning EventSource already needs it), so reuse it here too.
const apiDocsUrl = computed(() => `${config.public.sseApiBaseUrl}/api/docs`);

defineExpose({ EXPORT_ROW_CAP });
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
                        <h2 class="text-lg font-semibold text-foreground">
                            {{ $t('exportLimit.title', { limit: EXPORT_ROW_CAP }) }}
                        </h2>
                        <button class="rounded-md p-1 text-muted-foreground hover:bg-muted" @click="emit('cancel')">
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <p class="text-sm text-muted-foreground">
                        {{ $t('exportLimit.body', { total: props.total, limit: EXPORT_ROW_CAP }) }}
                    </p>
                    <p class="mt-2 text-sm text-muted-foreground">
                        {{ $t('exportLimit.apiHint') }}
                        <a :href="apiDocsUrl" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">
                            {{ $t('exportLimit.apiLinkText') }}
                        </a>.
                    </p>

                    <div class="mt-6 flex justify-end gap-2">
                        <button class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted" @click="emit('cancel')">
                            {{ $t('exportLimit.cancel') }}
                        </button>
                        <button
                            class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                            @click="emit('confirm')"
                        >
                            {{ $t('exportLimit.proceed', { limit: EXPORT_ROW_CAP }) }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
