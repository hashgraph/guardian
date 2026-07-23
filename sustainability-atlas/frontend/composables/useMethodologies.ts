import { MOCK_PROJECTS } from '~/data';
import type { Methodology } from '~/types/models';
import { formatCredits } from '~/lib/format';
import { METHODOLOGY_NAMES } from '~/lib/methodologies';

export function useMethodologies(filters?: Ref<{ registry?: string; category?: string; search?: string }>) {
    const methodologies = computed<Methodology[]>(() => {
        // Group projects by methodologyId
        const methMap: Record<string, { name: string; registry: string; category: string; projects: number; credits: number }> = {};

        for (const p of MOCK_PROJECTS) {
            if (!methMap[p.methodologyId]) {
                methMap[p.methodologyId] = {
                    name: p.methodology,
                    registry: p.registry,
                    category: p.category,
                    projects: 0,
                    credits: 0,
                };
            }
            methMap[p.methodologyId].projects++;
            methMap[p.methodologyId].credits += p.credits;
        }

        const nameOverrides = METHODOLOGY_NAMES;

        // Schema count pseudo-derived from project count
        const schemaBase: Record<string, number> = {
            'vm0007': 14, 'vm0033': 8, 'gs-cookstove': 11, 'gs-sdw': 7,
            'acm0002': 9, 'vm0044': 6, 'acm0001': 5, 'acm0006': 7,
            'vm0036': 5, 'ar-acm0003': 8, 'gs-clean-energy': 9,
        };

        let result: Methodology[] = Object.entries(methMap).map(([id, data], idx) => ({
            id: String(idx + 1),
            name: nameOverrides[id] || data.name,
            registry: data.registry,
            category: data.category,
            projects: data.projects,
            credits: formatCredits(data.credits),
            schemas: schemaBase[id] || Math.max(3, data.projects + 2),
        }));

        // Apply filters
        if (filters?.value) {
            const f = filters.value;
            if (f.registry) result = result.filter(m => m.registry === f.registry);
            if (f.category) result = result.filter(m => m.category === f.category);
            if (f.search) {
                const q = f.search.toLowerCase();
                result = result.filter(m =>
                    m.name.toLowerCase().includes(q) ||
                    m.registry.toLowerCase().includes(q) ||
                    m.category.toLowerCase().includes(q),
                );
            }
        }

        return result;
    });

    const total = computed(() => methodologies.value.length);

    const filterOptions = computed(() => ({
        registries: [...new Set(MOCK_PROJECTS.map(p => p.registry))].sort(),
        categories: [...new Set(MOCK_PROJECTS.map(p => p.category))].sort(),
    }));

    return { methodologies, total, filterOptions };
}
