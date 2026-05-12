import type { CreditDto } from '~/composables/api/useCreditsApi';

export interface CreditWithProject extends CreditDto {
    project: string;
}

export function useCredits(_filters?: Ref<{ type?: string; registry?: string; search?: string }>) {
    const { network } = useNetwork();

    const { data } = useCreditsApi({
        page: ref(1),
        limit: ref(500),
        search: ref(''),
        network: network as Ref<string>,
        sortBy: ref(null),
        sortDir: ref(null),
    });

    /**
     * Format a project label for display. If the project mapper hasn't found a
     * human-readable name (so `displayName` ended up being the cs.id), shorten
     * the urn into something readable while still being unique enough to tell
     * adjacent projects apart.
     */
    function displayProject(dto: CreditDto): string {
        const name = dto.project;
        if (!name) return 'Unknown Project';
        if (name === dto.projectId && /^urn:uuid:/i.test(name)) {
            const short = name.slice('urn:uuid:'.length, 'urn:uuid:'.length + 8);
            return `Project ${short}`;
        }
        return name;
    }

    const credits = computed<CreditWithProject[]>(() =>
        (data.value?.data ?? []).map(dto => ({
            ...dto,
            project: displayProject(dto),
        })),
    );

    const total = computed(() => data.value?.meta.total ?? 0);

    const filterOptions = computed(() => ({
        types: [...new Set(credits.value.map(c => c.type).filter((t): t is string => t !== null))].sort(),
        registries: [...new Set(credits.value.map(c => c.registry).filter((r): r is string => r !== null))].sort(),
    }));

    return { credits, total, filterOptions };
}
