import assert from 'node:assert/strict';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';

const geoField = (extra = {}) => ({ name: 'geo', type: '#GeoJSON', isRef: true, ...extra });

describe('DocumentGenerator GeoJSON generation', () => {
    it('produces a FeatureCollection with a single Point feature by default', () => {
        const value = DocumentGenerator.generateField(geoField(), ['ctx'], null, {});
        assert.equal(value.type, 'FeatureCollection');
        assert.equal(value.features.length, 1);
        assert.equal(value.features[0].type, 'Feature');
        assert.deepEqual(value.features[0].properties, {});
        assert.equal(value.features[0].geometry.type, 'Point');
        assert.deepEqual(value.features[0].geometry.coordinates, [0, 0]);
    });

    it('uses the first availableOptions entry as the geometry type', () => {
        const value = DocumentGenerator.generateField(geoField({ availableOptions: ['Polygon'] }), ['ctx'], null, {});
        assert.equal(value.features[0].geometry.type, 'Polygon');
        assert.equal(Array.isArray(value.features[0].geometry.coordinates[0]), true);
        assert.equal(value.features[0].geometry.coordinates[0].length, 4);
    });

    it('generates LineString coordinates as an array of positions', () => {
        const value = DocumentGenerator.generateField(geoField({ availableOptions: ['LineString'] }), ['ctx'], null, {});
        assert.equal(value.features[0].geometry.type, 'LineString');
        assert.equal(value.features[0].geometry.coordinates.length, 2);
        assert.equal(value.features[0].geometry.coordinates[0].length, 2);
    });

    it('generates MultiPoint coordinates', () => {
        const value = DocumentGenerator.generateField(geoField({ availableOptions: ['MultiPoint'] }), ['ctx'], null, {});
        assert.equal(value.features[0].geometry.type, 'MultiPoint');
        assert.equal(value.features[0].geometry.coordinates.length, 3);
    });

    it('generates MultiLineString coordinates', () => {
        const value = DocumentGenerator.generateField(geoField({ availableOptions: ['MultiLineString'] }), ['ctx'], null, {});
        assert.equal(value.features[0].geometry.type, 'MultiLineString');
        assert.equal(value.features[0].geometry.coordinates[0].length, 3);
    });

    it('generates MultiPolygon coordinates', () => {
        const value = DocumentGenerator.generateField(geoField({ availableOptions: ['MultiPolygon'] }), ['ctx'], null, {});
        assert.equal(value.features[0].geometry.type, 'MultiPolygon');
        assert.equal(value.features[0].geometry.coordinates[0][0].length, 4);
    });

    it('falls back to Point coordinates for an unknown geometry type', () => {
        const value = DocumentGenerator.generateField(geoField({ availableOptions: ['Hexagon'] }), ['ctx'], null, {});
        assert.equal(value.features[0].geometry.type, 'Hexagon');
        assert.deepEqual(value.features[0].geometry.coordinates, [0, 0]);
    });

    it('returns the preset object verbatim when a plain-object preset matches the field name', () => {
        const preset = { type: 'FeatureCollection', features: [] };
        const value = DocumentGenerator.generateField(geoField(), ['ctx'], null, { geo: { geo: preset } });
        assert.equal(value, preset);
    });
});

describe('DocumentGenerator SentinelHUB generation', () => {
    const shField = () => ({ name: 'sh', type: '#SentinelHUB', isRef: true });

    it('produces the canonical sentinel request shape', () => {
        const value = DocumentGenerator.generateField(shField(), ['ctx'], null, {});
        assert.deepEqual(value, {
            '@context': ['ctx'],
            layers: 'NATURAL-COLOR',
            format: 'image/jpeg',
            maxcc: 10,
            width: 10,
            height: 10,
            bbox: '1111,2222,3333,4444',
            time: '2000-01-01/2000-02-01',
        });
    });

    it('returns the preset object verbatim when a plain-object preset matches', () => {
        const preset = { layers: 'CUSTOM' };
        const value = DocumentGenerator.generateField(shField(), ['ctx'], null, { sh: { sh: preset } });
        assert.equal(value, preset);
    });

    it('ignores a non-object preset and still generates defaults', () => {
        const value = DocumentGenerator.generateField(shField(), ['ctx'], null, { sh: { sh: 'not-an-object' } });
        assert.equal(value.layers, 'NATURAL-COLOR');
    });
});

describe('DocumentGenerator ref field with examples', () => {
    it('uses the first example instead of generating a sub-document', () => {
        const field = geoField({ examples: [{ ready: true }] });
        const value = DocumentGenerator.generateField(field, ['ctx'], null, {});
        assert.deepEqual(value, { ready: true });
    });

    it('wraps a generated GeoJSON value in an array for isArray fields', () => {
        const value = DocumentGenerator.generateField(geoField({ isArray: true }), ['ctx'], null, {});
        assert.equal(Array.isArray(value), true);
        assert.equal(value[0].type, 'FeatureCollection');
    });
});
