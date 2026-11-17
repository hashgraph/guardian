import assert from 'node:assert/strict';
import { KmzReader } from '../dist/helpers/geo-file/index.js';
import { kmz } from './fixtures/kmz.mjs';

describe('ZIP64 KMZ records', () => {
    for (const method of [0, 8]) {
        it(`reads end records and extended sizes with method ${method}`, async () => {
            const text = '<kml><Placemark/></kml>';
            const file = new Blob([kmz(text, { zip64: true, method })]);
            const reader = new KmzReader();
            const result = await reader.inspect(file);
            assert.equal(result.previewSizeBytes, text.length);
            assert.equal(await reader.readText(file, result.entry, 1000), text);
        });
    }
    it('reads a ZIP64 disk-start marker whose replacement is disk zero', async () => {
        const file = new Blob([kmz('<kml/>', { zip64: true, diskMarker: true })]);
        const reader = new KmzReader();
        const result = await reader.inspect(file);
        assert.equal(await reader.readText(file, result.entry, 1000), '<kml/>');
    });
    for (const options of [{ missingExtra: true }, { unsafeOffset: true }]) {
        it(`rejects invalid extended information ${JSON.stringify(options)}`, async () => {
            await assert.rejects(new KmzReader().inspect(new Blob([kmz('<kml/>', { zip64: true, ...options })])), /central directory is invalid/);
        });
    }
});
