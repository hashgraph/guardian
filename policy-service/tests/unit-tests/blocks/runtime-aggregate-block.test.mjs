import { assert } from 'chai';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;

const mk = () => Object.create(AggregateBlock.prototype);

function makeRef(overrides = {}) {
    const calls = { triggered: [], removed: [], created: [], errors: [], logs: [], backups: 0 };
    const ref = {
        uuid: 'agg-uuid',
        policyId: 'policy-1',
        policyOwner: 'owner-x',
        dryRun: false,
        blockType: 'aggregateDocumentBlock',
        databaseServer: {
            async removeAggregateDocument(hash, uuid) { calls.removed.push({ hash, uuid }); },
            async removeAggregateDocuments(docs) { calls.removed.push(docs); },
            async createAggregateDocuments(item, uuid) { calls.created.push({ item, uuid }); },
            async getAggregateDocuments() { return overrides.rawEntities || []; },
        },
        async getOptions() { return overrides.options || {}; },
        async triggerEvents(type, user, state) { calls.triggered.push({ type, user, state }); },
        log(m) { calls.logs.push(m); },
        error(m) { calls.errors.push(m); },
        backup() { calls.backups++; },
        ...overrides.ref,
    };
    return { ref, calls };
}

function withRef(ref, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    PolicyComponentsUtils.ExternalEventFn = () => { };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.ExternalEventFn = origExt;
});

describe('AggregateBlock runtime — aggregateScope', () => {
    const block = mk();

    it('returns {} for null scopes', () => {
        assert.deepEqual(block.aggregateScope(null), {});
    });

    it('returns {} for empty scopes array', () => {
        assert.deepEqual(block.aggregateScope([]), {});
    });

    it('collects single-key values into arrays', () => {
        const result = block.aggregateScope([{ a: 1 }, { a: 2 }, { a: 3 }]);
        assert.deepEqual(result, { a: [1, 2, 3] });
    });

    it('collects multi-key values preserving order', () => {
        const result = block.aggregateScope([{ a: 1, b: 10 }, { a: 2, b: 20 }]);
        assert.deepEqual(result, { a: [1, 2], b: [10, 20] });
    });

    it('uses keys from the first scope only', () => {
        const result = block.aggregateScope([{ a: 1 }, { a: 2, b: 99 }]);
        assert.deepEqual(Object.keys(result), ['a']);
    });

    it('pushes undefined for missing key in later scope', () => {
        const result = block.aggregateScope([{ a: 1, b: 2 }, { a: 3 }]);
        assert.deepEqual(result.b, [2, undefined]);
    });
});

describe('AggregateBlock runtime — expressions', () => {
    const block = mk();

    it('returns {} when expressions are undefined', () => {
        const { ref } = makeRef();
        assert.deepEqual(block.expressions(ref, undefined, { document: {} }), {});
    });

    it('returns {} when expressions are empty', () => {
        const { ref } = makeRef();
        assert.deepEqual(block.expressions(ref, [], { document: {} }), {});
    });
});

describe('AggregateBlock runtime — popDocuments', () => {
    it('removes the aggregate document by hash and uuid', async () => {
        const { ref, calls } = makeRef();
        const block = mk();
        await block.popDocuments(ref, { hash: 'h1' });
        assert.deepEqual(calls.removed[0], { hash: 'h1', uuid: 'agg-uuid' });
    });
});

describe('AggregateBlock runtime — removeDocuments', () => {
    it('returns documents untouched when list is empty', async () => {
        const { ref } = makeRef();
        const block = mk();
        const out = await block.removeDocuments(ref, []);
        assert.deepEqual(out, []);
    });

    it('calls databaseServer.removeAggregateDocuments for non-empty list', async () => {
        const { ref, calls } = makeRef();
        const block = mk();
        const docs = [{ id: '1' }];
        await block.removeDocuments(ref, docs);
        assert.lengthOf(calls.removed, 1);
    });

    it('restores _id/id from sourceDocumentId and drops sourceDocumentId', async () => {
        const { ref } = makeRef();
        const block = mk();
        const docs = [{ sourceDocumentId: { toString: () => 'src-1' } }];
        const out = await block.removeDocuments(ref, docs);
        assert.equal(out[0].id, 'src-1');
        assert.equal(out[0]._id.toString(), 'src-1');
        assert.notProperty(out[0], 'sourceDocumentId');
    });

    it('leaves documents without sourceDocumentId unchanged', async () => {
        const { ref } = makeRef();
        const block = mk();
        const docs = [{ id: 'keep' }];
        const out = await block.removeDocuments(ref, docs);
        assert.equal(out[0].id, 'keep');
    });
});

describe('AggregateBlock runtime — onPopEvent', () => {
    it('pops each document of an array', async () => {
        const { ref, calls } = makeRef();
        const block = mk();
        await withRef(ref, () => block.onPopEvent({ data: { data: [{ hash: 'a' }, { hash: 'b' }] } }));
        assert.equal(calls.removed.length, 2);
        assert.equal(calls.backups, 1);
    });

    it('pops a single document', async () => {
        const { ref, calls } = makeRef();
        const block = mk();
        await withRef(ref, () => block.onPopEvent({ data: { data: { hash: 'solo' } } }));
        assert.deepEqual(calls.removed[0], { hash: 'solo', uuid: 'agg-uuid' });
    });
});

describe('AggregateBlock runtime — tickCron', () => {
    it('returns early when aggregateType is not period', async () => {
        const { ref, calls } = makeRef({ options: { aggregateType: 'cumulative' } });
        const block = mk();
        await withRef(ref, () => block.tickCron({ data: [], user: null }));
        assert.equal(calls.triggered.length, 0);
    });
});
