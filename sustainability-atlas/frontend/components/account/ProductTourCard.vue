<script setup lang="ts">
/**
 * Account-page card — the secondary entry point for replaying the guided tour.
 * Users who want to change something look in settings first, and /account is
 * the app's only settings surface.
 */
import { Compass, RotateCcw } from 'lucide-vue-next';

const { start } = useProductTour();
</script>

<template>
    <section class="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-6">
        <div class="flex items-start gap-3">
            <Compass class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
                <h2 class="text-base font-medium text-foreground">{{ $t('tour.restartTitle') }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{{ $t('tour.restartDescription') }}</p>
            </div>
        </div>
        <button
            class="inline-flex shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            @click="start()"
        >
            <RotateCcw class="h-4 w-4" />
            {{ $t('tour.restartButton') }}
        </button>
    </section>
</template>
