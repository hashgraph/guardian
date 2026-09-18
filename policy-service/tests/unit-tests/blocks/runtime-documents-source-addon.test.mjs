import { assert } from 'chai';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/blocks/documents-source-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origUpdate = PolicyComponentsUtils.BlockUpdateFn;

const rawSetData = Object.getPrototypeOf(DocumentsSourceAddon.prototype).setData;

function mk() {
    const b = Object.create(DocumentsSourceAddon.prototype);
    b.state = {};
    return b;
}

function makeRef(options, dbOverrides = {}, refOverrides = {}) {
    const calls = { vc: [], did: [], approval: [], updates: [] };
    const ref = {
        uuid: 'src-uuid',
        blockType: 'documentsSourceAddon',
        policyId: 'p1',
        tag: 'src-tag',
        parent: { id: 'parent' },
        async getOptions() { return options; },
        async getFilters() { return {}; },
        getSelectiveAttributes() { return []; },
        databaseServer: {
            async getVcDocuments(f, o, c) { calls.vc.push({ f, o, c }); return [{ id: '1', option: {} }]; },
            async getDidDocuments(f, o, c) { calls.did.push({ f, o, c }); return [{ id: 'd', option: {} }]; },
            async getApprovalDocuments(f, o, c) { calls.approval.push({ f }); return [{ id: 'a', option: {} }]; },
            ...dbOverrides,
        },
        ...refOverrides,
    };
    return { ref, calls };
}

function withRef(ref, calls, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    PolicyComponentsUtils.BlockUpdateFn = (p, u) => { calls.updates.push({ p, u }); };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.BlockUpdateFn = origUpdate;
});

describe('DocumentsSourceAddon runtime — getFromSource (filter building)', () => {
    it('throws when filters option is not an array', async () => {
        const block = mk();
        const { ref } = makeRef({ dataType: 'vc-documents', filters: 'nope' });
        let threw = null;
        await withRef(ref, {}, async () => {
            try { await block.getFromSource({ id: 'u', did: 'did:u' }, null, false); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /filters option must be an array/);
    });

    it('adds owner/schema/initId filters and queries VC documents', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            dataType: 'vc-documents',
            filters: [],
            onlyOwnDocuments: true,
            schema: '#Foo',
        });
        await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'did:u' }, null, false));
        assert.lengthOf(calls.vc, 1);
        const f = calls.vc[0].f;
        assert.equal(f.owner, 'did:u');
        assert.equal(f.schema, '#Foo');
        assert.deepEqual(f.initId, { $exists: false });
        assert.equal(f.policyId, 'p1');
    });

    it('translates a configured equal filter into an $eq expression', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            dataType: 'vc-documents',
            filters: [{ field: 'status', type: 'equal', value: 'approved' }],
        });
        await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'd' }, null, false));
        assert.deepEqual(calls.vc[0].f.status, { $eq: 'approved' });
    });

    it('throws on an unknown configured filter type', async () => {
        const block = mk();
        const { ref } = makeRef({
            dataType: 'vc-documents',
            filters: [{ field: 'x', type: 'bogus', value: 'y' }],
        });
        let threw = null;
        await withRef(ref, {}, async () => {
            try { await block.getFromSource({ id: 'u', did: 'd' }, null, false); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /Unknown filter type/);
    });

    it('merges in global filters', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ dataType: 'vc-documents', filters: [] });
        await withRef(ref, {}, () =>
            block.getFromSource({ id: 'u', did: 'd' }, { extra: 1 }, false));
        assert.equal(calls.vc[0].f.extra, 1);
    });

    it('tags results with the source tag when not counting', async () => {
        const block = mk();
        const { ref } = makeRef({ dataType: 'vc-documents', filters: [] });
        const data = await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'd' }, null, false));
        assert.equal(data[0].__sourceTag__, 'src-tag');
    });

    it('routes to did-documents for that dataType', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ dataType: 'did-documents', filters: [] });
        await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'd' }, null, false));
        assert.lengthOf(calls.did, 1);
    });

    it('routes to approval documents for the approve dataType', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ dataType: 'approve', filters: [] });
        await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'd' }, null, false));
        assert.lengthOf(calls.approval, 1);
    });

    it('returns an empty array when counting the source dataType', async () => {
        const block = mk();
        const { ref } = makeRef({ dataType: 'source', filters: [] });
        const count = await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'd' }, null, true));
        assert.deepEqual(count, []);
    });

    it('throws for an unknown dataType', async () => {
        const block = mk();
        const { ref } = makeRef({ dataType: 'mystery', filters: [] });
        let threw = null;
        await withRef(ref, {}, async () => {
            try { await block.getFromSource({ id: 'u', did: 'd' }, null, false); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /is unknown/);
    });

    it('orders by configured field/direction', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            dataType: 'vc-documents',
            filters: [],
            orderDirection: 'DESC',
            orderField: 'createDate',
        });
        await withRef(ref, {}, () => block.getFromSource({ id: 'u', did: 'd' }, null, false));
        assert.deepEqual(calls.vc[0].o.orderBy, { createDate: 'DESC' });
    });
});

describe('DocumentsSourceAddon runtime — getFromSourceFilters', () => {
    it('throws when filters option is not an array', async () => {
        const block = mk();
        const { ref } = makeRef({ filters: null });
        let threw = null;
        await withRef(ref, {}, async () => {
            try { await block.getFromSourceFilters({ id: 'u', did: 'd' }, null); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /filters option must be an array/);
    });

    it('returns an aggregation $set blockFilter', async () => {
        const block = mk();
        const { ref } = makeRef({ filters: [] });
        const out = await withRef(ref, {}, () => block.getFromSourceFilters({ id: 'u', did: 'd' }, null));
        assert.property(out, '$set');
        assert.property(out.$set, '__sourceTag__');
    });
});

describe('DocumentsSourceAddon runtime — setData', () => {
    it('stores state per user and triggers a block update', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ filters: [] });
        await withRef(ref, calls, () =>
            rawSetData.call(block, { id: 'u' }, { orderField: 'x', orderDirection: 'asc' }));
        assert.deepEqual(block.state.u, { orderField: 'x', orderDirection: 'asc' });
        assert.lengthOf(calls.updates, 1);
    });
});
