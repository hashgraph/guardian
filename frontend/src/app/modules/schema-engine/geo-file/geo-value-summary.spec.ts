import { countPoints, countShapes, describeGeoValue, summarizeGeoValue } from './geo-value-summary';

const square = (shift = 0) => [[[shift, 0], [shift + 1, 0], [shift + 1, 1], [shift, 0]]];

describe('geo value summary', () => {
    it('summarizes nothing for an empty value', () => {
        expect(summarizeGeoValue({})).toEqual({ shapes: 0, polygons: 0, points: 0, bytes: 0 });
        expect(describeGeoValue(summarizeGeoValue(undefined))).toBe('');
    });

    it('counts the polygons of a MultiPolygon as the shape count of one shape', () => {
        const summary = summarizeGeoValue({ type: 'MultiPolygon', coordinates: [square(0), square(5), square(9)] });

        expect(summary).toEqual(jasmine.objectContaining({ type: 'MultiPolygon', shapes: 1, polygons: 3, points: 12 }));
        expect(describeGeoValue(summary)).toBe('3 polygons · 12 points');
    });

    it('describes a single shape by its type', () => {
        expect(describeGeoValue(summarizeGeoValue({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })))
            .toBe('1 linestring · 2 points');
    });

    it('unwraps a Feature and a one-feature collection', () => {
        const feature = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1, 2] } };

        expect(describeGeoValue(summarizeGeoValue(feature))).toBe('1 point');
        expect(describeGeoValue(summarizeGeoValue({ type: 'FeatureCollection', features: [feature] })))
            .toBe('1 point');
    });

    it('skips features without a geometry and GeometryCollections', () => {
        const value = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: null },
                { type: 'Feature', geometry: { type: 'GeometryCollection', geometries: [] } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } }
            ]
        };

        expect(countShapes(value)).toBe(1);
        expect(countPoints(value)).toBe(1);
    });

    it('lists shapes and polygons for a collection and appends the size', () => {
        const value = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: { type: 'Polygon', coordinates: square(0) } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } }
            ]
        };

        expect(describeGeoValue(summarizeGeoValue(value), '3.7 MB')).toBe('2 shapes · 1 polygon · 5 points · 3.7 MB');
    });

    it('groups thousands', () => {
        const summary = { shapes: 1, type: 'MultiPolygon', polygons: 4537, points: 133656, bytes: 0 };

        expect(describeGeoValue(summary)).toBe('4,537 polygons · 133,656 points');
    });
});
