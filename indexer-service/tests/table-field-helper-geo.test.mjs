import assert from 'node:assert/strict';
import { TableFieldHelper } from '../dist/helpers/table-field-helper.js';
import { SynchronizationVCs } from '../dist/helpers/synchronizers/synchronize-vcs.js';

describe('TableFieldHelper geo files', () => {
    const firstCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const secondCid = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';

    function createHelper(ensure) {
        const helper = new TableFieldHelper();
        helper.ensureFileCachedInGridFSStrict = ensure;
        return helper;
    }

    function createMessage(subject) {
        return {
            message: { consensusTimestamp: 'vc-1', files: ['vc'] },
            fileMap: new Map([['vc', JSON.stringify({ credentialSubject: [subject] })]]),
        };
    }

    it('saves every geo file found in the subject and maps its cid to the saved id', async () => {
        const calls = [];
        const helper = createHelper(async (vcId, cid) => {
            calls.push([vcId, cid]);
            return `grid-${cid === firstCid ? 1 : 2}`;
        });
        const { message, fileMap } = createMessage({
            location: { type: 'FeatureCollection', features: [], geoFile: { name: 'site.kml', cid: firstCid } },
            sites: [{ area: { type: 'Point', coordinates: [36, -1], geoFile: { cid: secondCid } } }],
            drawn: { type: 'Point', coordinates: [1, 2] },
            broken: { geoFile: { cid: 'not-a-cid' } },
        });
        const entity = { analytics: { tableFiles: { table: 'grid-table' } } };

        await helper.attachGeoFilesAnalytics(entity, message, fileMap);

        assert.deepEqual(calls, [['vc-1', firstCid], ['vc-1', secondCid]]);
        assert.deepEqual(entity.analytics, {
            tableFiles: { table: 'grid-table' },
            geoFiles: { [firstCid]: 'grid-1', [secondCid]: 'grid-2' },
        });
    });

    it('records an empty map for a document without geo files', async () => {
        const helper = createHelper(async () => assert.fail('nothing to download'));
        const { message, fileMap } = createMessage({ location: { type: 'Point', coordinates: [36, -1] } });
        const entity = { analytics: { schemaId: 'schema' } };

        await helper.attachGeoFilesAnalytics(entity, message, fileMap);

        assert.deepEqual(entity.analytics, { schemaId: 'schema', geoFiles: {} });
    });

    it('leaves the map unset when a download fails, so the next sync retries it', async () => {
        const helper = createHelper(async () => {
            throw new Error('IPFS timeout');
        });
        const { message, fileMap } = createMessage({ location: { geoFile: { cid: firstCid } } });
        const entity = { analytics: { tableFiles: { table: 'grid-table' } } };
        const originalError = console.error;
        console.error = () => undefined;
        try {
            await helper.attachGeoFilesAnalytics(entity, message, fileMap);
        } finally {
            console.error = originalError;
        }

        assert.deepEqual(entity.analytics, { tableFiles: { table: 'grid-table' } });
    });

    it('does nothing when the document file cannot be read', async () => {
        const helper = createHelper(async () => assert.fail('nothing to download'));
        const entity = { analytics: { schemaId: 'schema' } };

        await helper.attachGeoFilesAnalytics(entity, { files: ['missing'] }, new Map());

        assert.deepEqual(entity.analytics, { schemaId: 'schema' });
    });

    it('makes the VC sync pick up documents that have no geo file map yet', () => {
        const filter = Object.create(SynchronizationVCs.prototype).filter();

        assert.ok(filter.$or.some((condition) =>
            JSON.stringify(condition) === JSON.stringify({ 'analytics.geoFiles': { $exists: false } })
        ));
    });
});
