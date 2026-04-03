import { SDG_LIST } from '~/lib/sdgs';
import { MOCK_PROJECTS } from '~/data';
import type { SdgStats } from '~/types/models';
import { formatCredits } from '~/lib/format';

export function useSdgStats() {
    const sdgStats = computed<SdgStats[]>(() => {
        return SDG_LIST.map(sdg => {
            const matchingProjects = MOCK_PROJECTS.filter(p => p.sdgs.includes(sdg.id));
            const totalCredits = matchingProjects.reduce((sum, p) => sum + p.credits, 0);
            const uniqueDevelopers = new Set(matchingProjects.map(p => p.developer)).size;
            const uniqueCountries = new Set(matchingProjects.map(p => p.countryCode)).size;

            // Find top methodology by credit volume
            const methCredits: Record<string, number> = {};
            for (const p of matchingProjects) {
                methCredits[p.methodology] = (methCredits[p.methodology] || 0) + p.credits;
            }
            const topMethodology = Object.entries(methCredits)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

            return {
                id: sdg.id,
                name: sdg.name,
                color: sdg.color,
                projects: matchingProjects.length,
                credits: totalCredits,
                developers: uniqueDevelopers,
                countries: uniqueCountries,
                topMethodology,
            };
        });
    });

    const totalProjects = computed(() => MOCK_PROJECTS.length);

    return { sdgStats, totalProjects };
}
