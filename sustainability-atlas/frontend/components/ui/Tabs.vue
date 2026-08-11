<script setup lang="ts">
import { TabsContent as RekaTabsContent, TabsList as RekaTabsList, TabsRoot as RekaTabsRoot, TabsTrigger as RekaTabsTrigger } from 'reka-ui';
import { cn } from '~/lib/utils';

export interface TabItem {
    value: string;
    label: string;
    disabled?: boolean;
}

const props = withDefaults(
    defineProps<{
        tabs: TabItem[];
        modelValue?: string;
        class?: string;
        listClass?: string;
    }>(),
    { modelValue: undefined },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
    <RekaTabsRoot
        :model-value="modelValue"
        :class="cn('w-full', props.class)"
        @update:model-value="(value) => emit('update:modelValue', String(value))"
    >
        <RekaTabsList
            :class="cn(
                'inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
                props.listClass,
            )"
        >
            <RekaTabsTrigger
                v-for="tab in tabs"
                :key="tab.value"
                :value="tab.value"
                :disabled="tab.disabled"
                class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:text-foreground"
            >
                {{ tab.label }}
            </RekaTabsTrigger>
        </RekaTabsList>

        <RekaTabsContent
            v-for="tab in tabs"
            :key="tab.value"
            :value="tab.value"
            class="mt-4 focus-visible:outline-none"
        >
            <slot :name="tab.value" />
        </RekaTabsContent>
    </RekaTabsRoot>
</template>
