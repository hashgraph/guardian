import assert from 'node:assert/strict';
import {
    getAllContinents,
    getAllCountries,
    getContinentOfCountry,
    getCountriesOfContinent,
    getCountriesOfState,
    getStatesOfCountry,
    isAncestorType,
    isContinent,
    isCountry,
    isGeoCustomType,
    relationAncestors,
} from '../dist/index.js';

describe('geo-data', () => {
    it('enumerates the bundled countries and continents', () => {
        assert.ok(getAllCountries().length > 0);
        assert.ok(getAllContinents().length > 0);
        assert.equal(isCountry('CA'), true);
        assert.equal(isContinent('NA'), true);
    });

    it('resolves Country to Continent (Scenario 1)', () => {
        assert.equal(getContinentOfCountry('CA'), 'NA');
    });

    it('filters countries by Continent (Scenario 2)', () => {
        const countries = getCountriesOfContinent('NA');
        assert.ok(countries.includes('CA'));
        assert.ok(countries.includes('US'));
        assert.ok(countries.includes('MX'));
        assert.ok(!countries.includes('DE'));
    });

    it('returns only the selected country states (Scenarios 4 and 5)', () => {
        const usStates = getStatesOfCountry('US');
        const caStates = getStatesOfCountry('CA');
        assert.ok(usStates.length > 0);
        assert.ok(caStates.length > 0);
        assert.ok(usStates.some((state) => state.value === 'US-CA'));
        assert.ok(!caStates.some((state) => state.value === 'US-CA'));
        assert.deepEqual(getCountriesOfState('US-CA'), ['US']);
    });

    it('returns all matches for a state value without choosing the first', () => {
        const groups = new Map();
        for (const country of getAllCountries()) {
            for (const state of getStatesOfCountry(country.value)) {
                const countries = groups.get(state.value) || [];
                groups.set(state.value, [...countries, country.value]);
            }
        }
        const ambiguous = [...groups.entries()].find(([, countries]) =>
            countries.length > 1
        );
        if (ambiguous) {
            assert.deepEqual(
                getCountriesOfState(ambiguous[0]).sort(),
                ambiguous[1].sort()
            );
        }
        assert.deepEqual(getCountriesOfState('Not-A-State'), []);
    });

    it('uses the shared ancestor registry and rejects unknown values', () => {
        assert.equal(isGeoCustomType('state'), true);
        assert.deepEqual(
            relationAncestors('geo', 'state'),
            ['country', 'continent']
        );
        assert.equal(isAncestorType('geo', 'continent', 'state'), true);
        assert.equal(getContinentOfCountry('FakeCountry'), null);
        assert.equal(isCountry('FakeCountry'), false);
    });
});
