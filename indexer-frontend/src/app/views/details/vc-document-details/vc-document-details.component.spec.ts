import { VcDocumentDetailsComponent } from './vc-document-details.component';

describe('VcDocumentDetailsComponent geospatial coordinates', () => {
    const point = { type: 'Point', coordinates: [36, -1, 10] };
    const line = { type: 'LineString', coordinates: [[34, -3], [38, 1]] };
    const polygon = { type: 'Polygon', coordinates: [[[34, -3], [38, -3], [38, 1], [34, 1], [34, -3]]] };
    const values = [
        { geometry: point, center: [36, -1, 10] },
        { geometry: line, center: [36, -1] },
        { geometry: { ...line, type: 'MultiPoint' }, center: [36, -1] },
        { geometry: polygon, center: [35.6, -1.4] },
        { geometry: { ...polygon, type: 'MultiLineString' }, center: [35.6, -1.4] },
        { geometry: { type: 'MultiPolygon', coordinates: [polygon.coordinates] }, center: [35.6, -1.4] },
    ];

    function createComponent(): any {
        const component = Object.create(VcDocumentDetailsComponent.prototype);
        component.mapPoints = [];
        return component;
    }

    for (const { geometry, center } of values) {
        it(`lists a wrapped ${geometry.type} using its existing center`, () => {
            const component = createComponent();
            component.createMapPoints({
                type: 'FeatureCollection',
                features: [{ type: 'Feature', geometry, properties: { name: 'site' } }],
                geoFile: { noPreview: true, automaticPoint: [0, 0] },
            });
            expect(component.mapPoints).toEqual([{ type: geometry.type, coordinates: center }]);
        });
    }

    it('keeps standalone Features and legacy geometries', () => {
        const component = createComponent();
        component.createMapPoints({ type: 'Feature', geometry: point });
        component.createMapPoints(line);
        expect(component.mapPoints).toEqual([
            { type: 'Point', coordinates: [36, -1, 10] },
            { type: 'LineString', coordinates: [36, -1] },
        ]);
    });

    it('skips empty collections and null geometries and keeps every remaining shape', () => {
        const component = createComponent();
        component.createMapPoints({ type: 'FeatureCollection', features: [] });
        component.createMapPoints({ type: 'FeatureCollection', features: [
            { type: 'Feature', geometry: null },
            { type: 'Feature', geometry: point },
            { type: 'Feature', geometry: line },
        ] });
        expect(component.mapPoints).toEqual([
            { type: 'Point', coordinates: [36, -1, 10] },
            { type: 'LineString', coordinates: [36, -1] },
        ]);
    });
});
