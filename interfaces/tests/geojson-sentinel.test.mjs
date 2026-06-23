import assert from 'node:assert/strict';
import GeoJsonSchema from '../dist/helpers/geojson-schema/geo-json.js';
import SentinelHubSchema from '../dist/helpers/sentinel-hub/sentinel-hub-schema.js';
import Point from '../dist/helpers/geojson-schema/point.js';

describe('GeoJSON master schema', () => {
    it('exposes the canonical $id and title', () => {
        assert.equal(GeoJsonSchema.$id, '#GeoJSON');
        assert.equal(GeoJsonSchema.title, 'GeoJSON');
    });

    it('lists all primary geometry types in oneOf', () => {
        const titles = GeoJsonSchema.oneOf.map((s) => s.title);
        for (const expected of [
            'GeoJSON Point',
            'GeoJSON LineString',
            'GeoJSON Polygon',
            'GeoJSON MultiPoint',
            'GeoJSON MultiLineString',
            'GeoJSON MultiPolygon',
        ]) {
            assert.ok(titles.includes(expected), `missing ${expected}`);
        }
    });

    it('Point sub-schema requires type + coordinates and pins type enum to ["Point"]', () => {
        assert.deepEqual(Point.required, ['type', 'coordinates']);
        assert.deepEqual(Point.properties.type.enum, ['Point']);
    });
});

describe('SentinelHUB schema', () => {
    it('exposes the canonical $id and title', () => {
        assert.equal(SentinelHubSchema.$id, '#SentinelHUB');
        assert.equal(SentinelHubSchema.title, '#SentinelHUB');
    });

    it("constrains 'layers' to NATURAL-COLOR and 'format' to image/jpeg", () => {
        assert.deepEqual(SentinelHubSchema.properties.layers.enum, ['NATURAL-COLOR']);
        assert.deepEqual(SentinelHubSchema.properties.format.enum, ['image/jpeg']);
    });

    it('declares numeric properties for maxcc / width / height', () => {
        assert.equal(SentinelHubSchema.properties.maxcc.type, 'number');
        assert.equal(SentinelHubSchema.properties.width.type, 'number');
        assert.equal(SentinelHubSchema.properties.height.type, 'number');
    });

    it('declares string properties for time / bbox', () => {
        assert.equal(SentinelHubSchema.properties.time.type, 'string');
        assert.equal(SentinelHubSchema.properties.bbox.type, 'string');
    });
});
