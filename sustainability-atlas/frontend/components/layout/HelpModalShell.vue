<script setup lang="ts">
/**
 * Shared shell for the three Help-menu modals (IPFS Fetch, Hashscan Verify,
 * FAQ). Unlike the other Teleport modals in this codebase, the backdrop is
 * deliberately NOT click-to-close and the page scroll is locked while open —
 * closing only happens via the X button or a Cancel action inside the slot.
 */
import { X } from 'lucide-vue-next';

const props = withDefaults(
    defineProps<{
        open: boolean;
        title: string;
        subtitle?: string;
        panelClass?: string;
    }>(),
    { subtitle: undefined, panelClass: 'max-w-lg' },
);
const emit = defineEmits<{ close: [] }>();

useScrollLock(toRef(props, 'open'));
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100"
            leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0"
        >
            <div v-if="open" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
                <div :class="['flex max-h-[85vh] w-full flex-col rounded-lg border bg-background shadow-xl', panelClass]">
                    <div class="flex items-start justify-between gap-4 border-b px-6 py-4">
                        <div class="min-w-0">
                            <h2 class="text-lg font-semibold text-foreground">{{ title }}</h2>
                            <p v-if="subtitle" class="mt-0.5 text-sm text-muted-foreground">{{ subtitle }}</p>
                        </div>
                        <button class="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted" @click="emit('close')">
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <div class="overflow-y-auto px-6 py-4">
                        <slot />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
