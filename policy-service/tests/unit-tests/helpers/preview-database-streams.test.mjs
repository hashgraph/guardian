import assert from 'node:assert/strict';
import esmock from 'esmock';
import { ObjectId } from '@mikro-orm/mongodb';
import { createInMemoryDatabaseHelper } from './in-memory-database-helper.mjs';
import { GlobalEventsWriterStream } from '@guardian/common/entity/global-events-writer-stream';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});
const step = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
const data = { policyId: 'p', blockId: 'b', userId: 'u', userDid: 'did:u', globalTopicId: '0.0.7', active: true, documentType: 'any' };

describe('@unit preview stream isolation', () => {
    beforeEach(() => db.reset());

    it('isolates creates, reads, updates and deletes from direct stream methods', async () => {
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        await PreviewScope.run(step(), async () => {
            const created = await server.createGlobalEventsWriterStream(data);
            assert.equal(created.lastPublishMessageId, '');
            assert.equal((await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u')).length, 1);
            await server.updateGlobalEventsWriterStream({ ...created, lastPublishMessageId: '1.000000001' });
            const updated = await server.getGlobalEventsWriterStreamByUserTopic('p', 'b', 'u', '0.0.7');
            assert.equal(updated.lastPublishMessageId, '1.000000001');
            await server.deleteGlobalEventsWriterStream(updated);
            assert.deepEqual(await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u'), []);
        });
        assert.deepEqual(db.records(GlobalEventsWriterStream), []);
        assert.equal(db.calls.some(([method]) => ['save', 'update', 'delete'].includes(method)), false);
    });

    it('replaces and deletes existing streams only inside that preview', async () => {
        const initial = { ...data, _id: new ObjectId(), lastPublishMessageId: 'old' };
        db.seed(GlobalEventsWriterStream, [initial]);
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        await PreviewScope.run(step(), async () => {
            const record = await server.getGlobalEventsWriterStreamByUserTopic('p', 'b', 'u', '0.0.7');
            await server.updateGlobalEventsWriterStream({ ...record, lastPublishMessageId: 'new' });
            assert.equal((await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u'))[0].lastPublishMessageId, 'new');
            await server.deleteGlobalEventsWriterStream(record);
            assert.deepEqual(await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u'), []);
        });
        assert.equal(db.records(GlobalEventsWriterStream)[0].lastPublishMessageId, 'old');
    });

    it('keeps concurrent previews and the ordinary writer separate', async () => {
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        let release;
        const barrier = new Promise((resolve) => { release = resolve; });
        let ready;
        const started = new Promise((resolve) => { ready = resolve; });
        const first = PreviewScope.run(step(), async () => {
            await server.createGlobalEventsWriterStream(data);
            ready();
            await barrier;
            const rows = await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u');
            assert.deepEqual(rows.map((row) => row.globalTopicId).sort(), ['0.0.7', '0.0.9']);
        });
        await started;
        await PreviewScope.run(step(), async () => {
            assert.deepEqual(await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u'), []);
            await server.createGlobalEventsWriterStream({ ...data, globalTopicId: '0.0.8' });
            assert.equal((await server.getGlobalEventsWriterStreamsByUser('p', 'b', 'u'))[0].globalTopicId, '0.0.8');
        });
        await server.createGlobalEventsWriterStream({ ...data, globalTopicId: '0.0.9' });
        release();
        await first;
        assert.deepEqual(db.records(GlobalEventsWriterStream).map((row) => row.globalTopicId), ['0.0.9']);
    });
});
