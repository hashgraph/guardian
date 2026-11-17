import assert from 'node:assert/strict';
import { GeoJsonValidator, validateGeoJsonValue } from '../dist/helpers/geo-file/index.js';

const point = { type: 'Point', coordinates: [1, 2] };
const ring = [[0, 0], [1, 0], [1, 1], [0, 0]];
const valid = [point,
    { type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] },
    { type: 'LineString', coordinates: [[1, 2], [3, 4]] },
    { type: 'MultiLineString', coordinates: [[[1, 2], [3, 4]]] },
    { type: 'Polygon', coordinates: [ring] },
    { type: 'MultiPolygon', coordinates: [[ring]] },
    { type: 'Feature', properties: null, geometry: point, id: 12 },
    { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: point }] },
    { type: 'GeometryCollection', geometries: [point, { type: 'GeometryCollection', geometries: [] }] },
    { type: 'Feature', properties: { type: 'bad', geometry: { type: 'bad' } }, geometry: null },
    { ...point, crs: { type: 'name', properties: {} }, geoFile: { type: 'broken' } },
    { type: 'Point', coordinates: [180, 90, -1000, 45] },
    { type: 'Point', coordinates: [-180, -90] },
    { type: 'Point', coordinates: [1, 2, 3], bbox: [0, 0, -10, 2, 3, 10] },
    { ...point, bbox: [177, -20, -178, 20] },
    ...['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].map(type => ({ type, coordinates: [] })),
    { type: 'FeatureCollection', features: [] }, { type: 'GeometryCollection', geometries: [] }
];
const invalid = [null, [], 'Point', {}, { type: 'point' }, { type: 'Point' },
    { type: 'Point', coordinates: [1] }, { type: 'Point', coordinates: [1, '2'] },
    { type: 'Point', coordinates: [180.000001, 0] }, { type: 'Point', coordinates: [0, 90.000001] },
    { type: 'Point', coordinates: [[1, 2]] }, { type: 'LineString', coordinates: [[1, 2]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1]]] },
    { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
    { type: 'MultiPolygon', coordinates: [ring] },
    { type: 'MultiLineString', coordinates: [[[1, 2]]] },
    { type: 'GeometryCollection', geometries: [null] },
    { type: 'GeometryCollection', geometries: [{ type: 'Feature', properties: {}, geometry: point }] },
    { type: 'FeatureCollection', features: [point] },
    { type: 'Feature', geometry: point },
    { type: 'Feature', geometry: point, properties: [], id: {} },
    { type: 'Feature', geometry: point, properties: {}, id: false },
    { type: 'Feature', geometry: point, properties: {}, coordinates: [] },
    { ...point, features: [] }, { ...point, geometry: null }, { ...point, properties: {} },
    { type: 'FeatureCollection', features: [], coordinates: [] },
    { ...point, bbox: [0, 0, 1] }, { ...point, bbox: [0, 0, 1, '2'] },
    { ...point, bbox: [0, -91, 1, 2] }, { ...point, bbox: [0, 20, 1, 10] },
    { ...point, bbox: [0, 0, 0, 1, 2, 3] }
];

describe('GeoJSON RFC values and text', () => {
    for (const [expected, values] of [[true, valid], [false, invalid]]) {
        for (const value of values) {
            it(`${expected ? 'accepts' : 'rejects'} ${JSON.stringify(value)}`, () => {
                assert.equal(validateGeoJsonValue(value).valid, expected);
                const text = JSON.stringify(value);
                for (const size of [1, 7, text.length]) {
                    const validator = new GeoJsonValidator();
                    for (let i = 0; i < text.length; i += size) validator.write(text.slice(i, i + size));
                    assert.equal(validator.finish().valid, expected, `chunk size ${size}`);
                }
            });
        }
    }
    it('accepts coordinates before type and last duplicate members', () => {
        for (const text of ['{"coordinates":[1,2],"type":"Point"}', '{"type":"bad","coordinates":false,"type":"Point","coordinates":[1,2]}']) {
            const v = new GeoJsonValidator(); v.write(text); assert.equal(v.finish().valid, true);
        }
    });
    it('bounds long metadata and accepts long numeric literals', () => {
        const v = new GeoJsonValidator();
        v.write('{"type":"Feature","properties":{"text":"');
        for (let i = 0; i < 100; i++) v.write('a'.repeat(10000));
        v.write('","number":0.' + '1'.repeat(10000) + '},"geometry":{"type":"Point","coordinates":[1,2]}}');
        assert.equal(v.finish().valid, true);
    });
    it('checks a large collection without retaining positions', function () {
        this.timeout(30000);
        const v = new GeoJsonValidator(); const start = performance.now();
        v.write('{"type":"FeatureCollection","features":[');
        for (let i = 0; i < 50000; i++) v.write((i ? ',' : '') + JSON.stringify({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }));
        v.write(']}'); assert.equal(v.finish().valid, true); assert.deepEqual(v.counts, { features: 50000, vertices: 200000 });
        process.stdout.write(`Large collection: ${Math.round(performance.now() - start)} ms\n`);
    });
    it('rejects values that cannot be serialized', () => {
        const cycle = {}; cycle.cycle = cycle;
        for (const value of [undefined, cycle, 1n]) assert.equal(validateGeoJsonValue(value).valid, false);
    });
});
