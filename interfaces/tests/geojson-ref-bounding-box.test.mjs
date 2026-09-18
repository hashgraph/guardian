import assert from 'node:assert/strict';
import BoundingBox from '../dist/helpers/geojson-schema/ref/bounding-box.js';

describe('GeoJSON BoundingBox ref schema', () => {
    it('is an array', () => {
        assert.equal(BoundingBox.type, 'array');
    });

    it('requires at least 4 numeric items (2D bbox = [minX, minY, maxX, maxY])', () => {
        assert.equal(BoundingBox.minItems, 4);
        assert.equal(BoundingBox.items.type, 'number');
    });

    it('does not pin maxItems (allows 3D bbox of 6 items per RFC-7946 §5)', () => {
        assert.equal(BoundingBox.maxItems, undefined);
    });
});
