<script setup lang="ts">
import {
    FileJson, ExternalLink, Loader2,
} from 'lucide-vue-next';
import type { Project } from '~/types/models';
import { lifecycleStageColor } from '~/lib/lifecycle';
import { stripHtml, truncateText } from '~/lib/format';

const props = defineProps<{
    project: Project;
    network: string;
    displayCountry: string;
    displayCountryCode: string;
    hashscanTopicUrl: string;
    loading?: boolean;
}>();

const emit = defineEmits<{
    (e: 'view-raw-data'): void;
}>();

const { t } = useI18n();

// Long descriptions are truncated with
// a show more/less toggle so they don't push the tabs and key facts down.
// Descriptions can arrive as raw HTML from the source CMS — strip it to
// plain text before display (rendered via text interpolation, never v-html).
const DESCRIPTION_TRUNCATE_LENGTH = 320;
const descriptionExpanded = ref(false);

const cleanDescription = computed(() => stripHtml(props.project.description));
const isDescriptionTruncatable = computed(() => cleanDescription.value.length > DESCRIPTION_TRUNCATE_LENGTH);

const displayedDescription = computed(() => descriptionExpanded.value
    ? cleanDescription.value
    : truncateText(cleanDescription.value, DESCRIPTION_TRUNCATE_LENGTH));
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
                    class="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:pointer-events-none"
                    :disabled="loading"
                    @click="emit('view-raw-data')"
                >
                    <Loader2 v-if="loading" class="h-4 w-4 text-primary animate-spin" />
                    <FileJson v-else class="h-4 w-4 text-primary" />
                    {{ $t('common.viewRawData') }}
                </button>
            </div>
        </div>

        <!-- Description (full width, below title and buttons) -->
        <div v-if="cleanDescription" class="text-sm text-muted-foreground leading-relaxed">
            <p class="whitespace-pre-line">{{ displayedDescription }}</p>
            <button
                v-if="isDescriptionTruncatable"
                class="mt-1 text-xs font-medium text-primary hover:underline"
                @click="descriptionExpanded = !descriptionExpanded"
            >
                {{ descriptionExpanded ? $t('common.showLess') : $t('common.showMore') }}
            </button>
        </div>
    </div>
</template>
