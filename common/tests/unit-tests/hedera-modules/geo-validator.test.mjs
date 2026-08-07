import assert from 'node:assert/strict';
import {
    validateGeoConsistency,
} from '../../../dist/hedera-modules/vcjs/geo-validator.js';

const continent = {
    name: 'continent',
    type: 'string',
    customType: 'continent',
    isArray: false,
    isRef: false,
};
const country = {
    name: 'country',
    type: 'string',
    customType: 'country',
    dependency: { on: 'continent', kind: 'geo' },
    isArray: false,
    isRef: false,
};
const state = {
    name: 'state',
    type: 'string',
    customType: 'state',
    dependency: { on: 'country', kind: 'geo' },
    isArray: false,
    isRef: false,
};

describe('validateGeoConsistency', () => {
    it('accepts a consistent Country and Continent', () => {
        assert.deepEqual(
            validateGeoConsistency(
                { country: 'CA', continent: 'NA' },
                [continent, country]
            ),
            []
        );
    });

    it('rejects conflicting Country and Continent values (Scenario 3)', () => {
        const errors = validateGeoConsistency(
            { country: 'CA', continent: 'SA' },
            [continent, country]
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /country.*continent/i);
    });

    it('rejects an unknown Country value (Scenario 6)', () => {
        const errors = validateGeoConsistency(
            { country: 'FakeCountry' },
            [country]
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /Invalid country value/);
    });

    it('validates State against Country', () => {
        assert.deepEqual(
            validateGeoConsistency(
                { country: 'US', state: 'US-CA' },
                [country, state]
            ),
            []
        );
        const errors = validateGeoConsistency(
            { country: 'DE', state: 'US-CA' },
            [country, state]
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /state.*country/i);
    });

    it('validates a direct State to Continent relation', () => {
        const directState = {
            ...state,
            dependency: { on: 'continent', kind: 'geo' },
        };
        assert.deepEqual(
            validateGeoConsistency(
                { continent: 'NA', state: 'US-CA' },
                [continent, directState]
            ),
            []
        );
        assert.equal(
            validateGeoConsistency(
                { continent: 'EU', state: 'US-CA' },
                [continent, directState]
            ).length,
            1
        );
    });
});
