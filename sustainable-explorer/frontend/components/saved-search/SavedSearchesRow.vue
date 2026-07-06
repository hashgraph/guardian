<script setup lang="ts">
import { useSavedSearches, type SavedSearchCriteria } from '~/composables/useSavedSearches';
import SaveSearchDialog from './SaveSearchDialog.vue';

const props = defineProps<{
    section: 'projects' | 'methodologies' | 'issuances';
    searchQuery: string;
    activeFilters: Record<string, string>;
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc' | null;
    summary: { label: string; value: string }[];
}>();

const emit = defineEmits<{ apply: [criteria: SavedSearchCriteria] }>();

const { isAuthenticated } = useAuth();
const { network } = useNetwork();
const { savedSearches, fetchAll, save, remove } = useSavedSearches(props.section);

onMounted(fetchAll);
// Re-fetch if the user logs in while already on the page.
watch(isAuthenticated, (v) => { if (v) fetchAll(); });
// Re-fetch when the Mainnet/Testnet selection changes — saved searches are
// network-scoped, and switching networks doesn't remount this component
// (useNetwork().setNetwork() only does a router.replace with a new query).
watch(network, () => { if (isAuthenticated.value) fetchAll(); });

const hasActiveFilters = computed(() =>
    !!props.searchQuery.trim() || Object.values(props.activeFilters).some(v => v && v !== 'all'),
);

function currentCriteria(): SavedSearchCriteria {
    return {
        search: props.searchQuery || undefined,
        filters: { ...props.activeFilters },
        sort: props.sortKey && props.sortDir ? { key: props.sortKey, dir: props.sortDir } : undefined,
    };
}

// Order-independent comparisons — jsonb doesn't preserve object key order on
// a DB round trip, and even in-session two identical filter selections can
// end up with keys inserted in a different order, so JSON.stringify() on the
// raw objects is not a safe equality check here.
function filtersMatch(a: Record<string, string>, b: Record<string, string>): boolean {
    const isSet = (v: string | undefined) => !!v && v !== 'all';
    const aKeys = Object.keys(a).filter(k => isSet(a[k]));
    const bKeys = Object.keys(b).filter(k => isSet(b[k]));
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(k => a[k] === b[k]);
}

function sortMatches(
    a: SavedSearchCriteria['sort'],
    b: SavedSearchCriteria['sort'],
): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.key === b.key && a.dir === b.dir;
}

function criteriaMatches(a: SavedSearchCriteria, b: SavedSearchCriteria): boolean {
    return (a.search || '') === (b.search || '')
        && filtersMatch(a.filters, b.filters)
        && sortMatches(a.sort, b.sort);
}

const activeSearch = computed(() =>
    savedSearches.value.find(s => criteriaMatches(s.criteria, currentCriteria())),
);

const dialogOpen = ref(false);
const dialogRef = ref<InstanceType<typeof SaveSearchDialog> | null>(null);

async function onSaveConfirmed(name: string) {
    const result = await save(name, currentCriteria());
    if (typeof result === 'string') {
        dialogRef.value?.setError(result);
    } else {
        dialogOpen.value = false;
    }
}

function onSelect(search: (typeof savedSearches.value)[number]) {
    emit('apply', search.criteria);
}

// The "Save Search" trigger button lives in the parent's FilterBar row (same
// row as the search input), not here — this component only owns the tag list
// + active label + dialog. The parent opens the dialog via this template ref.
defineExpose({
    open() { dialogOpen.value = true; },
    hasActiveFilters,
});
</script>

<template>
    <div class="flex items-center gap-2 flex-wrap">
        <template v-if="isAuthenticated">
            <SavedSearchTag
                v-for="s in savedSearches" :key="s.id"
                :label="s.name"
                :active="!!activeSearch && activeSearch.id === s.id"
                @select="onSelect(s)"
                @remove="remove(s.id)"
            />
        </template>

        <SaveSearchDialog
            v-if="isAuthenticated"
            ref="dialogRef"
            :open="dialogOpen"
            :summary="summary"
            :existing-match-name="activeSearch?.name ?? null"
            @close="dialogOpen = false"
            @save="onSaveConfirmed"
        />
    </div>
    <p v-if="activeSearch" class="mt-1 text-[11px] text-muted-foreground">
        {{ $t('savedSearch.activeLabel') }}: <strong class="text-foreground">{{ activeSearch.name }}</strong>
    </p>
</template>
