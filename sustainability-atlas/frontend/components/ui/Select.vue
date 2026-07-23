<script setup lang="ts">
import { Check, ChevronDown } from 'lucide-vue-next';
import {
    SelectContent as RekaSelectContent,
    SelectIcon as RekaSelectIcon,
    SelectItem as RekaSelectItem,
    SelectItemIndicator as RekaSelectItemIndicator,
    SelectItemText as RekaSelectItemText,
    SelectPortal as RekaSelectPortal,
    SelectRoot as RekaSelectRoot,
    SelectTrigger as RekaSelectTrigger,
    SelectValue as RekaSelectValue,
    SelectViewport as RekaSelectViewport,
} from 'reka-ui';
import { cn } from '~/lib/utils';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

const props = withDefaults(
    defineProps<{
        options: SelectOption[];
        modelValue?: string;
        placeholder?: string;
        disabled?: boolean;
        class?: string;
        contentClass?: string;
    }>(),
    { modelValue: undefined, placeholder: 'Select…' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
    <RekaSelectRoot
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="(value) => emit('update:modelValue', String(value))"
    >
        <RekaSelectTrigger
            :class="cn(
                'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                props.class,
            )"
        >
            <RekaSelectValue class="truncate data-[placeholder]:text-muted-foreground" :placeholder="placeholder" />
            <RekaSelectIcon as-child>
                <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
            </RekaSelectIcon>
        </RekaSelectTrigger>

        <RekaSelectPortal>
            <RekaSelectContent
                :class="cn(
                    'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
                    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                    props.contentClass,
                )"
                position="popper"
                :side-offset="4"
            >
                <RekaSelectViewport class="p-1">
                    <RekaSelectItem
                        v-for="option in options"
                        :key="option.value"
                        :value="option.value"
                        :disabled="option.disabled"
                        class="relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                        <RekaSelectItemText>{{ option.label }}</RekaSelectItemText>
                        <RekaSelectItemIndicator class="absolute right-2 flex items-center justify-center">
                            <Check class="h-4 w-4" />
                        </RekaSelectItemIndicator>
                    </RekaSelectItem>
                </RekaSelectViewport>
            </RekaSelectContent>
        </RekaSelectPortal>
    </RekaSelectRoot>
</template>
