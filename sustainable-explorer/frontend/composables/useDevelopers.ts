import { MOCK_PROJECTS } from '~/data';
import type { Developer } from '~/types/models';
import { formatCredits } from '~/lib/format';

export function useDevelopers(filters?: Ref<{ status?: string; search?: string }>) {
    const developers = computed<Developer[]>(() => {
        // Group projects by developer
        const devMap: Record<string, {
            countries: Set<string>;
            registries: Set<string>;
            categories: Set<string>;
            projects: number;
            credits: number;
            firstCountry: string;
            firstFlag: string;
        }> = {};

        for (const p of MOCK_PROJECTS) {
            if (!devMap[p.developer]) {
                devMap[p.developer] = {
                    countries: new Set(),
                    registries: new Set(),
                    categories: new Set(),
                    projects: 0,
                    credits: 0,
                    firstCountry: p.country,
                    firstFlag: p.flag,
                };
            }
            devMap[p.developer].countries.add(p.countryCode);
            devMap[p.developer].registries.add(p.registry);
            devMap[p.developer].categories.add(p.category);
            devMap[p.developer].projects++;
            devMap[p.developer].credits += p.credits;
        }

        // Developer HQ info (not derivable from projects)
        const hqInfo: Record<string, { country: string; status: 'Active' | 'Inactive' }> = {
            'South Pole': { country: '\u{1F1E8}\u{1F1ED} Switzerland', status: 'Active' },
            'EcoAct': { country: '\u{1F1EB}\u{1F1F7} France', status: 'Active' },
            'Wildlife Works': { country: '\u{1F1FA}\u{1F1F8} United States', status: 'Active' },
            '3Degrees': { country: '\u{1F1FA}\u{1F1F8} United States', status: 'Active' },
            'ClimeCo': { country: '\u{1F1FA}\u{1F1F8} United States', status: 'Active' },
        };

        let result: Developer[] = Object.entries(devMap).map(([name, data], idx) => {
            const hq = hqInfo[name] || { country: `${data.firstFlag} ${data.firstCountry}`, status: 'Active' as const };
            const totalCredits = data.credits;
            // Pseudo retired = ~55% of issued
            const retiredCredits = Math.round(totalCredits * 0.55);

            return {
                id: String(idx + 1),
                name,
                country: hq.country,
                countries: data.countries.size,
                registries: [...data.registries].sort(),
                projects: data.projects,
                totalIssued: formatCredits(totalCredits),
                totalRetired: formatCredits(retiredCredits),
                categories: [...data.categories].sort(),
                status: hq.status,
            };
        });

        // Sort by projects descending
        result.sort((a, b) => b.projects - a.projects);

        // Apply filters
        if (filters?.value) {
            const f = filters.value;
            if (f.status) result = result.filter(d => d.status === f.status);
            if (f.search) {
                const q = f.search.toLowerCase();
                result = result.filter(d =>
                    d.name.toLowerCase().includes(q) ||
                    d.country.toLowerCase().includes(q) ||
                    d.registries.some(r => r.toLowerCase().includes(q)) ||
                    d.categories.some(c => c.toLowerCase().includes(q)),
                );
            }
        }

        return result;
    });

    const total = computed(() => developers.value.length);

    const filterOptions = computed(() => ({
        statuses: ['Active', 'Inactive'] as const,
    }));

    return { developers, total, filterOptions };
}
