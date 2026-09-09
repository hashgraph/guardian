<script setup lang="ts">
/**
 * Topbar help menu — the primary entry point for (re)starting the guided tour.
 *
 * Present on every route for guests and signed-in users alike, so it is the one
 * place a user can always get the tour back. The Glossary sits next to it
 * because "what does this word mean" is the other half of "help".
 *
 * Everything here is event-driven: nothing touches window/document at setup
 * time, so there is no hydration mismatch.
 */
import { onClickOutside } from '@vueuse/core';
import { CircleHelp, Compass, Library } from 'lucide-vue-next';

const open = ref(false);
const menuRef = ref<HTMLElement | null>(null);
onClickOutside(menuRef, () => { open.value = false; });

const { start } = useProductTour();
const router = useRouter();

function onStartTour() {
    open.value = false;
    start();
}

function onGlossary() {
    open.value = false;
    router.push('/glossary');
}
</script>

<template>
    <div ref="menuRef" class="relative flex items-center">
        <button
            data-tour="tour-restart"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            :class="open ? 'bg-muted text-foreground' : ''"
            :aria-label="$t('tour.helpAria')"
            :title="$t('tour.helpMenu')"
            @click="open = !open"
        >
            <CircleHelp class="h-4 w-4" />
        </button>

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
                class="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover p-1 shadow-md"
            >
                <button
                    class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="onStartTour()"
                >
                    <Compass class="h-4 w-4" />
                    <span class="flex-1 text-left">{{ $t('tour.launch') }}</span>
                </button>
                <button
                    class="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="onGlossary()"
                >
                    <Library class="h-4 w-4" />
                    <span class="flex-1 text-left">{{ $t('tour.glossaryLink') }}</span>
                </button>
            </div>
        </Transition>
    </div>
</template>
