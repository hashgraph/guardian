<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
}>();

const emit = defineEmits<{
    'update:currentPage': [page: number];
}>();

const startItem = computed(() => (props.currentPage - 1) * props.pageSize + 1);
const endItem = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems));

const visiblePages = computed(() => {
    const pages: (number | '...')[] = [];
    const total = props.totalPages;
    const current = props.currentPage;

    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < total - 2) pages.push('...');
        pages.push(total);
    }
    return pages;
});
</script>

<template>
    <div class="flex items-center justify-between pt-4">
        <span class="text-xs text-muted-foreground">
            Showing {{ startItem }}–{{ endItem }} of {{ totalItems }}
        </span>

        <div v-if="totalPages > 1" class="flex items-center gap-1">
            <button
                class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors"
                :class="currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted hover:text-foreground'"
                :disabled="currentPage === 1"
                @click="emit('update:currentPage', currentPage - 1)"
            >
                <ChevronLeft class="h-3.5 w-3.5" />
            </button>

            <template v-for="(page, idx) in visiblePages" :key="idx">
                <span v-if="page === '...'" class="px-1 text-xs text-muted-foreground">...</span>
                <button
                    v-else
                    class="flex h-7 min-w-[1.75rem] items-center justify-center rounded-md text-xs font-medium transition-colors"
                    :class="page === currentPage
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
                    @click="emit('update:currentPage', page)"
                >
                    {{ page }}
                </button>
            </template>

            <button
                class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors"
                :class="currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted hover:text-foreground'"
                :disabled="currentPage === totalPages"
                @click="emit('update:currentPage', currentPage + 1)"
            >
                <ChevronRight class="h-3.5 w-3.5" />
            </button>
        </div>
    </div>
</template>
