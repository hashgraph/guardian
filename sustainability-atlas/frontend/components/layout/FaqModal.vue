<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { FAQ_SECTIONS, FAQ_ENTRIES, type FaqSection } from '~/lib/faq-entries';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

const expanded = ref<Record<string, boolean>>({});

function toggle(id: string) {
    expanded.value[id] = !expanded.value[id];
}

function sectionLabel(section: FaqSection): string {
    return t(`faq.sections.${section}`);
}

const groups = computed(() =>
    FAQ_SECTIONS.map(section => ({
        section,
        label: sectionLabel(section),
        entries: FAQ_ENTRIES.filter(e => e.section === section),
    })),
);
</script>

<template>
    <HelpModalShell
        :open="open"
        :title="$t('faq.dialogTitle')"
        :subtitle="$t('faq.dialogSubtitle')"
        panel-class="max-w-3xl"
        @close="emit('close')"
    >
        <div class="rounded-xl border bg-card overflow-hidden">
            <div class="p-5 space-y-6">
                <div v-for="group in groups" :key="group.section">
                    <div class="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
                        {{ group.label }}
                    </div>
                    <div class="border-t divide-y">
                        <div v-for="entry in group.entries" :key="entry.id">
                            <button
                                type="button"
                                class="w-full flex items-start gap-2.5 py-3.5 text-left"
                                @click="toggle(entry.id)"
                            >
                                <ChevronDown
                                    class="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform"
                                    :class="expanded[entry.id] ? 'rotate-180' : ''"
                                />
                                <span class="flex-1 font-medium text-sm text-foreground">
                                    {{ $t(`faq.entries.${entry.id}.question`) }}
                                </span>
                            </button>
                            <div v-if="expanded[entry.id]" class="pb-4 pl-[26px] pr-2 -mt-1">
                                <div class="rounded-lg border bg-muted/30 px-4 py-3">
                                    <p class="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                                        {{ $t(`faq.entries.${entry.id}.answer`) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-4 rounded-lg bg-muted/30 px-4 py-3">
            <p class="text-sm font-medium text-foreground">{{ $t('faq.stillStuck.title') }}</p>
            <p class="mt-1 text-sm text-muted-foreground whitespace-pre-line">{{ $t('faq.stillStuck.body') }}</p>
        </div>

        <div class="mt-6 flex justify-end">
            <button class="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted" @click="emit('close')">
                {{ $t('faq.close') }}
            </button>
        </div>
    </HelpModalShell>
</template>
