import assert from 'node:assert/strict';
import LinearRingCoordinates from '../dist/helpers/geojson-schema/ref/linear-ring-coordinates.js';

describe('GeoJSON LinearRingCoordinates ref schema', () => {
    it('is an array whose items are point-coordinates (positions)', () => {
        assert.equal(LinearRingCoordinates.type, 'array');
        assert.equal(LinearRingCoordinates.items.type, 'array');
        assert.equal(LinearRingCoordinates.items.items.type, 'number');
        assert.equal(LinearRingCoordinates.items.minItems, 2);
    });

    it('requires at least 4 positions (closed ring, RFC-7946 §3.1.6)', () => {
        assert.equal(LinearRingCoordinates.minItems, 4);
    });
});
