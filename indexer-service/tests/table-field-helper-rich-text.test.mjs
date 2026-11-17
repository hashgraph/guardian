import assert from 'node:assert/strict';
import { DataBaseHelper } from '@indexer/common';
import { TableFieldHelper } from '../dist/helpers/table-field-helper.js';
import { SynchronizationVCs } from '../dist/helpers/synchronizers/synchronize-vcs.js';
import { IPFSService } from '../dist/helpers/ipfs-service.js';

describe('TableFieldHelper rich-text image cache', () => {
    const first = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const second = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
    const image = cid => `![site](ipfs://${cid})`;

    function document(subjects) {
        return {
            message: { consensusTimestamp: 'vc-1', files: ['vc'] },
            fileMap: new Map([['vc', JSON.stringify({ credentialSubject: subjects })]]),
        };
    }

    it('caches images across subjects, nested fields and arrays, once per CID', async () => {
        const calls = [];
        const helper = new TableFieldHelper();
        helper.ensureFileCachedInGridFSStrict = async (vcId, cid) => {
            calls.push([vcId, cid]);
            return 'grid-' + cid;
        };
        const { message, fileMap } = document([
            { text: image(first), nested: { photos: [image(first), image(second)] } },
            { text: image(second) },
        ]);
        const entity = { analytics: { geoFiles: { geo: 'grid-geo' }, tableFiles: { table: 'grid-table' } } };
        await helper.attachRichTextImagesAnalytics(entity, message, fileMap);
        assert.deepEqual(calls, [['vc-1', first], ['vc-1', second]]);
        assert.deepEqual(entity.analytics, {
            geoFiles: { geo: 'grid-geo' }, tableFiles: { table: 'grid-table' },
            richTextImages: { [first]: 'grid-' + first, [second]: 'grid-' + second },
            richTextImagesFailed: [],
        });
    });

    it('records an empty map for plain links, external images and invalid CIDs', async () => {
        const helper = new TableFieldHelper();
        helper.ensureFileCachedInGridFSStrict = async () => assert.fail('not an IPFS image');
        const { message, fileMap } = document([{
            text: `[file](ipfs://${first}) ![external](https://example.com/image.png) ![bad](ipfs://bad)`,
        }]);
        const entity = {};
        await helper.attachRichTextImagesAnalytics(entity, message, fileMap);
        assert.deepEqual(entity.analytics, { richTextImages: {}, richTextImagesFailed: [] });
    });

    it('reuses an existing GridFS file without calling IPFS', async () => {
        const originalGridFS = DataBaseHelper.gridFS;
        const originalGetFile = IPFSService.getFile;
        DataBaseHelper.gridFS = {
            find: filter => {
                assert.deepEqual(filter, { filename: first });
                return { toArray: async () => [{ _id: { toString: () => 'cached-image' } }] };
            },
        };
        IPFSService.getFile = async () => assert.fail('already cached');
        try {
            const { message, fileMap } = document([{ text: image(first) }]);
            const entity = {};
            await new TableFieldHelper().attachRichTextImagesAnalytics(entity, message, fileMap);
            assert.deepEqual(entity.analytics, { richTextImages: { [first]: 'cached-image' }, richTextImagesFailed: [] });
        } finally {
            DataBaseHelper.gridFS = originalGridFS;
            IPFSService.getFile = originalGetFile;
        }
    });

    it('uploads an image above 1 MB from IPFS into GridFS byte for byte', async () => {
        const originalGridFS = DataBaseHelper.gridFS;
        const originalGetFile = IPFSService.getFile;
        const bytes = Buffer.alloc(Math.round(2.3 * 1024 * 1024), 0);
        for (let index = 0; index < bytes.length; index++) {
            bytes[index] = (index * 31) % 251;
        }
        const uploaded = [];
        DataBaseHelper.gridFS = {
            find: () => ({ toArray: async () => [] }),
            openUploadStream: (filename) => {
                const listeners = {};
                return {
                    id: 'grid-large-image',
                    once: (event, listener) => { listeners[event] = listener; },
                    end: (data) => {
                        uploaded.push([filename, data]);
                        listeners.finish();
                    },
                };
            },
        };
        IPFSService.getFile = async (cid) => {
            assert.equal(cid, first);
            return bytes;
        };
        try {
            const { message, fileMap } = document([{ text: image(first) }]);
            const entity = {};
            await new TableFieldHelper().attachRichTextImagesAnalytics(entity, message, fileMap);
            assert.deepEqual(entity.analytics, { richTextImages: { [first]: 'grid-large-image' }, richTextImagesFailed: [] });
            assert.equal(uploaded.length, 1);
            assert.equal(uploaded[0][0], first);
            assert.ok(uploaded[0][1].length > 1024 * 1024);
            assert.ok(uploaded[0][1].equals(bytes));
        } finally {
            DataBaseHelper.gridFS = originalGridFS;
            IPFSService.getFile = originalGetFile;
        }
    });

    it('records failed CIDs and succeeds on a later sync', async () => {
        const helper = new TableFieldHelper();
        let fail = true;
        helper.ensureFileCachedInGridFSStrict = async cid => {
            if (fail) throw new Error('IPFS timeout');
            return 'grid-image';
        };
        const { message, fileMap } = document([{ text: image(first) }]);
        const entity = { analytics: { schemaName: 'Site' } };
        const originalError = console.error;
        console.error = () => undefined;
        try {
            await helper.attachRichTextImagesAnalytics(entity, message, fileMap);
            assert.deepEqual(entity.analytics, {
                schemaName: 'Site', richTextImages: {}, richTextImagesFailed: [first],
            });
            fail = false;
            await helper.attachRichTextImagesAnalytics(entity, message, fileMap);
            assert.deepEqual(entity.analytics.richTextImages, { [first]: 'grid-image' });
            assert.deepEqual(entity.analytics.richTextImagesFailed, []);
        } finally {
            console.error = originalError;
        }
    });

    it('supports inline documents and does not mark unreadable documents complete', async () => {
        const helper = new TableFieldHelper();
        helper.ensureFileCachedInGridFSStrict = async () => 'grid-image';
        const entity = {};
        await helper.attachRichTextImagesAnalytics(entity, {
            documents: [JSON.stringify({ credentialSubject: { note: image(first) } })],
        }, new Map());
        assert.deepEqual(entity.analytics, { richTextImages: { [first]: 'grid-image' }, richTextImagesFailed: [] });
        const unreadable = {};
        await helper.attachRichTextImagesAnalytics(unreadable, { files: ['missing'] }, new Map());
        assert.deepEqual(unreadable, {});
    });

    it('selects old documents whose image map has not been prepared', () => {
        const filter = Object.create(SynchronizationVCs.prototype).filter();
        assert.ok(filter.$or.some(condition =>
            JSON.stringify(condition) === JSON.stringify({ 'analytics.richTextImages': { $exists: false } })
        ));
    });

    it('runs image preparation from the real VC synchronization entry point', async () => {
        const cursor = rows => {
            let index = 0;
            return { hasNext: async () => index < rows.length, next: async () => rows[index++] };
        };
        const message = { _id: 'vc-1', files: ['vc'], topicId: 'topic' };
        const row = {};
        const calls = [];
        const manager = {
            getCollection: name => ({
                find: filter => cursor(name === 'message' && filter?.type?.$in ? [message] : []),
            }),
            getReference: () => row,
            persist: () => undefined,
            flush: async () => undefined,
        };
        const originalManager = DataBaseHelper.getEntityManager;
        const methods = ['attachTableFilesAnalytics', 'attachGeoFilesAnalytics', 'attachRichTextImagesAnalytics'];
        const originalMethods = methods.map(method => TableFieldHelper.prototype[method]);
        DataBaseHelper.getEntityManager = () => manager;
        methods.forEach(method => {
            TableFieldHelper.prototype[method] = async entity => {
                calls.push(method);
                if (method === 'attachRichTextImagesAnalytics') entity.analytics.richTextImages = { [first]: 'grid-image' };
            };
        });
        try {
            const synchronizer = Object.create(SynchronizationVCs.prototype);
            synchronizer.filter = () => ({});
            await synchronizer.sync();
            assert.deepEqual(calls, methods);
            assert.deepEqual(row.analytics.richTextImages, { [first]: 'grid-image' });
        } finally {
            DataBaseHelper.getEntityManager = originalManager;
            methods.forEach((method, index) => { TableFieldHelper.prototype[method] = originalMethods[index]; });
        }
    });
    for (const failedFirst of [false, true]) {
        it('publishes an available image when the unavailable image comes ' + (failedFirst ? 'first' : 'last'), async () => {
            const helper = new TableFieldHelper();
            const calls = [];
            helper.ensureFileCachedInGridFSStrict = async (vcId, cid) => {
                calls.push(cid);
                if (cid === second) throw new Error('Missing image');
                return 'grid-image';
            };
            const order = failedFirst ? [second, first] : [first, second];
            const { message, fileMap } = document([{ photos: order.map(image) }]);
            const entity = {};
            const originalError = console.error;
            console.error = () => undefined;
            try {
                await helper.attachRichTextImagesAnalytics(entity, message, fileMap);
            } finally {
                console.error = originalError;
            }
            assert.deepEqual(calls, order);
            assert.deepEqual(entity.analytics.richTextImages, { [first]: 'grid-image' });
            assert.deepEqual(entity.analytics.richTextImagesFailed, [second]);
            const filter = Object.create(SynchronizationVCs.prototype).filter();
            assert.ok(filter.$or.some(condition => JSON.stringify(condition) ===
                JSON.stringify({ 'analytics.richTextImagesFailed.0': { $exists: true } })));
        });
    }

});
