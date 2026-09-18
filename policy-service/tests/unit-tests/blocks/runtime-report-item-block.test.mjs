import { assert } from 'chai';
import { ReportItemBlock } from '../../../dist/policy-engine/blocks/report-item-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;
const origCache = PolicyComponentsUtils.getDocumentCacheFields;

const mk = () => Object.create(ReportItemBlock.prototype);

function makeRef(options, docs = [], overrides = {}) {
    const ref = {
        uuid: 'ri-uuid',
        blockType: 'reportItemBlock',
        policyId: 'p1',
        options,
        async getOptions() { return options; },
        getItems() { return []; },
        databaseServer: {
            async getVcDocuments() { return docs; },
            async getVcDocument() { return docs[0] || null; },
        },
        ...overrides,
    };
    return { ref };
}

function withRef(ref, externals, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    PolicyComponentsUtils.ExternalEventFn = (e) => { externals.push(e); };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.ExternalEventFn = origExt;
    PolicyComponentsUtils.getDocumentCacheFields = origCache;
});

describe('ReportItemBlock runtime — run filter building', () => {
    it('builds $eq filter from a value-typed filter', async () => {
        const block = mk();
        let captured;
        const { ref } = makeRef({
            multiple: false,
            filters: [{ field: 'status', type: 'equal', typeValue: 'value', value: 'ok' }],
        }, []);
        ref.databaseServer.getVcDocument = async (f) => { captured = f; return null; };
        const resultFields = [];
        await withRef(ref, [], () => block.run(resultFields, {}));
        assert.deepEqual(captured.status, { $eq: 'ok' });
        assert.deepEqual(captured.policyId, { $eq: 'p1' });
        assert.deepEqual(captured.schema, { $ne: '#UserRole' });
    });

    it('resolves a variable-typed filter from the variables bag', async () => {
        const block = mk();
        let captured;
        const { ref } = makeRef({
            multiple: false,
            filters: [{ field: 'owner', type: 'equal', typeValue: 'variable', value: 'docOwner' }],
        }, []);
        ref.databaseServer.getVcDocument = async (f) => { captured = f; return null; };
        await withRef(ref, [], () => block.run([], { docOwner: 'did:x' }));
        assert.deepEqual(captured.owner, { $eq: 'did:x' });
    });

    it('builds $in from a scalar value', async () => {
        const block = mk();
        let captured;
        const { ref } = makeRef({
            multiple: false,
            filters: [{ field: 'k', type: 'in', typeValue: 'value', value: 'v' }],
        }, []);
        ref.databaseServer.getVcDocument = async (f) => { captured = f; return null; };
        await withRef(ref, [], () => block.run([], {}));
        assert.deepEqual(captured.k, { $in: ['v'] });
    });

    it('builds $nin from an array value', async () => {
        const block = mk();
        let captured;
        const { ref } = makeRef({
            multiple: false,
            filters: [{ field: 'k', type: 'not_in', typeValue: 'value', value: ['a', 'b'] }],
        }, []);
        ref.databaseServer.getVcDocument = async (f) => { captured = f; return null; };
        await withRef(ref, [], () => block.run([], {}));
        assert.deepEqual(captured.k, { $nin: ['a', 'b'] });
    });

    it('throws BlockActionError on an unknown filter type', async () => {
        const block = mk();
        const { ref } = makeRef({
            multiple: false,
            filters: [{ field: 'k', type: 'bogus', typeValue: 'value', value: 'v' }],
        }, []);
        let threw = null;
        await withRef(ref, [], async () => {
            try { await block.run([], {}); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /Unknown filter type/);
    });
});

describe('ReportItemBlock runtime — run result fields', () => {
    it('pushes a result item and flags notFoundDocuments when empty', async () => {
        const block = mk();
        const { ref } = makeRef({ multiple: false, icon: 'i', title: 't' }, []);
        ref.databaseServer.getVcDocument = async () => null;
        const resultFields = [];
        const [notFound, returned] = await withRef(ref, [], () => block.run(resultFields, {}));
        assert.isTrue(notFound);
        assert.lengthOf(resultFields, 1);
        assert.equal(resultFields[0].title, 't');
        assert.isTrue(resultFields[0].notFoundDocuments);
        assert.strictEqual(returned, resultFields);
    });

    it('populates single document fields and extracts variables', async () => {
        const block = mk();
        const vc = { tag: 'tg', id: 'vcid', credentialSubject: [{ thing: 42 }] };
        const { ref } = makeRef({
            multiple: false,
            variables: [{ name: 'extracted', value: 'thing' }],
        }, [vc]);
        ref.databaseServer.getVcDocument = async () => vc;
        const variables = {};
        const resultFields = [];
        await withRef(ref, [], () => block.run(resultFields, variables));
        assert.isFalse(resultFields[0].notFoundDocuments);
        assert.equal(resultFields[0].tag, 'tg');
    });

    it('collects multiple documents into an array', async () => {
        const block = mk();
        const docs = [
            { tag: 'a', id: '1', credentialSubject: [{}] },
            { tag: 'b', id: '2', credentialSubject: [{}] },
        ];
        const { ref } = makeRef({ multiple: true }, docs);
        ref.databaseServer.getVcDocuments = async () => docs;
        const resultFields = [];
        await withRef(ref, [], () => block.run(resultFields, {}));
        assert.lengthOf(resultFields[0].document, 2);
    });

    it('emits an external Run event', async () => {
        const block = mk();
        const { ref } = makeRef({ multiple: false }, []);
        ref.databaseServer.getVcDocument = async () => null;
        const externals = [];
        await withRef(ref, externals, () => block.run([], {}));
        assert.lengthOf(externals, 1);
    });
});

describe('ReportItemBlock runtime — beforeInit', () => {
    it('registers document.* filter and variable paths into the cache', async () => {
        const block = mk();
        const cache = new Set();
        PolicyComponentsUtils.getDocumentCacheFields = () => cache;
        const { ref } = makeRef({
            filters: [{ field: 'document.foo' }, { field: 'other' }],
            variables: [{ value: 'document.bar' }, { value: 'plain' }],
        });
        await withRef(ref, [], () => block.beforeInit());
        assert.isTrue(cache.has('foo'));
        assert.isTrue(cache.has('bar'));
        assert.isFalse(cache.has('other'));
    });
});
