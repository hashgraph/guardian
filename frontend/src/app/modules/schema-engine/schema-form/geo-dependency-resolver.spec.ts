import {
    getAllCountries,
    getContinentOfCountry,
    getStatesOfCountry
} from '@guardian/interfaces';
import {
    GeoResolverField,
    resolveGeoDependencies
} from './geo-dependency-resolver';

const fields = (
    values: Record<string, string | null>
): GeoResolverField[] => [
    {
        name: 'continent',
        type: 'continent',
        value: values.continent,
    },
    {
        name: 'country',
        type: 'country',
        value: values.country,
        dependency: { on: 'continent', kind: 'geo' },
    },
    {
        name: 'state',
        type: 'state',
        value: values.state,
        dependency: { on: 'country', kind: 'geo' },
    },
];

describe('resolveGeoDependencies', () => {
    it('auto-populates Continent from Country (Scenario 1)', () => {
        const result = resolveGeoDependencies(
            fields({ country: 'CA', continent: null, state: null }),
            'country'
        );
        expect(result.values.continent).toBe('NA');
    });

    it('filters Country from Continent while both stay editable (Scenario 2)', () => {
        const result = resolveGeoDependencies(
            fields({ continent: 'NA', country: null, state: null }),
            'continent'
        );
        const values = result.options.country.map((option) => option.value);
        expect(values).toContain('CA');
        expect(values).toContain('US');
        expect(values).toContain('MX');
        expect(values).not.toContain('DE');
    });

    it('reports conflicting preset values (Scenario 3)', () => {
        const result = resolveGeoDependencies(
            fields({ continent: 'SA', country: 'CA', state: null })
        );
        expect(result.errors.country).toContain('not consistent');
        expect(result.errors.continent).toContain('not consistent');
    });

    it('leaves every value available when no parent is selected (Scenario 4 override)', () => {
        const result = resolveGeoDependencies(
            fields({ continent: null, country: null, state: null })
        );
        expect(result.options.continent.length).toBeGreaterThan(0);
        expect(result.options.country.length).toBeGreaterThan(0);
        expect(result.options.state.length).toBeGreaterThan(0);
    });

    it('filters State and clears it when Country changes (Scenario 5)', () => {
        const initial = resolveGeoDependencies(
            fields({ continent: 'NA', country: 'US', state: null }),
            'country'
        );
        expect(initial.options.state.some(
            (option) => option.value === 'US-CA'
        )).toBeTrue();

        const changed = resolveGeoDependencies(
            fields({ continent: 'NA', country: 'CA', state: 'US-CA' }),
            'country'
        );
        expect(changed.values.state).toBeNull();
        expect(changed.options.state.some(
            (option) => option.value === 'US-CA'
        )).toBeFalse();
    });

    it('auto-populates Country and Continent from an unambiguous State', () => {
        const result = resolveGeoDependencies(
            fields({ continent: null, country: null, state: 'US-CA' }),
            'state'
        );
        expect(result.values.country).toBe('US');
        expect(result.values.continent).toBe('NA');
    });

    it('has no cross-continent ambiguous State values in the bundled dataset', () => {
        const occurrences = new Map<string, string[]>();
        for (const country of getAllCountries()) {
            for (const state of getStatesOfCountry(country.value)) {
                const list = occurrences.get(state.value) || [];
                occurrences.set(state.value, [...list, country.value]);
            }
        }
        const ambiguous = [...occurrences.entries()].find(([, countries]) => {
            const continents = new Set(
                countries.map(getContinentOfCountry)
            );
            return continents.size > 1;
        });
        expect(ambiguous).toBeUndefined();
    });
});
