import { assert } from 'chai';
import { InterfaceDocumentsSource } from '../../../dist/policy-engine/blocks/documents-source.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;
const origUpdate = PolicyComponentsUtils.BlockUpdateFn;

const basePrototype = Object.getPrototypeOf(InterfaceDocumentsSource.prototype);
const rawSetData = basePrototype.setData;
const rawOnAddonEvent = basePrototype.onAddonEvent;

function mk() {
    const b = Object.create(InterfaceDocumentsSource.prototype);
    b.state = {};
    return b;
}

function makeRef(options, overrides = {}) {
    const calls = { triggered: [], externals: [], updates: [], agg: [] };
    const ref = {
        uuid: 'ds-uuid',
        blockType: 'interfaceDocumentsSourceBlock',
        actionType: 'local',
        policyId: 'p1',
        parent: { id: 'parent' },
        async getOptions() { return options; },
        async getGlobalSources() { return overrides.sources || []; },
        async getGlobalSourcesFilters() { return overrides.filtersAndDataType || { filters: [], dataType: 'vc-documents' }; },
        async triggerEvents(tag, user, state, status) { calls.triggered.push({ tag, user, state, status }); },
        databaseServer: {
            getDocumentAggregationFilters(arg) { calls.agg.push(arg); },
            getDryRun() { return false; },
            async getVcDocumentsByAggregation() { return overrides.aggResult || []; },
            async getDidDocumentsByAggregation() { return overrides.aggResult || []; },
            async getApprovalDocumentsByAggregation() { return overrides.aggResult || []; },
        },
        ...overrides.ref,
    };
    return { ref, calls };
}

function withRef(ref, calls, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    PolicyComponentsUtils.ExternalEventFn = (e) => { calls.externals.push(e); };
    PolicyComponentsUtils.BlockUpdateFn = (p, u) => { calls.updates.push({ p, u }); };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.ExternalEventFn = origExt;
    PolicyComponentsUtils.BlockUpdateFn = origUpdate;
});

describe('InterfaceDocumentsSource runtime — setData', () => {
    it('stores per-user state and fires update + external Set', async () => {
        const block = mk();
        const { ref, calls } = makeRef({});
        await withRef(ref, calls, () => rawSetData.call(block, { id: 'u' }, { foo: 1 }));
        assert.deepEqual(block.state.u, { foo: 1 });
        assert.lengthOf(calls.updates, 1);
        assert.lengthOf(calls.externals, 1);
    });
});

describe('InterfaceDocumentsSource runtime — _getData', () => {
    it('uses getGlobalSources when common sorting is off', async () => {
        const block = mk();
        let used = null;
        const { ref } = makeRef({}, {
            ref: {
                async getGlobalSources() { used = 'global'; return [{ id: 'x' }]; },
            },
        });
        const out = await withRef(ref, {}, () => block._getData({ id: 'u' }, ref, false, {}, null, undefined, undefined));
        assert.equal(used, 'global');
        assert.deepEqual(out, [{ id: 'x' }]);
    });

    it('uses aggregation path when common sorting is on', async () => {
        const block = mk();
        const { ref, calls } = makeRef({}, { aggResult: [{ id: 'agg' }] });
        const out = await withRef(ref, calls, () =>
            block._getData({ id: 'u' }, ref, true, {}, null, undefined, undefined));
        assert.deepEqual(out, [{ id: 'agg' }]);
        assert.isAbove(calls.agg.length, 0);
    });
});

describe('InterfaceDocumentsSource runtime — onAddonEvent', () => {
    it('throws when the target document is not present', async () => {
        const block = mk();
        const { ref } = makeRef({ uiMetaData: { fields: [] } }, { sources: [{ id: 'a' }] });
        let threw = null;
        await withRef(ref, {}, async () => {
            try {
                await rawOnAddonEvent.call(block, { id: 'u' }, 'tag', 'missing', async () => ({ data: {} }), null);
            } catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /Document is not found/);
    });

    it('runs the handler and triggers the tag event when found', async () => {
        const block = mk();
        const { ref, calls } = makeRef(
            { uiMetaData: { fields: [] } },
            { sources: [{ id: 'a', __sourceTag__: null }] });
        await withRef(ref, calls, () =>
            rawOnAddonEvent.call(block, { id: 'u' }, 'btn', 'a', async (doc) => ({ data: { ...doc, handled: true } }), null));
        assert.lengthOf(calls.triggered, 1);
        assert.equal(calls.triggered[0].tag, 'btn');
        assert.isTrue(calls.triggered[0].state.data.handled);
        assert.lengthOf(calls.externals, 1);
    });
});

describe('InterfaceDocumentsSource runtime — getDataByAggregationFilters dispatch', () => {
    it('queries VC documents for the vc-documents dataType', async () => {
        const block = mk();
        const { ref, calls } = makeRef({}, {
            filtersAndDataType: { filters: [], dataType: 'vc-documents' },
            aggResult: [{ id: 'vc' }],
        });
        const out = await withRef(ref, calls, () =>
            block.getDataByAggregationFilters(ref, { id: 'u' }, {}, null, null, undefined));
        assert.deepEqual(out, [{ id: 'vc' }]);
    });

    it('returns [] for an unknown dataType', async () => {
        const block = mk();
        const { ref, calls } = makeRef({}, {
            filtersAndDataType: { filters: [], dataType: 'unknown' },
        });
        const out = await withRef(ref, calls, () =>
            block.getDataByAggregationFilters(ref, { id: 'u' }, {}, null, null, undefined));
        assert.deepEqual(out, []);
    });

    it('adds a SORT aggregation stage when sortState is provided', async () => {
        const block = mk();
        const { ref, calls } = makeRef({}, {
            filtersAndDataType: { filters: [], dataType: 'did-documents' },
        });
        await withRef(ref, calls, () =>
            block.getDataByAggregationFilters(ref, { id: 'u' },
                { orderField: 'createDate', orderDirection: 'desc' }, null, null, undefined));
        const sortStage = calls.agg.find(a => a.sortObject);
        assert.isOk(sortStage);
        assert.deepEqual(sortStage.sortObject, { createDate: -1 });
    });
});
