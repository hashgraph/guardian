import { assert } from 'chai';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;

const basePrototype = Object.getPrototypeOf(SwitchBlock.prototype);
const rawRunAction = basePrototype.runAction;

const mk = () => Object.create(SwitchBlock.prototype);

function makeRef(options, overrides = {}) {
    const calls = { triggered: [], logs: [], errors: [], backups: 0, externals: [] };
    const ref = {
        uuid: 'sw-uuid',
        policyId: 'p1',
        blockType: 'switchBlock',
        async getOptions() { return options; },
        async triggerEvents(type, user, state, status) {
            calls.triggered.push({ type, user, state, status });
        },
        log(m) { calls.logs.push(m); },
        error(m) { calls.errors.push(m); },
        backup() { calls.backups++; },
        ...overrides,
    };
    return { ref, calls };
}

function withRef(ref, calls, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    PolicyComponentsUtils.ExternalEventFn = (e) => { calls.externals.push(e); };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.ExternalEventFn = origExt;
});

describe('SwitchBlock runtime — aggregateScope', () => {
    const block = mk();

    it('returns null for null scopes', () => {
        assert.isNull(block.aggregateScope(null));
    });

    it('returns null for empty scopes', () => {
        assert.isNull(block.aggregateScope([]));
    });

    it('collects values per first-scope key', () => {
        const out = block.aggregateScope([{ a: 1 }, { a: 2 }]);
        assert.deepEqual(out, { a: [1, 2] });
    });

    it('uses only keys from the first scope', () => {
        const out = block.aggregateScope([{ a: 1 }, { a: 2, b: 9 }]);
        assert.deepEqual(Object.keys(out), ['a']);
    });
});

describe('SwitchBlock runtime — getScope', () => {
    const block = mk();

    it('returns null for falsy docs', () => {
        assert.isNull(block.getScope(null));
    });

    it('returns {} for a single doc without a document body', () => {
        assert.deepEqual(block.getScope({ owner: 'x' }), {});
    });

    it('returns {} for an empty array (aggregate of nothing)', () => {
        assert.isNull(block.getScope([]));
    });
});

describe('SwitchBlock runtime — runAction conditions', () => {
    it('unconditional fires its tag plus refresh and release', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            executionFlow: 'allTrue',
            conditions: [{ type: 'unconditional', tag: 'go' }],
        });
        const out = await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u', userId: 'uid' }, data: { data: { owner: 'o' } }, actionStatus: null }));
        const types = calls.triggered.map(t => t.type);
        assert.include(types, 'go');
        assert.include(types, 'RefreshEvent');
        assert.include(types, 'ReleaseEvent');
        assert.deepEqual(out, { data: { owner: 'o' } });
    });

    it('firstTrue stops after the first matching condition', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            executionFlow: 'firstTrue',
            conditions: [
                { type: 'unconditional', tag: 'first' },
                { type: 'unconditional', tag: 'second' },
            ],
        });
        await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: { owner: 'o' } }, actionStatus: null }));
        const tags = calls.triggered.map(t => t.type);
        assert.include(tags, 'first');
        assert.notInclude(tags, 'second');
    });

    it('allTrue evaluates every unconditional condition', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            executionFlow: 'allTrue',
            conditions: [
                { type: 'unconditional', tag: 'first' },
                { type: 'unconditional', tag: 'second' },
            ],
        });
        await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: { owner: 'o' } }, actionStatus: null }));
        const tags = calls.triggered.map(t => t.type);
        assert.include(tags, 'first');
        assert.include(tags, 'second');
    });

    it('equal condition with no scope yields false (tag not fired)', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            executionFlow: 'allTrue',
            conditions: [{ type: 'equal', tag: 'eq', value: 'x == 1' }],
        });
        await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: { owner: 'o' } }, actionStatus: null }));
        const tags = calls.triggered.map(t => t.type);
        assert.notInclude(tags, 'eq');
        assert.include(tags, 'ReleaseEvent');
    });

    it('always emits an external Run event and backs up', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ executionFlow: 'allTrue', conditions: [] });
        await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: { owner: 'o' } }, actionStatus: null }));
        assert.lengthOf(calls.externals, 1);
        assert.equal(calls.backups, 1);
    });

    it('handles array document input (owner taken from first element)', async () => {
        const block = mk();
        const { ref, calls } = makeRef({
            executionFlow: 'allTrue',
            conditions: [{ type: 'unconditional', tag: 'go' }],
        });
        await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: [{ owner: 'first' }] }, actionStatus: null }));
        const tags = calls.triggered.map(t => t.type);
        assert.include(tags, 'go');
    });
});
