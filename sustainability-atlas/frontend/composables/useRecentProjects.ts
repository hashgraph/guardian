import { mapApiProject } from '~/composables/useProjects';
import type { Project } from '~/types/models';

/**
 * Rows requested per page. Wider than the five the feed shows: the API orders
 * by ingestion time while the feed re-sorts by the `createdAt` inside each
 * project's VC, which not every project carries.
 */
const FETCH_WINDOW = 50;

/**
 * The most recently created projects, for the dashboard activity feed.
 *
 * The five shown are the newest within the fetched window, which tracks but
 * does not guarantee the five newest by VC `createdAt`.
 */
export function useRecentProjects(filters?: Ref<{ developer?: string; registry?: string }>) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const query = computed(() => {
        const f = filters?.value ?? {};
        const q: Record<string, string | number> = {
            limit: FETCH_WINDOW,
            page: 1,
            sortBy: 'createdAt',
            sortDir: 'desc',
        };
        if (f.registry && f.registry !== 'All Registries') q.registry = f.registry;
        if (f.developer && f.developer !== 'All Developers') q.developer = f.developer;
        return q;
    });

    const key = computed(() =>
        `recent-projects:${network.value}:${query.value.registry ?? ''}:${query.value.developer ?? ''}`,
    );

    const { data, pending } = useAsyncData<Project[]>(
        key.value,
        () => $fetch<{ data: Record<string, any>[] }>(
            `/api/v1/${network.value}/projects`,
            { baseURL, query: query.value },
        )
            .then(r => (r?.data ?? []).map(mapApiProject))
            .catch(() => []),
        {
            watch: [network, query],
            default: () => [],
        },
    );

    const recentProjects = computed<Project[]>(() => data.value ?? []);

    return { recentProjects, pending };
}
