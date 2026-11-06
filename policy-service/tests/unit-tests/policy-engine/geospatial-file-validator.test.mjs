import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { GeospatialFileValidator } from '../../../dist/policy-engine/helpers/geospatial-file-validator.js';

const link = (overrides = {}) => ({
    fileId: 'file-1', name: 'site.geojson', format: 'geojson', ...overrides
});

async function kmz(text, name = 'doc.kml') {
    const zip = new JSZip();
    zip.file(name, text);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function forgeDeclaredSize(buffer, size) {
    const forged = Buffer.from(buffer);
    for (let offset = 0; offset <= forged.length - 4; offset += 1) {
        const signature = forged.readUInt32LE(offset);
        if (signature === 0x04034b50 && offset + 26 <= forged.length) {
            forged.writeUInt32LE(size, offset + 22);
        }
        if (signature === 0x02014b50 && offset + 28 <= forged.length) {
            forged.writeUInt32LE(size, offset + 24);
        }
    }
    return forged;
}

describe('GeospatialFileValidator', function () {
    let info;
    let error;
    let logger;

    beforeEach(function () {
        info = [];
        error = [];
        logger = {
            info: async (...args) => info.push(args),
            error: async (...args) => error.push(args)
        };
    });

    function fileAccess(buffer, calls = {}) {
        return {
            stat: async () => {
                calls.stat = (calls.stat || 0) + 1;
                return { length: buffer.length };
            },
            readPrefix: async (_fileId, length) => {
                calls.readPrefix = (calls.readPrefix || 0) + 1;
                return buffer.subarray(0, length);
            },
            readAll: async () => {
                calls.readAll = (calls.readAll || 0) + 1;
                return buffer;
            },
            openStream: () => {
                calls.openStream = (calls.openStream || 0) + 1;
                return Readable.from([buffer]);
            }
        };
    }

    function validator(bufferOrFiles, maximum = 256) {
        const files = Buffer.isBuffer(bufferOrFiles)
            ? fileAccess(bufferOrFiles)
            : bufferOrFiles;
        return new GeospatialFileValidator(logger, files, maximum);
    }

    it('accepts nested raw GeoJSON and KML within the maximum', async function () {
        await validator(Buffer.from('{"type":"Point","coordinates":[1,2]}')).validate({
            nested: [{ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }]
        });
        await validator(Buffer.from('<kml/>')).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kml', name: 'site.kml' }) }
        });
        assert.equal(error.length, 0);
    });

    it('rejects raw files and archives above the maximum', async function () {
        const calls = {};
        await assert.rejects(
            validator(fileAccess(Buffer.alloc(257), calls)).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /exceeds the 256 byte limit/
        );
        assert.deepEqual(calls, { stat: 1 });
        const archive = await kmz('<kml/>');
        await assert.rejects(
            validator(archive, archive.length - 1).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kmz', name: 'site.kmz' }) }
            }),
            /exceeds/
        );
    });

    it('accepts a valid KMZ within both limits', async function () {
        const archive = await kmz('<kml><Placemark><Point><coordinates>1,2</coordinates></Point></Placemark></kml>');

        await validator(archive, 1024).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kmz', name: 'site.kmz' }) }
        });

        assert.equal(error.length, 0);
    });

    it('rejects actual inflated KML output above the maximum', async function () {
        const archive = forgeDeclaredSize(
            await kmz(`<kml>${' '.repeat(1000)}</kml>`),
            1
        );
        assert.ok(archive.length < 512);
        await assert.rejects(
            validator(archive, 512).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kmz', name: 'site.kmz' }) }
            }),
            /exceeds the 512 byte limit/
        );
    });

    it('runs KMZ checks before rejecting ZIP bytes declared as KML', async function () {
        const archive = await kmz(`<kml>${' '.repeat(1000)}</kml>`);
        await assert.rejects(
            validator(archive, 512).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kml', name: 'site.kml' }) }
            }),
            /exceeds the 512 byte limit/
        );
    });

    it('rejects ZIP bytes declared as GeoJSON and KMZ over non-ZIP bytes', async function () {
        const archive = await kmz('<kml/>');
        await assert.rejects(
            validator(archive, 1000).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /format does not match/
        );
        await assert.rejects(
            validator(Buffer.from('<kml/>'), 1000).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kmz', name: 'site.kmz' }) }
            }),
            /format does not match/
        );
    });

    it('rejects missing root KML, fileId, GridFS file and empty bytes', async function () {
        const nested = await kmz('<kml/>', 'folder/doc.kml');
        await assert.rejects(
            validator(nested, 1000).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kmz', name: 'site.kmz' }) }
            }),
            /does not contain a root KML/
        );
        await assert.rejects(
            validator(Buffer.from('x')).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link({ fileId: undefined }) } }),
            /has no fileId/
        );
        await assert.rejects(
            validator({
                stat: async () => { throw new Error('missing'); },
                readPrefix: async () => { throw new Error('unexpected'); },
                readAll: async () => { throw new Error('unexpected'); }
            }).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /was not found/
        );
        await assert.rejects(
            validator(Buffer.alloc(0)).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /is empty/
        );
    });

    it('ignores an ordinary field named geoFile at the root and nested', async function () {
        const calls = {};
        await validator(fileAccess(Buffer.from('x'), calls)).validate({
            type: '#schema-1',
            geoFile: { name: 'contract' },
            details: { geoFile: { name: 'contract' } },
            list: [{ geoFile: 'text' }]
        });
        assert.equal(calls.stat, undefined);
        assert.equal(error.length, 0);
    });

    it('checks a link inside an ordinary field named geoFile', async function () {
        await assert.rejects(
            validator(Buffer.alloc(257)).validate({
                geoFile: { place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }
            }),
            /exceeds the 256 byte limit/
        );
    });

    it('checks links on Feature and FeatureCollection values', async function () {
        for (const value of [
            { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, geoFile: link() },
            { type: 'FeatureCollection', features: [], geoFile: link() }
        ]) {
            await assert.rejects(
                validator(Buffer.alloc(257)).validate({ place: value }),
                /exceeds the 256 byte limit/
            );
        }
    });

    it('rejects a malformed link inside a GeoJSON value', async function () {
        for (const geoFile of ['text', null, [link()]]) {
            await assert.rejects(
                validator(Buffer.from('x')).validate({
                    place: { type: 'Point', coordinates: [1, 2], geoFile }
                }),
                /has no fileId/
            );
        }
    });

    it('reads the same repeated link once', async function () {
        const calls = {};
        const shared = link();
        await validator(fileAccess(Buffer.from('{"type":"Point","coordinates":[1,2]}'), calls)).validate({
            first: { type: 'Point', coordinates: [1, 2], geoFile: shared },
            second: { type: 'Point', coordinates: [1, 2], geoFile: shared }
        });
        assert.deepEqual(calls, { stat: 1, readPrefix: 1, openStream: 1 });
    });

    it('logs no-preview acceptance with format, name, size and limit', async function () {
        await validator(Buffer.from('{"type":"Point","coordinates":[1,2]}')).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ noPreview: true }) }
        }, 'user-1');
        assert.equal(info.length, 1);
        assert.match(info[0][0], /file "site.geojson"/);
        assert.match(info[0][0], /\(GEOJSON\)/);
        assert.match(info[0][0], /36 bytes/);
        assert.match(info[0][0], /limit 256 bytes/);
        assert.equal(info[0][2], 'user-1');
    });

    it('accepts gzip GeoJSON and KML within the maximum', async function () {
        const calls = {};
        await validator(fileAccess(gzipSync('{"type":"Point","coordinates":[1,2]}'), calls)).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link() }
        });
        await validator(gzipSync('<kml/>')).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kml', name: 'site.kml' }) }
        });
        assert.equal(error.length, 0);
        assert.deepEqual(calls, { stat: 1, readPrefix: 1, openStream: 1 });
    });

    it('rejects gzip whose uncompressed size is above the maximum', async function () {
        const compressed = gzipSync(' '.repeat(10000));
        assert.ok(compressed.length < 256);
        await assert.rejects(
            validator(compressed).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            (rejection) => {
                assert.equal(rejection.message, 'The geospatial file site.geojson at $.place exceeds the 256 byte limit.');
                return true;
            }
        );
        assert.equal(error.length, 1);
    });

    it('accepts gzip at exactly the maximum', async function () {
        await validator(gzipSync('{"type":"Point","coordinates":[1,2]}'.padEnd(256))).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } });
        assert.equal(error.length, 0);
    });

    it('rejects gzip declared as KMZ and gzip holding a ZIP', async function () {
        await assert.rejects(
            validator(gzipSync('<kml/>')).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kmz', name: 'site.kmz' }) }
            }),
            /format does not match/
        );
        await assert.rejects(
            validator(gzipSync(await kmz('<kml/>')), 1000).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link({ format: 'kml', name: 'site.kml' }) }
            }),
            /format does not match/
        );
    });

    it('rejects broken and empty gzip', async function () {
        const compressed = gzipSync('{"type":"Point","coordinates":[1,2]}');
        await assert.rejects(
            validator(compressed.subarray(0, compressed.length - 6)).validate({
                place: { type: 'Point', coordinates: [1, 2], geoFile: link() }
            }),
            /could not be read/
        );
        await assert.rejects(
            validator(gzipSync('')).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /is empty/
        );
    });

    it('logs the uncompressed size of a gzip file accepted without preview', async function () {
        await validator(gzipSync('{"type":"Point","coordinates":[1,2]}'.padEnd(200))).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ noPreview: true }) }
        });
        assert.equal(info.length, 1);
        assert.match(info[0][0], /200 bytes,/);
    });

    it('logs rejection and does not replace it when logging fails', async function () {
        logger.error = async () => { throw new Error('logger down'); };
        await assert.rejects(
            validator(Buffer.alloc(257)).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /exceeds the 256 byte limit/
        );
    });
});

