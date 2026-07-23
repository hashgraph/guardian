import type { CreditDto } from '~/composables/api/useCreditsApi';

export type CreditWithDisplay = CreditDto & {
    projectDisplay: string | null;
    methodologyDisplay: string | null;
};

/**
 * Format a project label for display. If the project mapper hasn't found a
 * human-readable name (so `displayName` ended up being the cs.id), shorten
 * the urn into something readable while still being unique enough to tell
 * adjacent projects apart. Returns null when no project is linked.
 */
export function displayProject(link: { project: string | null; projectId: string | null }): string | null {
    const name = link.project;
    if (!name) return null;
    if (name === link.projectId && /^urn:uuid:/i.test(name)) {
        const short = name.slice('urn:uuid:'.length, 'urn:uuid:'.length + 8);
        return `Project ${short}`;
    }
    return name;
}

export function useCredits(
    projectKey?: Ref<string | undefined>,
    methodologyId?: Ref<string | undefined>,
    registryDid?: Ref<string | undefined>,
    projectKeys?: Ref<string[] | undefined>,
) {
    const { network } = useNetwork();

    const filters = computed(() => {
        const f: Record<string, string | string[]> = {};
        if (projectKeys?.value?.length) f.projectKey = projectKeys.value;
        else if (projectKey?.value) f.projectKey = projectKey.value;
        if (methodologyId?.value) f.methodologyId = methodologyId.value;
        if (registryDid?.value) f.registryDid = registryDid.value;
        return f;
    });

    const { data, pending } = useCreditsApi({
        page: ref(1),
        limit: ref(500),
        search: ref(''),
        network: network as Ref<string>,
        sortBy: ref(null),
        sortDir: ref(null),
        filters,
    });

    const credits = computed<CreditWithDisplay[]>(() =>
        (data.value?.data ?? []).map(dto => ({
            ...dto,
            projectDisplay: displayProject(dto),
            methodologyDisplay: dto.methodology ?? null,
        })),
    );

    const total = computed(() => data.value?.meta.total ?? 0);

    const filterOptions = computed(() => ({
        types: [...new Set(credits.value.map(c => c.type).filter((t): t is NonNullable<typeof t> => t !== null))].sort(),
        registries: [...new Set(credits.value.map(c => c.registry).filter((r): r is NonNullable<typeof r> => r !== null))].sort(),
    }));

    return { credits, total, filterOptions, pending };
}
