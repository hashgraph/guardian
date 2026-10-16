import { gunzipIfCompressed, gzipBlob, isGzipBlob } from './geo-file-compression';

describe('geo file compression', () => {
    const bytes = async (blob: Blob): Promise<number[]> =>
        Array.from(new Uint8Array(await blob.arrayBuffer()));

    it('writes gzip that starts with the gzip signature', async () => {
        const compressed = await gzipBlob(new Blob(['{"type":"Point","coordinates":[1,2]}']));
        const head = await bytes(compressed.slice(0, 2));

        expect(head).toEqual([0x1f, 0x8b]);
        expect(await isGzipBlob(compressed)).toBeTrue();
    });

    it('returns the original bytes after a round trip', async () => {
        const original = new Blob([
            '<kml><name>Участок №1</name>',
            new Uint8Array([0, 255, 128, 13, 10]),
            '</kml>'
        ]);

        const restored = await gunzipIfCompressed(await gzipBlob(original));

        expect(await bytes(restored)).toEqual(await bytes(original));
    });

    it('makes repetitive text smaller', async () => {
        const original = new Blob(['{"type":"Point","coordinates":[36.0012,-1.0021]},'.repeat(2000)]);

        const compressed = await gzipBlob(original);

        expect(compressed.size).toBeLessThan(original.size / 10);
    });

    it('returns a file that is not gzip unchanged', async () => {
        const geojson = new Blob(['{"type":"FeatureCollection","features":[]}']);
        const kmz = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])]);

        expect(await gunzipIfCompressed(geojson)).toBe(geojson);
        expect(await gunzipIfCompressed(kmz)).toBe(kmz);
    });

    it('does not treat empty or one-byte files as gzip', async () => {
        expect(await isGzipBlob(new Blob([]))).toBeFalse();
        expect(await isGzipBlob(new Blob([new Uint8Array([0x1f])]))).toBeFalse();
    });
});
