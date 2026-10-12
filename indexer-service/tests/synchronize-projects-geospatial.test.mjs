import assert from 'node:assert/strict';
import { SynchronizationProjects } from '../dist/helpers/synchronizers/synchronize-projects.js';

describe('SynchronizationProjects geospatial values', () => {
    const point = { type: 'Point', coordinates: [36, -1, 10] };
    const line = { type: 'LineString', coordinates: [[34, -3], [38, 1]] };
    const polygon = { type: 'Polygon', coordinates: [[[34, -3], [38, -3], [38, 1], [34, 1], [34, -3]]] };
    const values = [
        [point, '36|-1'],
        [line, '36|-1'],
        [{ ...line, type: 'MultiPoint' }, '36|-1'],
        [polygon, '35.6|-1.4'],
        [{ ...polygon, type: 'MultiLineString' }, '35.6|-1.4'],
        [{ type: 'MultiPolygon', coordinates: [polygon.coordinates] }, '35.6|-1.4'],
    ];

    for (const [geometry, coordinates] of values) {
        it(`extracts a wrapped ${geometry.type} with the existing center and project id`, () => {
            const synchronizer = Object.create(SynchronizationProjects.prototype);
            const storage = [];
            synchronizer.addCoordinates(storage, {
                type: 'FeatureCollection',
                features: [{ type: 'Feature', geometry, properties: { label: 'site' } }],
                geoFile: { noPreview: true, fileId: 'original', automaticPoint: [0, 0] },
            }, 'project-1');
            assert.deepEqual(storage, [{ coordinates, projectId: 'project-1' }]);
        });
    }

    it('reads a standalone Feature and a legacy bare geometry', () => {
        const synchronizer = Object.create(SynchronizationProjects.prototype);
        const storage = [];
        synchronizer.addCoordinates(storage, { type: 'Feature', geometry: point }, 'feature');
        synchronizer.addCoordinates(storage, point, 'legacy');
        assert.deepEqual(storage, [
            { coordinates: '36|-1', projectId: 'feature' },
            { coordinates: '36|-1', projectId: 'legacy' },
        ]);
    });

    it('skips null geometries and empty collections without losing later features', () => {
        const synchronizer = Object.create(SynchronizationProjects.prototype);
        const storage = [];
        synchronizer.addCoordinates(storage, { type: 'FeatureCollection', features: [] }, 'project');
        synchronizer.addCoordinates(storage, {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: null }, { type: 'Feature', geometry: point }],
        }, 'project');
        assert.deepEqual(storage, [{ coordinates: '36|-1', projectId: 'project' }]);
    });

    it('finds wrapped geo fields through the document and schema context path', () => {
        const synchronizer = Object.create(SynchronizationProjects.prototype);
        const context = { '@context': {
            '#GeoJSON': {},
            Site: { '@context': { location: { '@id': '#GeoJSON' } } },
        } };
        const fileMap = new Map([
            ['vc', JSON.stringify({ '@context': [context], credentialSubject: [{
                type: 'Site',
                location: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: point }] },
            }] })],
        ]);
        assert.deepEqual(synchronizer.updateGeoCoordinates({
            files: ['vc'], consensusTimestamp: 'document-id',
        }, fileMap), [{ coordinates: '36|-1', projectId: 'document-id' }]);
    });

    it('finds geo values when the schema has more than one geo field', () => {
        const synchronizer = Object.create(SynchronizationProjects.prototype);
        const context = { '@context': {
            '@version': 1.1,
            '#GeoJSON': { '@context': { '@version': 1.1 } },
            'site-schema&1.0.0': {
                '@id': '#site-schema&1.0.0',
                '@context': {
                    location: { '@id': '#GeoJSON' },
                    polygonOnly: { '@id': '#GeoJSON' },
                    note: { '@type': 'https://www.schema.org/text' },
                },
            },
        } };
        const wrapped = (geometry) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry }] });
        const sync = (subject) => synchronizer.updateGeoCoordinates({
            files: ['vc'], consensusTimestamp: 'document-id',
        }, new Map([['vc', JSON.stringify({ '@context': [context], credentialSubject: [subject] })]]));

        assert.deepEqual(sync({ type: 'site-schema&1.0.0', location: wrapped(point) }),
            [{ coordinates: '36|-1', projectId: 'document-id' }]);
        assert.deepEqual(sync({ type: 'site-schema&1.0.0', location: wrapped(point), polygonOnly: wrapped(polygon) }), [
            { coordinates: '36|-1', projectId: 'document-id' },
            { coordinates: '35.6|-1.4', projectId: 'document-id' },
        ]);
    });

    it('keeps nested geo fields when the parent subject also has filled geo fields', () => {
        const synchronizer = Object.create(SynchronizationProjects.prototype);
        const wrapped = (coordinates) => ({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'Point', coordinates } }],
        });
        const sync = (siteFields) => {
            const context = { '@context': {
                '#GeoJSON': { '@context': { '@version': 1.1 } },
                'Site': { '@context': {
                    ...Object.fromEntries(siteFields.map((field) => [field, { '@id': '#GeoJSON' }])),
                    details: { '@id': '#Detail' },
                } },
                'Detail': { '@context': { nestedLocation: { '@id': '#GeoJSON' } } },
            } };
            const subject = {
                type: 'Site',
                location: wrapped([36, -1]),
                details: { type: 'Detail', nestedLocation: wrapped([40, 2]) },
            };
            return synchronizer.updateGeoCoordinates({
                files: ['vc'], consensusTimestamp: 'document-id',
            }, new Map([['vc', JSON.stringify({ '@context': [context], credentialSubject: [subject] })]]));
        };
        const expected = [
            { coordinates: '36|-1', projectId: 'document-id' },
            { coordinates: '40|2', projectId: 'document-id' },
        ];

        assert.deepEqual(sync(['location', 'polygonOnly']), expected);
        assert.deepEqual(sync(['location']), expected);
    });
});
