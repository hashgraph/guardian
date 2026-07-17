import { assert } from 'chai';
import { Topic } from '../../../dist/entity/topic.js';
import { DocumentDraft } from '../../../dist/entity/document-draft.js';
import { BlockCache } from '../../../dist/entity/block-cache.js';
import { Record } from '../../../dist/entity/record.js';
import { DryRunFiles } from '../../../dist/entity/dry-run-files.js';

const makeTopic = (props) => {
    const topic = new Topic();
    Object.assign(topic, props);
    return topic;
};

describe('Topic.createDocument', () => {
    it('fills _propHash with a hash string', async () => {
        const topic = makeTopic({ topicId: '0.0.1', name: 'root' });
        await topic.createDocument();
        assert.isString(topic._propHash);
        assert.isAbove(topic._propHash.length, 0);
    });

    it('sets an empty document hash', async () => {
        const topic = makeTopic({ topicId: '0.0.1' });
        await topic.createDocument();
        assert.equal(topic._docHash, '');
    });

    it('is deterministic for identical properties', async () => {
        const a = makeTopic({ topicId: '0.0.2', name: 'n', owner: 'did:o' });
        const b = makeTopic({ topicId: '0.0.2', name: 'n', owner: 'did:o' });
        await a.createDocument();
        await b.createDocument();
        assert.equal(a._propHash, b._propHash);
    });

    it('changes the hash when a tracked property changes', async () => {
        const a = makeTopic({ topicId: '0.0.2', name: 'n' });
        const b = makeTopic({ topicId: '0.0.2', name: 'other' });
        await a.createDocument();
        await b.createDocument();
        assert.notEqual(a._propHash, b._propHash);
    });

    it('ignores properties outside the tracked set', async () => {
        const a = makeTopic({ topicId: '0.0.3', name: 'n' });
        const b = makeTopic({ topicId: '0.0.3', name: 'n', tenantId: 'tenant-x' });
        await a.createDocument();
        await b.createDocument();
        assert.equal(a._propHash, b._propHash);
    });
});

describe('DocumentDraft.setDefaults', () => {
    it('extracts table file ids from a JSON string', async () => {
        const draft = new DocumentDraft();
        draft.data = JSON.stringify({ type: 'table', fileId: '507f1f77bcf86cd799439011' });
        await draft.setDefaults();
        assert.lengthOf(draft.tableFileIds, 1);
        assert.equal(String(draft.tableFileIds[0]), '507f1f77bcf86cd799439011');
    });

    it('extracts table file ids from an object payload', async () => {
        const draft = new DocumentDraft();
        draft.data = { nested: [{ type: 'table', fileId: '507f1f77bcf86cd799439012' }] };
        await draft.setDefaults();
        assert.lengthOf(draft.tableFileIds, 1);
        assert.equal(String(draft.tableFileIds[0]), '507f1f77bcf86cd799439012');
    });

    it('dedupes repeated file ids', async () => {
        const draft = new DocumentDraft();
        draft.data = {
            a: { type: 'table', fileId: '507f1f77bcf86cd799439013' },
            b: { type: 'TABLE', fileId: '507f1f77bcf86cd799439013' }
        };
        await draft.setDefaults();
        assert.lengthOf(draft.tableFileIds, 1);
    });

    it('ignores non-table nodes', async () => {
        const draft = new DocumentDraft();
        draft.data = { type: 'image', fileId: '507f1f77bcf86cd799439014' };
        await draft.setDefaults();
        assert.deepEqual(draft.tableFileIds, []);
    });

    it('leaves tableFileIds undefined for malformed JSON strings', async () => {
        const draft = new DocumentDraft();
        draft.data = '{not json';
        await draft.setDefaults();
        assert.isUndefined(draft.tableFileIds);
    });

    it('leaves tableFileIds undefined for an empty string', async () => {
        const draft = new DocumentDraft();
        draft.data = '   ';
        await draft.setDefaults();
        assert.isUndefined(draft.tableFileIds);
    });

    it('leaves tableFileIds undefined when data is missing', async () => {
        const draft = new DocumentDraft();
        await draft.setDefaults();
        assert.isUndefined(draft.tableFileIds);
    });
});

describe('BlockCache hooks', () => {
    it('setDefaults keeps a short value inline', async () => {
        const cache = new BlockCache();
        cache.value = { a: 1 };
        cache.isLongValue = false;
        await cache.setDefaults();
        assert.deepEqual(cache.value, { a: 1 });
        assert.isUndefined(cache.fileId);
    });

    it('setDefaults does nothing without a value', async () => {
        const cache = new BlockCache();
        cache.isLongValue = true;
        await cache.setDefaults();
        assert.isUndefined(cache.fileId);
    });

    it('loadFiles does nothing without a fileId', async () => {
        const cache = new BlockCache();
        await cache.loadFiles();
        assert.isUndefined(cache.value);
    });
});

describe('Record.setDefaults', () => {
    it('does nothing without document or results', async () => {
        const record = new Record();
        record.uuid = 'u';
        await record.setDefaults();
        assert.isUndefined(record.documentFileId);
        assert.isUndefined(record.resultsFileId);
    });
});

describe('DryRunFiles.setDefaults', () => {
    it('does nothing without a file', async () => {
        const entity = new DryRunFiles();
        entity.policyId = 'p1';
        await entity.setDefaults();
        assert.isUndefined(entity.fileId);
    });
});
