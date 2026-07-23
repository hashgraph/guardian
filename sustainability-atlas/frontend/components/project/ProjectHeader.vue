<script setup lang="ts">
import {
    FileJson, ExternalLink,
} from 'lucide-vue-next';
import type { Project } from '~/types/models';
import { lifecycleStageColor } from '~/lib/lifecycle';

const props = defineProps<{
    project: Project;
    network: string;
    displayCountry: string;
    displayCountryCode: string;
    hashscanTopicUrl: string;
}>();

const emit = defineEmits<{
    (e: 'view-raw-data'): void;
}>();

const { t } = useI18n();
</script>

<template>
    <div class="space-y-3">
        <!-- Title row -->
        <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
                <div class="flex items-center gap-3 flex-wrap">
                    <h1 class="text-2xl font-bold text-foreground">{{ project.name }}</h1>
                    <span
                        :class="[
                            lifecycleStageColor[project.lifecycleStage ?? ''] || 'bg-muted text-muted-foreground',
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        ]"
                    >
                        {{ $t(`projects.lifecycleStages.${project.lifecycleStage}`) }}
                    </span>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <a
                    v-if="hashscanTopicUrl"
                    :href="hashscanTopicUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    <ExternalLink class="h-4 w-4 text-primary" />
                    {{ $t('common.viewOnExplorer') }}
                </a>
                <button
                    class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    @click="emit('view-raw-data')"
                >
                    <FileJson class="h-4 w-4 text-primary" />
                    {{ $t('common.viewRawData') }}
                </button>
            </div>
        </div>

        <!-- Description (full width, below title and buttons) -->
        <p v-if="project.description" class="text-sm text-muted-foreground leading-relaxed">
            {{ project.description }}
        </p>
    </div>
</template>
