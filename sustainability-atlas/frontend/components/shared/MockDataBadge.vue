<script setup lang="ts">
import { FlaskConical } from 'lucide-vue-next';

interface Props {
  /** Optional clarifying text shown after the "Mock data" label. */
  detail?: string;
  /** When true, render as a compact inline pill. Default false renders as a banner row. */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  detail: '',
  compact: false,
});
</script>

<template>
  <span
    v-if="props.compact"
    class="inline-flex items-center gap-1 rounded-full bg-stat-amber/10 text-stat-amber text-[10px] font-medium px-2 py-0.5 align-middle w-fit"
    :title="props.detail || 'This view is showing placeholder data — not live indexed data.'"
  >
    <FlaskConical class="h-3 w-3" />
    Mock data
  </span>

  <div
    v-else
    class="rounded-lg border border-stat-amber/40 bg-stat-amber/5 px-4 py-2.5 flex items-start gap-2.5 text-sm"
  >
    <FlaskConical class="h-4 w-4 text-stat-amber shrink-0 mt-0.5" />
    <div class="min-w-0">
      <div class="font-medium text-stat-amber">Mock data</div>
      <div class="text-xs text-muted-foreground">
        {{ props.detail || 'This page is currently showing placeholder data, not live indexed data from the Hedera network.' }}
      </div>
    </div>
  </div>
</template>
