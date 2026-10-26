import assert from 'node:assert/strict';
import esmock from 'esmock';
import { GlobalEventsReaderStream } from '@guardian/common/entity/global-events-reader-stream';
import { BlockCache } from '@guardian/common/entity/block-cache';
import { createInMemoryDatabaseHelper } from '../../../../common/tests/helpers/in-memory-database-helper.mjs';
import GlobalEventsReaderBlock from '../../../dist/policy-engine/blocks/global-events-reader-block.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { EventActor } from '../../../dist/policy-engine/interfaces/policy-event-type.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { makeBlock, makeComponents, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

describe('@unit Global Events Reader inside a preview chain', () => {
    beforeEach(() => db.reset());
    after(() => restoreHarness());

    for (const defaultActive of [false, true]) {
        it(`preserves the immediate continuation for defaultActive=${defaultActive} without durable streams or cache`, async () => {
            const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
            const { block } = makeBlock(GlobalEventsReaderBlock, {
                defaultActive, parent: { registerChild() {} },
                options: { eventTopics: [{ topicId: '0.0.123', active: true }], branches: [] },
                components: makeComponents({ databaseServer: server })
            });
            const outputs = [];
            block.triggerEvents = async (type) => { outputs.push(type); };
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const data = { data: { id: 'd1', document: { credentialSubject: [{ area: 7 }] } } };
            await PreviewScope.run(step, async () => {
                await block.runAction({ user: makeUser({ userId: 'u1' }), data, actionStatus: step });
                assert.equal((await server.getGlobalEventsStreamsByUser('policy-1', block.uuid, 'u1')).length, 1);
            });
            assert.deepEqual(outputs, defaultActive ? [] : ['RunEvent', 'RefreshEvent', 'ReleaseEvent']);
            assert.deepEqual(step.getPreviewDocuments(), defaultActive ? [
                { source: null, target: 'tag-1', blockType: 'globalEventsReaderBlock', document: data.data }
            ] : []);
            assert.deepEqual(db.records(GlobalEventsReaderStream), []);
            assert.deepEqual(db.records(BlockCache), []);
            assert.equal(db.calls.some(([name]) => ['save', 'update'].includes(name)), false);
        });
    }
    for (const preview of [false, true]) {
        for (const defaultActive of [false, true]) {
            it(`routes through the real handler for preview=${preview}, visible=${defaultActive}`, async () => {
                const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
                const components = makeComponents({ databaseServer: server });
                const reader = makeBlock(GlobalEventsReaderBlock, {
                    defaultActive, parent: { registerChild() {} }, uuid: 'reader', tag: 'reader',
                    options: { eventTopics: [], branches: [] }, components
                }).block;
                const source = makeBlock(GlobalEventsReaderBlock, { uuid: 'source', tag: 'source', components }).block;
                const seen = [];
                reader.sourceLinks = [];
                const originalTrigger = reader.triggerEvents.bind(reader);
                reader.triggerEvents = async (type, ...args) => {
                    seen.push(type);
                    return originalTrigger(type, ...args);
                };
                source.sourceLinks = [new PolicyLink('RunEvent', 'RunEvent', source, reader,
                    EventActor.EventInitiator, event => reader.runAction(event))];
                const step = new RecordActionStep(() => {}, 0, true, true, undefined, preview);
                const data = { data: { id: 'd1', document: { credentialSubject: [{ amount: 7 }] } } };
                const execute = () => source.triggerEvents('RunEvent', makeUser({ userId: 'u1' }), data, step);
                if (preview) await PreviewScope.run(step, execute);
                else await execute();
                assert.equal(seen.includes('RunEvent'), !defaultActive);
                if (preview) {
                    assert.deepEqual(step.getPreviewDocuments().map(item => [item.source, item.target, item.document]),
                        defaultActive ? [['source', 'reader', data.data]] : [['reader', null, data.data]]);
                    assert.equal(db.calls.some(([name]) => ['save', 'update'].includes(name)), false);
                } else {
                    assert.deepEqual(step.getPreviewDocuments(), []);
                }
            });
        }
    }

});
