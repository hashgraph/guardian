import assert from 'node:assert/strict';
import { polygonRingError, polygonHolesError, polygonValueError } from '../dist/helpers/geo-file/index.js';

const square = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
const bowTie = [[0, 0], [4, 4], [0, 4], [4, 0], [0, 0]];
const outside = [[5, 5], [6, 5], [6, 6], [5, 5]];
describe('selected polygon topology', () => {
    it('keeps ordinary reversed concave and dateline rings', () => {
        for (const ring of [square, [...square].reverse(), [[0, 0], [4, 0], [2, 2], [4, 4], [0, 4], [0, 0]], [[179, 0], [-179, 0], [-179, 4], [179, 4], [179, 0]]]) assert.equal(polygonRingError(ring), null);
    });
    it('keeps the crossing ring message', () => {
        assert.equal(polygonValueError({ type: 'Polygon', coordinates: [bowTie] }), `Polygon: ring #0 ${polygonRingError(bowTie)}`);
    });
    it('keeps the hole message', () => {
        assert.equal(polygonValueError({ type: 'Polygon', coordinates: [square, outside] }), `Polygon: ${polygonHolesError([square, outside])}`);
    });
    it('keeps the MultiPolygon index', () => {
        assert.equal(polygonValueError({ type: 'MultiPolygon', coordinates: [[square], [bowTie]] }), `MultiPolygon: polygon #1: ring #0 ${polygonRingError(bowTie)}`);
    });
    it('rejects repeated vertices, overlap, too few vertices and zero area', () => {
        for (const ring of [[[0, 0], [4, 0], [4, 4], [4, 0], [0, 0]], [[0, 0], [4, 0], [2, 0], [2, 4], [0, 0]], [[0, 0], [1, 0], [2, 0], [0, 0]], [[0, 0], [4, 0], [0, 0]]]) assert.ok(polygonRingError(ring));
    });
    it('walks Features and geometry collections', () => {
        const geometry = { type: 'Polygon', coordinates: [bowTie] };
        assert.equal(polygonValueError({ type: 'Feature', properties: {}, geometry }), polygonValueError(geometry));
        assert.equal(polygonValueError({ type: 'GeometryCollection', geometries: [geometry] }), polygonValueError(geometry));
    });
});
