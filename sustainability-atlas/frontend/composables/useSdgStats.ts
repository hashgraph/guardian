import type { SdgStats } from '~/types/models';
import { useSdgsApi } from '~/composables/api/useSdgsApi';

export function useSdgStats() {
    const { network } = useNetwork();
    const networkRef = computed(() => network.value);
    const { data, pending, error, failed, refresh } = useSdgsApi({ network: networkRef });

    const sdgStats = computed<SdgStats[]>(() =>
        (data.value?.data ?? []).map(s => ({
            id: s.id,
            name: s.name,
            color: s.color,
            projects: s.projects,
            issuances: s.issuances,
            credits: s.credits,
            developers: s.developers,
            countries: s.countries,
            topMethodology: s.topMethodology ?? '-',
        })),
    );

    const totalProjects = computed(() => data.value?.totalProjects ?? 0);

    return { sdgStats, totalProjects, pending, error, failed, refresh };
}
