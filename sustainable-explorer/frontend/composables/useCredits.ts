import { MOCK_CREDITS, MOCK_PROJECTS } from '~/data';
import type { Credit } from '~/types/models';

export interface CreditWithProject extends Credit {
    project: string;
}

export function useCredits(filters?: Ref<{ type?: string; registry?: string; search?: string }>) {
    const projectMap = computed(() => {
        const map: Record<string, string> = {};
        for (const p of MOCK_PROJECTS) {
            map[p.id] = p.name;
        }
        return map;
    });

    const credits = computed<CreditWithProject[]>(() => {
        let result: CreditWithProject[] = MOCK_CREDITS.map(c => ({
            ...c,
            project: projectMap.value[c.projectId] || 'Unknown Project',
        }));

        if (!filters?.value) return result;

        const f = filters.value;
        if (f.type) result = result.filter(c => c.type === f.type);
        if (f.registry) result = result.filter(c => c.registry === f.registry);
        if (f.search) {
            const q = f.search.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.symbol.toLowerCase().includes(q) ||
                c.tokenId.toLowerCase().includes(q) ||
                c.project.toLowerCase().includes(q) ||
                c.registry.toLowerCase().includes(q),
            );
        }
        return result;
    });

    const total = computed(() => credits.value.length);

    const filterOptions = computed(() => ({
        types: [...new Set(MOCK_CREDITS.map(c => c.type))].sort(),
        registries: [...new Set(MOCK_CREDITS.map(c => c.registry))].sort(),
    }));

    return { credits, total, filterOptions };
}
