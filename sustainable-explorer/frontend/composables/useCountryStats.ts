import { MOCK_PROJECTS } from '~/data';
import type { CountryStats, MapPoint, MapCountry } from '~/types/models';
import { formatCredits } from '~/lib/format';

export function useCountryStats() {
    const countries = computed<CountryStats[]>(() => {
        const countryMap: Record<string, CountryStats> = {};

        for (const p of MOCK_PROJECTS) {
            if (!countryMap[p.countryCode]) {
                countryMap[p.countryCode] = {
                    name: p.country,
                    code: p.countryCode,
                    flag: p.flag,
                    lat: p.lat,
                    lng: p.lng,
                    projects: 0,
                    credits: 0,
                    methodologies: 0,
                };
            }
            countryMap[p.countryCode].projects++;
            countryMap[p.countryCode].credits += p.credits;
        }

        // Count unique methodologies per country
        const methByCountry: Record<string, Set<string>> = {};
        for (const p of MOCK_PROJECTS) {
            if (!methByCountry[p.countryCode]) methByCountry[p.countryCode] = new Set();
            methByCountry[p.countryCode].add(p.methodologyId);
        }

        const result = Object.values(countryMap);
        for (const c of result) {
            c.methodologies = methByCountry[c.code]?.size || 0;
        }

        // Sort by projects descending
        result.sort((a, b) => b.projects - a.projects);
        return result;
    });

    const mapCountries = computed<MapCountry[]>(() => {
        return countries.value.map(c => ({
            country: c.name,
            countryCode: c.code,
            projects: c.projects,
            credits: formatCredits(c.credits),
        }));
    });

    const mapPoints = computed<MapPoint[]>(() => {
        return MOCK_PROJECTS.map(p => ({
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            credits: formatCredits(p.credits),
        }));
    });

    return { countries, mapCountries, mapPoints };
}
