<script setup lang="ts">
import { CheckCircle2, Circle, Clock } from 'lucide-vue-next';
import type { Milestone } from '~/types/models';

const props = defineProps<{
    milestones: Milestone[];
    compact?: boolean;
}>();

const { t } = useI18n();

const milestoneLabels = computed<Record<string, string>>(() => ({
    registration: t('projects.milestones.registration'),
    mrvSubmission: t('projects.milestones.mrvSubmission'),
    verification: t('projects.milestones.verification'),
    issuance: t('projects.milestones.issuance'),
}));

function labelFor(m: Milestone): string {
    return milestoneLabels.value[m.key] ?? m.label;
}

function displayDate(m: Milestone): string {
    return m.date ?? t('projects.milestones.tbd');
}

const stateClasses: Record<Milestone['state'], string> = {
    complete: 'text-stat-green bg-stat-green/10',
    current: 'text-primary bg-primary/10',
    expected: 'text-stat-amber bg-stat-amber/10',
    pending: 'text-muted-foreground bg-muted',
};
</script>

<template>
    <div :class="compact ? 'flex items-center gap-1.5' : 'flex items-start'">
        <template v-for="(m, idx) in props.milestones" :key="m.key">
            <!-- Connector -->
            <div
                v-if="idx > 0"
                :class="[
                    compact ? 'h-px w-3 shrink-0' : 'mt-3.5 h-px flex-1 min-w-[16px]',
                    props.milestones[idx - 1].state === 'complete' ? 'bg-stat-green/40' : 'bg-border',
                ]"
            />

            <!-- Step -->
            <div :class="compact ? 'flex items-center gap-1' : 'flex flex-col items-center gap-1.5 px-1'">
                <div
                    :class="[stateClasses[m.state], compact ? 'flex h-5 w-5 items-center justify-center rounded-full' : 'flex h-8 w-8 items-center justify-center rounded-full']"
                    :title="labelFor(m)"
                >
                    <CheckCircle2 v-if="m.state === 'complete'" :class="compact ? 'h-3 w-3' : 'h-4 w-4'" />
                    <Clock v-else-if="m.state === 'current' || m.state === 'expected'" :class="compact ? 'h-3 w-3' : 'h-4 w-4'" />
                    <Circle v-else :class="compact ? 'h-3 w-3' : 'h-4 w-4'" />
                </div>

                <template v-if="!compact">
                    <span class="text-[11px] font-medium text-foreground text-center whitespace-nowrap">{{ labelFor(m) }}</span>
                    <span
                        :class="[
                            'text-[10px] text-center whitespace-nowrap',
                            m.dateType === 'expected' ? 'italic text-stat-amber' : 'text-muted-foreground',
                        ]"
                    >
                        {{ displayDate(m) }}
                        <span v-if="m.dateType === 'expected'">({{ t('projects.milestones.expected') }})</span>
                    </span>
                </template>
            </div>
        </template>
    </div>
</template>
