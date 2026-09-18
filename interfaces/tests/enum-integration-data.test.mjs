import assert from 'node:assert/strict';
import { IntegrationDataTypes, ParseTypes } from '../dist/type/integration-data.type.js';

describe('IntegrationDataTypes enum', () => {
    it('exposes JSON/CSV/GEOTIFF/GEOJSON/TEXT', () => {
        for (const k of ['JSON', 'CSV', 'GEOTIFF', 'GEOJSON', 'TEXT']) {
            assert.equal(IntegrationDataTypes[k], k);
        }
        assert.equal(Object.keys(IntegrationDataTypes).length, 5);
    });
});

describe('ParseTypes enum', () => {
    it('exposes NUMBER and JSON', () => {
        assert.equal(ParseTypes.NUMBER, 'NUMBER');
        assert.equal(ParseTypes.JSON, 'JSON');
    });
});
