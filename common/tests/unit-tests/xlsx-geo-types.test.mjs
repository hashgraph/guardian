import assert from 'node:assert/strict';
import { FieldTypes, geoDisplayValue } from '../../dist/xlsx/models/dictionary.js';

describe('Geographic field types in the Excel dictionary', () => {
    it('resolves all three type names to the shared contract', () => {
        const country = FieldTypes.findByName('Country');
        assert.equal(country.type, 'string');
        assert.equal(country.isRef, false);
        assert.equal(country.customType, 'country');

        const continent = FieldTypes.findByName('Continent');
        assert.equal(continent.type, 'string');
        assert.equal(continent.isRef, false);
        assert.equal(continent.customType, 'continent');

        const state = FieldTypes.findByName('State/Province');
        assert.equal(state.type, 'string');
        assert.equal(state.isRef, false);
        assert.equal(state.customType, 'state');
    });

    it('resolves each type back by value, which is what export depends on', () => {
        for (const [customType, name] of [
            ['country', 'Country'],
            ['continent', 'Continent'],
            ['state', 'State/Province']
        ]) {
            const found = FieldTypes.findByValue({
                type: 'string',
                format: undefined,
                isRef: false,
                unitSystem: undefined,
                customType,
                pattern: undefined
            });
            assert.equal(found.name, name);
        }
    });

    it('normalizes a preset cell into the stored code', () => {
        const country = FieldTypes.findByName('Country').pars;
        assert.equal(country('United States'), 'US');
        assert.equal(country('  united states  '), 'US');
        assert.equal(country('US'), 'US');
        assert.equal(country('qwerty'), '');
        assert.equal(country(''), '');
        assert.equal(country(undefined), '');

        const continent = FieldTypes.findByName('Continent').pars;
        assert.equal(continent('North America'), 'NA');
        assert.equal(continent('NA'), 'NA');
    });

    it('leaves a State/Province preset as written, but trims it', () => {
        const state = FieldTypes.findByName('State/Province').pars;
        assert.equal(state('US-CA'), 'US-CA');
        assert.equal(state('  US-CA  '), 'US-CA');
        assert.equal(state('Aitutaki'), 'Aitutaki');
        assert.equal(state('Georgia'), 'Georgia');
        assert.equal(state(undefined), '');
    });

    it('gives the display name back on export, and only where it is unambiguous', () => {
        assert.equal(geoDisplayValue('country', 'US'), 'United States');
        assert.equal(geoDisplayValue('continent', 'NA'), 'North America');
        assert.equal(geoDisplayValue('state', 'US-CA'), 'US-CA');
        assert.equal(geoDisplayValue('enum', 'US'), 'US');
        assert.equal(geoDisplayValue('country', 'ZZ'), 'ZZ');

        const multiple = ['US', 'CA'];
        assert.equal(geoDisplayValue('country', multiple), multiple);
    });
});
