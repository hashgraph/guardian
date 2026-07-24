<script setup lang="ts">
/** ESG reporting field picker: fields grouped into Identifiers / ESG Data / Traceability cards, laid out horizontally. */
import type { ExportDataset, ExportFieldDefinition } from '~/types/reports';
import { EXPORT_FIELD_GROUPS, getExportFields } from '~/lib/export-field-catalog';

const props = defineProps<{
    dataset: ExportDataset;
    modelValue: string[];
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

const { t } = useI18n();

const groups = computed(() =>
    [...EXPORT_FIELD_GROUPS]
        .sort((a, b) => a.order - b.order)
        .map((g) => ({ ...g, fields: getExportFields(props.dataset).filter((f) => f.group === g.group) }))
        .filter((g) => g.fields.length > 0),
);

const allKeys = computed(() => getExportFields(props.dataset).map((f) => f.key));
const allSelected = computed(() => allKeys.value.length > 0 && allKeys.value.every((k) => props.modelValue.includes(k)));

function isSelected(key: string): boolean {
    return props.modelValue.includes(key);
}

function toggle(field: ExportFieldDefinition, checked: boolean) {
    if (field.required) return;
    const next = new Set(props.modelValue);
    if (checked) next.add(field.key);
    else next.delete(field.key);
    emit('update:modelValue', [...next]);
}

function toggleAll() {
    emit('update:modelValue', allSelected.value ? [] : [...allKeys.value]);
}

// Accent dot + header tint per group, tying each card to the field-type colour language.
const GROUP_DOT: Record<string, string> = {
    PROJECT_IDENTIFIERS: 'bg-slate-400',
    ESG_CLIMATE_DATA: 'bg-emerald-500',
    TRACEABILITY_REFERENCES: 'bg-purple-500',
};
const GROUP_HEADER_CLASS: Record<string, string> = {
    PROJECT_IDENTIFIERS: 'bg-muted/30 border-border/50',
    ESG_CLIMATE_DATA: 'bg-emerald-500/10 border-emerald-500/20',
    TRACEABILITY_REFERENCES: 'bg-purple-500/15 border-purple-500/25',
};
// Tints the whole Traceability card purple, not just its header.
const GROUP_CARD_CLASS: Record<string, string> = {
    PROJECT_IDENTIFIERS: 'border-border/60 bg-muted/10',
    ESG_CLIMATE_DATA: 'border-border/60 bg-muted/10',
    TRACEABILITY_REFERENCES: 'border-purple-500/25 bg-purple-500/[0.04]',
};

// "Project Identifiers" doesn't fit the Registries dataset (a registry isn't a project).
function groupLabel(group: { group: string; labelKey: string }): string {
    if (group.group === 'PROJECT_IDENTIFIERS' && props.dataset === 'registries') {
        return t('reports.fieldGroups.registryIdentifiers');
    }
    return t(group.labelKey);
}

const fieldLabel = (field: ExportFieldDefinition) => t(`${field.labelKey}.label`);
const fieldDescription = (field: ExportFieldDefinition) => {
    const key = `${field.labelKey}.description`;
    const resolved = t(key);
    return resolved === key ? '' : resolved;
};
const fieldTooltip = (field: ExportFieldDefinition) => {
    const key = `${field.labelKey}.tooltip`;
    const resolved = t(key);
    return resolved === key ? '' : resolved;
};
</script>

<template>
    <div class="rounded-xl border border-border/80 bg-card shadow-sm">
        <div class="flex items-center justify-between gap-4 p-5 border-b border-border/60 bg-muted/20 rounded-t-xl">
            <div>
                <h3 class="text-base font-semibold text-foreground tracking-tight">
                    {{ $t('reports.fieldPicker.title') }}
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                    Select the data points you want to include in your export report.
                </p>
            </div>
            <button
                type="button"
                class="text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors shrink-0"
                @click="toggleAll"
            >
                {{ allSelected ? $t('reports.fieldPicker.deselectAll') : $t('reports.fieldPicker.selectAll') }}
            </button>
        </div>

        <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <section
                v-for="group in groups"
                :key="group.group"
                class="rounded-lg border overflow-hidden"
                :class="GROUP_CARD_CLASS[group.group]"
            >
                <div class="flex items-center gap-2 px-4 py-3 border-b" :class="GROUP_HEADER_CLASS[group.group]">
                    <span class="h-2 w-2 rounded-full shrink-0" :class="GROUP_DOT[group.group]" />
                    <h4 class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {{ groupLabel(group) }}
                    </h4>
                    <span class="ml-auto text-[10px] font-medium text-muted-foreground/60">{{ group.fields.length }}</span>
                </div>

                <div class="p-3 space-y-1">
                    <div
                        v-for="field in group.fields"
                        :key="field.key"
                        :class="isSelected(field.key) ? 'bg-primary/5' : 'hover:bg-muted/40'"
                        class="group flex items-start gap-1.5 rounded-md px-2 py-2 transition-colors"
                    >
                        <Checkbox
                            class="flex-1"
                            :model-value="isSelected(field.key)"
                            :disabled="field.required"
                            :label="fieldLabel(field)"
                            :description="fieldDescription(field)"
                            @update:model-value="(v) => toggle(field, v)"
                        />
                        <InfoTooltip
                            v-if="fieldTooltip(field)"
                            :text="fieldTooltip(field)"
                            class="mt-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>
