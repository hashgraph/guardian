import { MOCK_PROJECTS } from '~/data';
import type { Project } from '~/types/models';

export function useProjects(filters?: Ref<{ registry?: string; developer?: string; status?: string; vintage?: string; sector?: string; sectoralScope?: string; search?: string }>) {
    const projects = computed<Project[]>(() => {
        let result = [...MOCK_PROJECTS];
        if (!filters?.value) return result;

        const f = filters.value;
        if (f.registry) result = result.filter(p => p.registry === f.registry);
        if (f.developer) result = result.filter(p => p.developer === f.developer);
        if (f.status) result = result.filter(p => p.status === f.status);
        if (f.vintage) result = result.filter(p => p.vintage === f.vintage);
        if (f.sector) result = result.filter(p => p.sector === f.sector);
        if (f.sectoralScope) result = result.filter(p => p.sectoralScope === f.sectoralScope);
        if (f.search) {
            const q = f.search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.country.toLowerCase().includes(q) ||
                p.methodology.toLowerCase().includes(q) ||
                p.registry.toLowerCase().includes(q),
            );
        }
        return result;
    });

    const total = computed(() => projects.value.length);

    const filterOptions = computed(() => ({
        registries: [...new Set(MOCK_PROJECTS.map(p => p.registry))].sort(),
        developers: [...new Set(MOCK_PROJECTS.map(p => p.developer))].sort(),
        statuses: [...new Set(MOCK_PROJECTS.map(p => p.status))].sort(),
        vintages: [...new Set(MOCK_PROJECTS.map(p => p.vintage))].sort((a, b) => b.localeCompare(a)),
        sectors: [...new Set(MOCK_PROJECTS.map(p => p.sector))].sort(),
        sectoralScopes: [...new Set(MOCK_PROJECTS.map(p => p.sectoralScope))].sort(),
    }));

    return { projects, total, filterOptions };
}
