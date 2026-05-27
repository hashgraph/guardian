<script setup lang="ts">
import {
    ArrowLeft, FileJson, ExternalLink,
} from 'lucide-vue-next';
import type { Project } from '~/types/models';

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

const statusColor: Record<string, { bg: string; text: string; dot: string }> = {
    Registered: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
    'Under Validation': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    Verified: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    Issuing: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Completed: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
};
</script>

<template>
    <div class="space-y-3">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <NuxtLink to="/projects" class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                <ArrowLeft class="h-3.5 w-3.5" />
                Projects
            </NuxtLink>
            <span>/</span>
            <span class="text-foreground truncate max-w-[320px]">{{ project.name }}</span>
        </div>

        <!-- Title row -->
        <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
                <div class="flex items-center gap-3 flex-wrap">
                    <h1 class="text-2xl font-bold text-foreground">{{ project.name }}</h1>
                    <span
                        :class="[
                            statusColor[project.status]?.bg ?? 'bg-muted',
                            statusColor[project.status]?.text ?? 'text-muted-foreground',
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        ]"
                    >
                        <span :class="[statusColor[project.status]?.dot ?? 'bg-muted-foreground', 'h-1.5 w-1.5 rounded-full']" />
                        {{ project.status }}
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
