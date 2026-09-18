import assert from 'node:assert/strict';
import { ReleaseMigration } from '../dist/migrations/v2-21-0.js';

function makeMigration(collections) {
    const m = Object.create(ReleaseMigration.prototype);
    m.getCollection = (name) => collections[name];
    return m;
}

describe('ReleaseMigration.updateIndex', () => {
    it('drops the matching indexes when they exist', async () => {
        const dropped = [];
        const coll = (idx) => ({
            indexExists: async (name) => name === idx,
            dropIndex: async (name) => { dropped.push(name); },
        });
        const m = makeMigration({
            AnalyticsDocument: coll('uuid_1'),
            AnalyticsTokenCache: coll('tokenId_1'),
            AnalyticsTopicCache: coll('topicId_1'),
        });
        await m.up();
        assert.deepEqual(dropped.sort(), ['tokenId_1', 'topicId_1', 'uuid_1']);
    });

    it('does not drop when the indexes are absent', async () => {
        const dropped = [];
        const coll = () => ({
            indexExists: async () => false,
            dropIndex: async (name) => { dropped.push(name); },
        });
        const m = makeMigration({
            AnalyticsDocument: coll(),
            AnalyticsTokenCache: coll(),
            AnalyticsTopicCache: coll(),
        });
        await m.up();
        assert.equal(dropped.length, 0);
    });

    it('swallows errors thrown while inspecting a collection', async () => {
        const logs = [];
        const origLog = console.log;
        console.log = (...a) => logs.push(a);
        const failing = {
            indexExists: async () => { throw new Error('index-boom'); },
            dropIndex: async () => {},
        };
        const m = makeMigration({
            AnalyticsDocument: failing,
            AnalyticsTokenCache: failing,
            AnalyticsTopicCache: failing,
        });
        await m.up();
        console.log = origLog;
        assert.equal(logs.length, 3);
    });
});
