interface ComparisonEntry {
    id: string;
    name: string;
}

// Module-level singleton — shared across all component instances
const selectedEntries = ref<ComparisonEntry[]>([]);

export function useProjectComparison() {
    const router = useRouter();

    const selectedIds = computed(() => selectedEntries.value.map(e => e.id));
    const canAdd = computed(() => selectedEntries.value.length < 4);

    function isSelected(id: string): boolean {
        return selectedEntries.value.some(e => e.id === id);
    }

    function toggleProject(id: string, name: string) {
        const idx = selectedEntries.value.findIndex(e => e.id === id);
        if (idx >= 0) {
            selectedEntries.value.splice(idx, 1);
        } else if (selectedEntries.value.length < 4) {
            selectedEntries.value.push({ id, name });
        }
    }

    function removeProject(id: string) {
        const idx = selectedEntries.value.findIndex(e => e.id === id);
        if (idx >= 0) selectedEntries.value.splice(idx, 1);
    }

    function clearAll() {
        selectedEntries.value = [];
    }

    function goToCompare() {
        if (selectedEntries.value.length < 2) return;
        router.push(`/projects/compare?ids=${selectedIds.value.join(',')}`);
    }

    return {
        selectedIds,
        selectedEntries: computed(() => selectedEntries.value),
        canAdd,
        isSelected,
        toggleProject,
        removeProject,
        clearAll,
        goToCompare,
    };
}
