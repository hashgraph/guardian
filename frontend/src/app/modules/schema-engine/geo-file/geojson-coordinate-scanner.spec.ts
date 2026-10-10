import { GeoCoordinate, readFirstCoordinate } from './first-coordinate-reader';
import { GeoJsonCoordinateScanner } from './geojson-coordinate-scanner';

function firstPosition(value: any): GeoCoordinate | null {
    const features = value?.type === 'FeatureCollection'
        ? value.features.filter((feature: any) => feature?.geometry?.type !== 'GeometryCollection')
        : value?.type === 'Feature'
            ? [value]
            : [{ geometry: value }];
    for (const feature of features) {
        const geometry = feature?.geometry;
        if (!geometry || geometry.type === 'GeometryCollection') continue;
        let coordinates = geometry.coordinates;
        while (Array.isArray(coordinates) && Array.isArray(coordinates[0])) coordinates = coordinates[0];
        if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
        return coordinates.length >= 3
            ? [coordinates[0], coordinates[1], coordinates[2]]
            : [coordinates[0], coordinates[1]];
    }
    return null;
}

const fixtures = [
    '{"type":"Point","coordinates":[1,2]}',
    '{"coordinates":[1e1,-2.5E1],"type":"Point"}',
    '{"type":"Feature","properties":{"coordinates":[0,0]},"geometry":{"type":"Point","coordinates":[3,4]}}',
    '{"type":"Feature","properties":{"text":"\\\"coordinates\\\":[0,0]"},"geometry":{"type":"Point","coordinates":[5,6]}}',
    '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":null},{"type":"Feature","geometry":{"type":"Point","coordinates":[7,8]}}]}',
    '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[0,0]}]}},{"type":"Feature","geometry":{"type":"LineString","coordinates":[[9,10],[11,12]]}}]}',
    '{"type":"LineString","coordinates":[[1,2],[3,4]]}',
    '{"type":"MultiPolygon","coordinates":[[[[13,14],[15,16],[17,18],[13,14]]]]}',
    '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[]}},{"type":"Feature","geometry":{"type":"Point","coordinates":[19,20]}}]}',
    '{"type":"Feature","properties":{"name":"Минск"},"geometry":{"coordinates":[27.56,53.90],"type":"Point"}}',
    JSON.stringify({
        type: 'Feature',
        properties: { padding: 'x'.repeat(1024 * 1024 + 8) },
        geometry: { type: 'Point', coordinates: [21, 22] }
    })
];

const noCoordinateFixtures = [
    '{"type":"FeatureCollection","features":[]}',
    '{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[1,2]}]}',
    '{"type":"Feature","properties":{"coordinates":[1,2]},"geometry":null}',
    '{"type":"Point","coordinates":[]}'
];

describe('GeoJsonCoordinateScanner', () => {
    for (const prefix of [
        '{"type":"Feature","properties":{"description":"',
        '{"type":"Feature","properties":{"'
    ]) {
        it(`keeps long strings bounded after ${prefix}`, () => {
            const scanner = new GeoJsonCoordinateScanner();
            scanner.write(prefix);
            const chunk = 'a'.repeat(16384);
            for (let index = 0; index < 16; index++) {
                scanner.write(chunk);
                expect(Reflect.get(scanner, 'stringValue').length).toBeLessThanOrEqual(65);
            }
            scanner.write(prefix.endsWith('description":"') ? '\\u0061\\"tail"}' : '":"ignored"}');
            scanner.write(',"geometry":{"type":"Point","coordinates":[36,-1]}}');
            expect(scanner.coordinate).toEqual([36, -1]);
        });
    }

    for (const text of fixtures) {
        for (const chunkSize of [1, 7, 1024 * 1024]) {
            it(`matches the field at ${chunkSize} bytes for ${text.slice(0, 45)}`, async () => {
                const expected = firstPosition(JSON.parse(text));
                const actual = await readFirstCoordinate(
                    new Blob([new TextEncoder().encode(text)]),
                    new GeoJsonCoordinateScanner(),
                    chunkSize
                );
                expect(actual).toEqual(expected);
            });
        }
    }

    for (const text of noCoordinateFixtures) {
        for (const chunkSize of [1, 7, 1024 * 1024]) {
            it(`returns none at ${chunkSize} bytes for ${text.slice(0, 45)}`, async () => {
                const actual = await readFirstCoordinate(
                    new Blob([new TextEncoder().encode(text)]),
                    new GeoJsonCoordinateScanner(),
                    chunkSize
                );
                expect(actual).toBeNull();
            });
        }
    }
});

describe('GeoJsonCoordinateScanner allowed types', () => {
    const allTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    const collection = (...geometries: unknown[]) => JSON.stringify({
        type: 'FeatureCollection',
        features: geometries.map(geometry => ({ type: 'Feature', properties: {}, geometry }))
    });
    const polygon = { type: 'Polygon', coordinates: [[[1, 2], [3, 4], [5, 6], [1, 2]]] };
    const line = { type: 'LineString', coordinates: [[7, 8], [9, 10]] };

    for (const text of [...fixtures, ...noCoordinateFixtures]) {
        it(`keeps the first coordinate when every shape is allowed for ${text.slice(0, 45)}`, async () => {
            const actual = await readFirstCoordinate(
                new Blob([new TextEncoder().encode(text)]),
                new GeoJsonCoordinateScanner(allTypes),
                7
            );
            expect(actual).toEqual(firstPosition(JSON.parse(text)));
        });
    }

    it('skips shapes of other types and takes the first allowed shape', async () => {
        const actual = await readFirstCoordinate(
            new Blob([collection(line, polygon)]),
            new GeoJsonCoordinateScanner(['Polygon'])
        );

        expect(actual).toEqual([1, 2]);
    });

    it('stops at the first allowed shape', () => {
        const scanner = new GeoJsonCoordinateScanner(['Polygon']);
        const text = collection(line, polygon, line);

        scanner.write(text.slice(0, text.lastIndexOf('{"type":"Feature"')));

        expect(scanner.settled).toBeTrue();
        expect(scanner.coordinate).toEqual([1, 2]);
    });

    it('ignores GeometryCollection features as the field does', async () => {
        const text = collection({ type: 'GeometryCollection', geometries: [polygon] }, line);

        const actual = await readFirstCoordinate(new Blob([text]), new GeoJsonCoordinateScanner(['Polygon']));

        expect(actual).toBeNull();
    });

    it('finds nothing when no shape is allowed', async () => {
        const actual = await readFirstCoordinate(
            new Blob([collection(line)]),
            new GeoJsonCoordinateScanner(['Polygon'])
        );

        expect(actual).toBeNull();
    });
});
