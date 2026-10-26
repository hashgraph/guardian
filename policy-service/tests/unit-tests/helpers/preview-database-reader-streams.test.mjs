import assert from 'node:assert/strict';
import esmock from 'esmock';
import { ObjectId } from '@mikro-orm/mongodb';
import { GlobalEventsReaderStream } from '@guardian/common/entity/global-events-reader-stream';
import { createInMemoryDatabaseHelper } from '../../../../common/tests/helpers/in-memory-database-helper.mjs';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

const step = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
const ID = '64b7f0a1c2d3e4f5a6b7c8d1';

describe('@unit preview reader stream isolation', () => {
    beforeEach(() => db.reset());

    it('keeps create, update, active queries and delete within one preview', async () => {
        db.seed(GlobalEventsReaderStream, [{ _id: new ObjectId(ID), policyId: 'p1', blockId: 'reader', userId: 'u1', globalTopicId: '0.0.1', active: false }]);
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        await PreviewScope.run(step(), async () => {
            const old = await server.getGlobalEventsStreamByUserTopic('p1', 'reader', 'u1', '0.0.1');
            await server.updateGlobalEventsStream({ ...old, active: true });
            const added = await server.createGlobalEventsStream({ policyId: 'p1', blockId: 'reader', userId: 'u1', globalTopicId: '0.0.2' });
            assert.equal(added.active, false);
            assert.deepEqual(added.filterFieldsByBranch, {});
            assert.deepEqual((await server.getActiveGlobalEventsStreams('p1', 'reader')).map((item) => item.globalTopicId), ['0.0.1']);
            await server.deleteGlobalEventsStream(old);
            assert.deepEqual((await server.getGlobalEventsStreamsByUser('p1', 'reader', 'u1')).map((item) => item.globalTopicId), ['0.0.2']);
        });
        assert.deepEqual(db.records(GlobalEventsReaderStream).map((item) => [item.globalTopicId, item.active]), [['0.0.1', false]]);
        assert.equal(db.calls.some(([name]) => ['save', 'update', 'delete', 'remove'].includes(name)), false);
    });

    it('reads the normal shared stream collection even on a Dry Run policy', async () => {
        db.seed(GlobalEventsReaderStream, [{ _id: new ObjectId(ID), policyId: 'p1', blockId: 'reader', userId: 'u1', globalTopicId: '0.0.1', active: true }]);
        const server = createPreviewDatabaseServer(new DatabaseServer('p1'), 'p1');
        await PreviewScope.run(step(), async () => {
            assert.equal((await server.getGlobalEventsStreamsByUser('p1', 'reader', 'u1')).length, 1);
            const added = await server.createGlobalEventsStream({ policyId: 'p1', blockId: 'reader', userId: 'u1', globalTopicId: '0.0.2' });
            assert.equal(added.status, 'FREE');
            assert.equal((await server.getGlobalEventsStreamsByUser('p1', 'reader', 'u1')).length, 2);
        });
        assert.equal(db.records(GlobalEventsReaderStream).length, 1);
    });

    it('does not expose a preview stream to another preview or an ordinary reader', async () => {
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        const first = step();
        await PreviewScope.run(first, () => server.createGlobalEventsStream({ policyId: 'p1', blockId: 'reader', userId: 'u1', globalTopicId: '0.0.1' }));
        assert.equal((await PreviewScope.run(first, () => server.getGlobalEventsStreamsByUser('p1', 'reader', 'u1'))).length, 1);
        assert.deepEqual(await PreviewScope.run(step(), () => server.getGlobalEventsStreamsByUser('p1', 'reader', 'u1')), []);
        assert.deepEqual(await server.getGlobalEventsStreamsByUser('p1', 'reader', 'u1'), []);
    });
});