describe('geospatial content and selected values', () => {
    const point = { type: 'Point', coordinates: [1, 2] };
    function setup(buffer) {
        const logged = { debug: [], warn: [], info: [], error: [] };
        const logger = Object.fromEntries(Object.keys(logged).map(level => [level, async text => logged[level].push(text)]));
        const files = { stat: async () => ({ length: buffer.length }), readPrefix: async (_, size) => buffer.subarray(0, size), readAll: async () => buffer, openStream: () => Readable.from([buffer]) };
        return { logged, validator: new GeospatialFileValidator(logger, files, 100000) };
    }
    for (const compressed of [false, true]) {
        it(`rejects invalid GeoJSON stored ${compressed ? 'gzip' : 'plain'}`, async () => {
            const text = JSON.stringify({ type: 'Point', coordinates: [200, 1] });
            const { validator, logged } = setup(compressed ? gzipSync(text) : Buffer.from(text));
            await assert.rejects(validator.validate({ place: { ...point, geoFile: link() } }), /site.geojson.*RFC 7946.*WGS 84/);
            assert.equal(logged.error.length, 1); assert.equal(logged.debug.length, 0); assert.equal(logged.warn.length, 0);
        });
        it(`rejects broken KML stored ${compressed ? 'gzip' : 'plain'}`, async () => {
            const text = '<kml><Point></kml>';
            const { validator } = setup(compressed ? gzipSync(text) : Buffer.from(text));
            await assert.rejects(validator.validate({ place: { ...point, geoFile: link({ format: 'kml' }) } }), /could not be read/);
        });
    }
    it('rejects a selected value without a file and skips unchanged old values only', async () => {
        const { validator } = setup(Buffer.from(''));
        const root = { place: { type: 'Point', coordinates: [200, 1] } };
        await assert.rejects(validator.validate(root), /WGS 84/);
        await validator.validate(root, null, structuredClone(root));
        await assert.rejects(validator.validate({ place: { type: 'Point', coordinates: [201, 1] } }, null, root), /WGS 84/);
    });
    it('does not validate ordinary objects named after a geometry type', async () => {
        const { validator, logged } = setup(Buffer.from(''));
        await validator.validate({ metadata: { type: 'Point', label: 'ordinary object' } });
        assert.deepEqual(logged, { debug: [], warn: [], info: [], error: [] });
    });
    for (const [location, path, value, reason] of [
        ['point', '$.location', { type: 'Point', coordinates: [200, 50] }, 'Coordinates at $.location.coordinates must use WGS 84 longitude and latitude.'],
        ['nested Feature', '$.groups[0].location', { type: 'Feature', geometry: point }, 'Properties must be an object or null at $.groups[0].location.properties.'],
        ['FeatureCollection', '$.location', { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: point }] }, 'Properties must be an object or null at $.location.features[0].properties.']
    ]) {
        it(`uses an absolute reason path and only value facts for ${location}`, async () => {
            const { validator, logged } = setup(Buffer.from(''));
            const root = path.includes('groups') ? { groups: [{ location: value }] } : { location: value };
            const message = `The geospatial value at ${path} is not valid GeoJSON (RFC 7946): ${reason}`;
            await assert.rejects(validator.validate(root), { message });
            assert.deepEqual(logged.error, [`${message} Field ${path}.`]);
        });
    }
    it('ends a polygon rejection sentence before the field without empty file facts', async () => {
        const { validator, logged } = setup(Buffer.from(''));
        const location = { type: 'Polygon', coordinates: [[[0, 0], [4, 4], [0, 4], [4, 0], [0, 0]]] };
        const message = 'The geospatial value at $.location has an invalid polygon: Polygon: ring #0 must not cross or touch itself';
        await assert.rejects(validator.validate({ location }), { message });
        assert.deepEqual(logged.error, [`${message}. Field $.location.`]);
    });
    it('keeps plural counts and exact bytes for a plain file', async () => {
        const value = { type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] };
        const data = { type: 'FeatureCollection', features: [point, value].map(geometry => ({ type: 'Feature', properties: {}, geometry })) };
        const text = JSON.stringify(data);
        const { validator, logged } = setup(Buffer.from(text));
        await validator.validate({ policyId: 'policy-1', location: { ...value, geoFile: link() } });
        assert.deepEqual(logged.debug, [`Geospatial file "site.geojson" (GEOJSON) in policy policy-1 checked: 2 features, 3 vertices, ${Buffer.byteLength(text)} bytes`]);
    });
    it('keeps old-link size checks for unchanged values', async () => {
        const { validator } = setup(Buffer.alloc(100001));
        const root = { place: { ...point, geoFile: link() } };
        await assert.rejects(validator.validate(root, null, structuredClone(root)), /exceeds/);
    });
    it('rejects selected topology with the form message and no success logs', async () => {
        const bow = [[0, 0], [4, 4], [0, 4], [4, 0], [0, 0]];
        for (const geometry of [{ type: 'Polygon', coordinates: [bow] }, { type: 'MultiPolygon', coordinates: [[bow]] }]) {
            const { validator, logged } = setup(Buffer.from(JSON.stringify(point)));
            await assert.rejects(validator.validate({ place: { ...geometry, geoFile: link() } }), /ring #0 must not cross or touch itself/);
            assert.equal(logged.debug.length, 0); assert.equal(logged.warn.length, 0);
        }
    });
    it('accepts a form-closed polygon and reports counts and both sizes', async () => {
        const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] };
        const text = JSON.stringify(polygon);
        const stored = gzipSync(text);
        const { validator, logged } = setup(stored);
        await validator.validate({ policyId: 'policy-1', place: { ...polygon, geoFile: link() } });
        assert.equal(logged.debug.length, 1);
        assert.equal(logged.debug[0], `Geospatial file "site.geojson" (GEOJSON) in policy policy-1 checked: 1 feature, 5 vertices, ${Buffer.byteLength(text)} bytes (${stored.length} bytes compressed)`);
    });
    it('preserves archive bytes in the existing KMZ no-preview info entry', async () => {
        const archive = await kmz('<kml><Placemark><Point><coordinates>1,2</coordinates></Point></Placemark></kml>');
        const { validator, logged } = setup(archive);
        await validator.validate({ place: { ...point, geoFile: link({ format: 'kmz', noPreview: true }) } });
        assert.match(logged.info[0], new RegExp(`accepted without preview: ${archive.length} bytes, limit 100000 bytes`));
    });
    for (const archive of [false, true]) {
        it(`accepts and warns for linked ${archive ? 'KMZ' : 'KML'}`, async () => {
            const text = '<kml><Placemark><Point><coordinates>1,2</coordinates></Point></Placemark><NetworkLink/></kml>';
            const stored = archive ? await kmz(text) : gzipSync(text);
            const { validator, logged } = setup(stored);
            await validator.validate({ policyId: 'policy-1', place: { ...point, geoFile: link({ format: archive ? 'kmz' : 'kml' }) } });
            assert.equal(logged.warn.length, 1); assert.match(logged.warn[0], /contains 1 NetworkLink element; linked content is not imported/);
            assert.equal(logged.debug[0], archive
                ? `Geospatial file "site.geojson" (KMZ) in policy policy-1 checked: 1 feature, 1 vertex, ${Buffer.byteLength(text)} bytes KML (${stored.length} bytes archive)`
                : `Geospatial file "site.geojson" (KML) in policy policy-1 checked: 1 feature, 1 vertex, ${Buffer.byteLength(text)} bytes (${stored.length} bytes compressed)`);
        });
        it(`rejects broken inner XML in ${archive ? 'KMZ' : 'KML'}`, async () => {
            const text = '<kml><Point></kml>';
            const { validator, logged } = setup(archive ? await kmz(text) : Buffer.from(text));
            await assert.rejects(validator.validate({ place: { ...point, geoFile: link({ format: archive ? 'kmz' : 'kml' }) } }), /could not be read/);
            assert.equal(logged.warn.length, 0);
        });
    }
});
