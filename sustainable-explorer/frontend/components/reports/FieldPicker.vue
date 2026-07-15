<script setup lang="ts">
/** ESG reporting field picker: 3 catalog groups with select-all, pills and per-field tooltips. */
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
        .map((group) => ({
            ...group,
            fields: getExportFields(props.dataset).filter((f) => f.group === group.group),
        }))
        .filter((group) => group.fields.length > 0),
);

const allKeys = computed(() => getExportFields(props.dataset).map((f) => f.key));
const allSelected = computed(() => allKeys.value.length > 0 && allKeys.value.every((k) => props.modelValue.includes(k)));

function isSelected(key: string): boolean {
    return props.modelValue.includes(key);
}

function toggle(field: ExportFieldDefinition, checked: boolean) {
    if (field.required) return; // required fields cannot be deselected
    const next = new Set(props.modelValue);
    if (checked) next.add(field.key);
    else next.delete(field.key);
    emit('update:modelValue', [...next]);
}

function toggleAll() {
    emit('update:modelValue', allSelected.value ? [] : [...allKeys.value]);
}

function pillVariant(field: ExportFieldDefinition): 'esg' | 'traceability' | null {
    if (field.group === 'ESG_CLIMATE_DATA') return 'esg';
    if (field.group === 'TRACEABILITY_REFERENCES') return 'traceability';
    return null;
}

// field.labelKey is a namespace prefix holding .label/.description/.tooltip children.
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
    <div class="rounded-xl border bg-card p-5">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-foreground">{{ $t('reports.fieldPicker.title') }}</h3>
            <button
                type="button"
                class="text-xs font-medium text-primary hover:underline"
                @click="toggleAll"
            >
                {{ allSelected ? $t('reports.fieldPicker.deselectAll') : $t('reports.fieldPicker.selectAll') }}
            </button>
        </div>

        <div class="space-y-5">
            <div v-for="group in groups" :key="group.group">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {{ $t(group.labelKey) }}
                </p>
                <div class="divide-y divide-border/60">
                    <div v-for="field in group.fields" :key="field.key" class="flex items-center gap-2">
                        <Checkbox
                            class="flex-1"
                            :model-value="isSelected(field.key)"
                            :disabled="field.required"
                            :label="fieldLabel(field)"
                            :description="fieldDescription(field)"
                            @update:model-value="(v) => toggle(field, v)"
                        >
                            <template v-if="pillVariant(field)" #pill>
                                <Badge
                                    :class="pillVariant(field) === 'esg'
                                        ? 'bg-stat-green/10 text-stat-green border-transparent'
                                        : 'bg-violet-500/10 text-violet-600 border-transparent'"
                                    class="text-[10px] px-1.5 py-0"
                                >
                                    {{ pillVariant(field) === 'esg' ? $t('reports.fieldPicker.esgPill') : $t('reports.fieldPicker.traceabilityPill') }}
                                </Badge>
                            </template>
                        </Checkbox>
                        <InfoTooltip v-if="fieldTooltip(field)" :text="fieldTooltip(field)" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
