import assert from 'node:assert/strict';
import Feature from '../dist/helpers/geojson-schema/feature.js';

describe('GeoJSON Feature schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(Feature.title, 'GeoJSON Feature');
        assert.equal(Feature.type, 'object');
    });

    it('requires only type and geometry', () => {
        assert.deepEqual(Feature.required, ['type', 'geometry']);
    });

    it('pins the type enum to ["Feature"]', () => {
        assert.deepEqual(Feature.properties.type.enum, ['Feature']);
    });

    it('id accepts either number or string', () => {
        const ids = Feature.properties.id.oneOf.map((s) => s.type);
        assert.ok(ids.includes('number'));
        assert.ok(ids.includes('string'));
    });

    it('properties accepts null or object', () => {
        const types = Feature.properties.properties.oneOf.map((s) => s.type);
        assert.ok(types.includes('null'));
        assert.ok(types.includes('object'));
    });

    it('geometry accepts null plus all primary geometry types and GeometryCollection', () => {
        const titles = Feature.properties.geometry.oneOf
            .filter((s) => s.title)
            .map((s) => s.title);
        for (const expected of [
            'GeoJSON Point',
            'GeoJSON LineString',
            'GeoJSON Polygon',
            'GeoJSON MultiPoint',
            'GeoJSON MultiLineString',
            'GeoJSON MultiPolygon',
            'GeoJSON GeometryCollection',
        ]) {
            assert.ok(titles.includes(expected), `missing ${expected}`);
        }
        const nullEntry = Feature.properties.geometry.oneOf.find((s) => s.type === 'null');
        assert.ok(nullEntry, 'geometry should accept null');
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(Feature.properties.bbox.type, 'array');
        assert.equal(Feature.properties.bbox.minItems, 4);
        assert.equal(Feature.properties.bbox.items.type, 'number');
    });
});
