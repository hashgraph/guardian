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
        await validator(fileAccess(Buffer.from('{}'), calls)).validate({
            first: { type: 'Point', coordinates: [1, 2], geoFile: shared },
            second: { type: 'Point', coordinates: [1, 2], geoFile: shared }
        });
        assert.deepEqual(calls, { stat: 1, readPrefix: 1 });
    });

    it('logs no-preview acceptance with format, name, size and limit', async function () {
        await validator(Buffer.from('{}')).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ noPreview: true }) }
        }, 'user-1');
        assert.equal(info.length, 1);
        assert.match(info[0][0], /name=site.geojson/);
        assert.match(info[0][0], /format=geojson/);
        assert.match(info[0][0], /size=2/);
        assert.match(info[0][0], /limit=256/);
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
        await validator(gzipSync(' '.repeat(256))).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } });
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
        await validator(gzipSync('x'.repeat(200))).validate({
            place: { type: 'Point', coordinates: [1, 2], geoFile: link({ noPreview: true }) }
        });
        assert.equal(info.length, 1);
        assert.match(info[0][0], /size=200,/);
    });

    it('logs rejection and does not replace it when logging fails', async function () {
        logger.error = async () => { throw new Error('logger down'); };
        await assert.rejects(
            validator(Buffer.alloc(257)).validate({ place: { type: 'Point', coordinates: [1, 2], geoFile: link() } }),
            /exceeds the 256 byte limit/
        );
    });
});
