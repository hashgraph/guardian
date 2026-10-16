import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { DataBaseHelper } from '@indexer/common';
import { ArtifactsService } from '../dist/api/artifacts.service.js';

describe('ArtifactsService chunked download', () => {
    const fileId = '6ad13083d933d8df86ca8a8a';

    it('returns an image above 1 MB in chunks below 1 MB that rebuild the exact bytes', async () => {
        const originalGridFS = DataBaseHelper.gridFS;
        const bytes = Buffer.alloc(Math.round(2.3 * 1024 * 1024), 0);
        for (let index = 0; index < bytes.length; index++) {
            bytes[index] = (index * 17) % 253;
        }
        DataBaseHelper.gridFS = {
            find: (filter) => {
                assert.equal(String(filter._id), fileId);
                return {
                    limit: () => ({
                        toArray: async () => [{ length: bytes.length, filename: 'image', contentType: 'image/png' }],
                    }),
                };
            },
            openDownloadStream: (_id, { start, end }) => Readable.from([bytes.subarray(start, end)]),
        };
        try {
            const service = new ArtifactsService();
            const meta = (await service.getArtifactMeta({ fileId })).body;
            assert.equal(meta.length, bytes.length);
            assert.ok(meta.totalChunks > 1);

            const parts = [];
            for (let index = 0; index < meta.totalChunks; index++) {
                const response = await service.getArtifactChunk({ fileId, index, chunkSize: meta.chunkSize });
                assert.equal(response.error, null);
                assert.ok(JSON.stringify(response.body).length < 1024 * 1024);
                parts.push(Buffer.from(response.body.b64, 'base64'));
            }
            assert.ok(Buffer.concat(parts).equals(bytes));
        } finally {
            DataBaseHelper.gridFS = originalGridFS;
        }
    });
});
