import assert from 'node:assert/strict';
import FeatureCollection from '../dist/helpers/geojson-schema/feature-collection.js';

describe('GeoJSON FeatureCollection schema', () => {
    it('declares the correct title and type', () => {
        assert.equal(FeatureCollection.title, 'GeoJSON FeatureCollection');
        assert.equal(FeatureCollection.type, 'object');
    });

    it('requires type and features', () => {
        assert.deepEqual(FeatureCollection.required, ['type', 'features']);
    });

    it('pins the type enum to ["FeatureCollection"]', () => {
        assert.deepEqual(FeatureCollection.properties.type.enum, ['FeatureCollection']);
    });

    it('features is an array of Feature sub-schemas', () => {
        assert.equal(FeatureCollection.properties.features.type, 'array');
        assert.equal(FeatureCollection.properties.features.items.title, 'GeoJSON Feature');
    });

    it('exposes a bbox sub-schema (array of numbers, ≥4 items)', () => {
        assert.equal(FeatureCollection.properties.bbox.type, 'array');
        assert.equal(FeatureCollection.properties.bbox.minItems, 4);
        assert.equal(FeatureCollection.properties.bbox.items.type, 'number');
    });
});
