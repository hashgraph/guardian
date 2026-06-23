import assert from 'node:assert/strict';
import { GeoJsonType } from '../dist/type/geojson.type.js';

describe('GeoJsonType enum', () => {
    it('uses RFC-7946 PascalCase geometry names', () => {
        assert.equal(GeoJsonType.POINT, 'Point');
        assert.equal(GeoJsonType.LINE_STRING, 'LineString');
        assert.equal(GeoJsonType.POLYGON, 'Polygon');
        assert.equal(GeoJsonType.MULTI_POINT, 'MultiPoint');
        assert.equal(GeoJsonType.MULTI_LINE_STRING, 'MultiLineString');
        assert.equal(GeoJsonType.MULTI_POLYGON, 'MultiPolygon');
        assert.equal(GeoJsonType.FEATURE_COLLECTION, 'FeatureCollection');
    });
});
