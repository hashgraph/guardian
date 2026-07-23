<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { CheckboxIndicator as RekaCheckboxIndicator, CheckboxRoot as RekaCheckboxRoot } from 'reka-ui';
import { cn } from '~/lib/utils';

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
        label?: string;
        description?: string;
        disabled?: boolean;
        id?: string;
        class?: string;
    }>(),
    { modelValue: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
    <label
        :for="id"
        :class="cn(
            'flex items-start gap-3 rounded-md py-1.5 text-sm',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            props.class,
        )"
    >
        <RekaCheckboxRoot
            :id="id"
            :model-value="modelValue"
            :disabled="disabled"
            class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            @update:model-value="(value) => emit('update:modelValue', value === true)"
        >
            <RekaCheckboxIndicator class="flex items-center justify-center text-current">
                <Check class="h-3 w-3" />
            </RekaCheckboxIndicator>
        </RekaCheckboxRoot>

        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex items-center gap-2">
                <span v-if="label" class="font-medium text-foreground">{{ label }}</span>
                <slot name="pill" />
            </span>
            <span v-if="description" class="text-xs text-muted-foreground">{{ description }}</span>
        </span>
    </label>
</template>
