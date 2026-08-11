import type { CreditDto, CreditSortKey, CreditSortDir } from '~/composables/api/useCreditsApi';

export type CreditWithDisplay = CreditDto & {
    projectDisplay: string | null;
    methodologyDisplay: string | null;
};

export interface CreditScope {
    projectKey?: Ref<string | undefined>;
    methodologyId?: Ref<string | undefined>;
    registryDid?: Ref<string | undefined>;
    projectKeys?: Ref<string[] | undefined>;
}

export interface UseCreditsOptions extends CreditScope {
    page: Ref<number>;
    limit: Ref<number>;
    search: Ref<string>;
    sortBy: Ref<CreditSortKey | null>;
    sortDir: Ref<CreditSortDir | null>;
    /** Column filters applied by the API: type, registry, supplyMin/Max, mintDateFrom/To. */
    filters?: Ref<Record<string, string | string[]>>;
}

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

/** Server-paginated issuance list. Search, filtering, sorting and paging are applied by the API. */
export function useCredits(opts: UseCreditsOptions) {
    const { network } = useNetwork();

    const filters = computed(() => {
        const f: Record<string, string | string[]> = { ...(opts.filters?.value ?? {}) };
        if (opts.projectKeys?.value?.length) f.projectKey = opts.projectKeys.value;
        else if (opts.projectKey?.value) f.projectKey = opts.projectKey.value;
        if (opts.methodologyId?.value) f.methodologyId = opts.methodologyId.value;
        if (opts.registryDid?.value) f.registryDid = opts.registryDid.value;
        return f;
    });

    const { data, pending } = useCreditsApi({
        page: opts.page,
        limit: opts.limit,
        search: opts.search,
        network: network as Ref<string>,
        sortBy: opts.sortBy,
        sortDir: opts.sortDir,
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
    const totalPages = computed(() => data.value?.meta.totalPages ?? 1);

    return { credits, total, totalPages, pending, filters };
}
