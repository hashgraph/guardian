import { unwrapGeoJsonGeometry, extractLatLng } from '../../../../src/worker/project-mapper/helpers';

/**
 * Guardian's map widget writes boundaries as a FeatureCollection, and the
 * schema declares the geo field as an array — so the value that lands in the
 * VC is `[{ type: 'FeatureCollection', features: [...] }]`, not a bare
 * geometry. Before the unwrap existed, both the polygon and its centroid
 * resolved to null and such projects rendered with no shape and no map pin.
 */
describe('unwrapGeoJsonGeometry', () => {
    const ring = [
        [80.44438038936276, 7.936750404752118],
        [79.84453677220392, 7.577215857532025],
        [80.98744871486586, 7.454856088414999],
        [80.44438038936276, 7.936750404752118],
    ];

    it('unwraps an array-wrapped FeatureCollection down to the bare geometry', () => {
        const value = [{
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }],
        }];

        expect(unwrapGeoJsonGeometry(value)).toEqual({ type: 'Polygon', coordinates: [ring] });
    });

    it('yields a usable centroid for a FeatureCollection-wrapped polygon', () => {
        const value = [{
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} }],
        }];

        const centroid = extractLatLng(unwrapGeoJsonGeometry(value)!);
        expect(centroid![0]).toBeCloseTo(80.4302, 3);
        expect(centroid![1]).toBeCloseTo(7.7264, 3);
    });

    it('unwraps a bare Feature', () => {
        const value = { type: 'Feature', geometry: { type: 'Point', coordinates: [12, 34] }, properties: {} };
        expect(unwrapGeoJsonGeometry(value)).toEqual({ type: 'Point', coordinates: [12, 34] });
    });

    it('merges multiple polygon features into one MultiPolygon', () => {
        const a = [[[0, 0], [1, 0], [1, 1], [0, 0]]];
        const b = [[[10, 10], [11, 10], [11, 11], [10, 10]]];
        const value = [{
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: { type: 'Polygon', coordinates: a } },
                { type: 'Feature', geometry: { type: 'Polygon', coordinates: b } },
            ],
        }];

        expect(unwrapGeoJsonGeometry(value)).toEqual({ type: 'MultiPolygon', coordinates: [a, b] });
    });

    it('flattens a MultiPolygon into the merge rather than nesting it', () => {
        const a = [[[0, 0], [1, 0], [1, 1], [0, 0]]];
        const b = [[[10, 10], [11, 10], [11, 11], [10, 10]]];
        const value = [
            { type: 'MultiPolygon', coordinates: [a] },
            { type: 'Polygon', coordinates: b },
        ];

        expect(unwrapGeoJsonGeometry(value)).toEqual({ type: 'MultiPolygon', coordinates: [a, b] });
    });

    it('passes bare geometries through unchanged', () => {
        expect(unwrapGeoJsonGeometry([{ type: 'Polygon', coordinates: [ring] }]))
            .toEqual({ type: 'Polygon', coordinates: [ring] });
        expect(unwrapGeoJsonGeometry({ type: 'Point', coordinates: [12, 34] }))
            .toEqual({ type: 'Point', coordinates: [12, 34] });
    });

    it('returns null for non-GeoJSON values so the lat/lng-string fallback can run', () => {
        expect(unwrapGeoJsonGeometry({ latitude: '1.37', longitude: '32.29' })).toBeNull();
        expect(unwrapGeoJsonGeometry({ type: 'Polygon' })).toBeNull();
        expect(unwrapGeoJsonGeometry([])).toBeNull();
        expect(unwrapGeoJsonGeometry(null)).toBeNull();
        expect(unwrapGeoJsonGeometry('test')).toBeNull();
    });

    it('ignores an empty FeatureCollection', () => {
        expect(unwrapGeoJsonGeometry([{ type: 'FeatureCollection', features: [] }])).toBeNull();
    });
});
