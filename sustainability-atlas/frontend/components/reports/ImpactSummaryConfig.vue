<script setup lang="ts">
/** Impact Summary config: output-format tiles + one-click Generate (scope filters deferred). */
import { FileText, Loader2 } from 'lucide-vue-next';
import type { ExportFormat } from '~/types/reports';

const { generateDocument } = useImpactSummaryApi();

const format = ref<ExportFormat>('pdf');
const generating = ref(false);

async function onGenerate() {
    if (generating.value) return;
    generating.value = true;
    try {
        await generateDocument(format.value);
    } finally {
        generating.value = false;
    }
}
</script>

<template>
    <div class="rounded-xl border bg-card p-5 space-y-5">
        <div>
            <h3 class="text-sm font-semibold text-foreground">{{ $t('reports.impactSummary.config.title') }}</h3>
            <p class="text-xs text-muted-foreground mt-1">{{ $t('reports.impactSummary.config.subtitle') }}</p>
        </div>

        <!-- Output format — the shared FormatPicker (card-less here) -->
        <FormatPicker bare :model-value="format" :title="$t('reports.impactSummary.config.outputFormat')" @update:model-value="format = $event" />

        <Button class="w-full" :disabled="generating" @click="onGenerate">
            <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
            <FileText v-else class="h-4 w-4" />
            {{ generating ? $t('reports.impactSummary.config.generating') : $t('reports.impactSummary.config.generate') }}
        </Button>
    </div>
</template>
