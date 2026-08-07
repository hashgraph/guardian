import { assert } from 'chai';
import { TimerBlock } from '../../../dist/policy-engine/blocks/timer-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;

const basePrototype = Object.getPrototypeOf(TimerBlock.prototype);
const rawRunAction = basePrototype.runAction;
const rawStartAction = basePrototype.startAction;
const rawStopAction = basePrototype.stopAction;
const rawTickCron = basePrototype.tickCron;

function mk() {
    const b = Object.create(TimerBlock.prototype);
    b.state = {};
    return b;
}

function makeRef(overrides = {}) {
    const calls = { triggered: [], logs: [], saved: 0, backups: 0, externals: [] };
    const ref = {
        uuid: 'tm-uuid',
        blockType: 'timerBlock',
        async getOptions() { return {}; },
        async triggerEvents(type, user, state, status) {
            calls.triggered.push({ type, user, state, status });
        },
        async saveState() { calls.saved++; },
        log(m) { calls.logs.push(m); },
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

describe('TimerBlock runtime — getUserId', () => {
    const block = mk();

    it('returns null when there is no document', () => {
        assert.isNull(block.getUserId({ data: {} }));
    });

    it('returns owner for a single non-group document', () => {
        assert.equal(block.getUserId({ data: { data: { owner: 'did:1' } } }), 'did:1');
    });

    it('returns group:owner for a grouped document', () => {
        assert.equal(block.getUserId({ data: { data: { owner: 'd', group: 'g' } } }), 'g:d');
    });

    it('uses the first element of an array document', () => {
        assert.equal(block.getUserId({ data: { data: [{ owner: 'd1' }, { owner: 'd2' }] } }), 'd1');
    });

    it('returns null for an empty array document', () => {
        assert.isNull(block.getUserId({ data: { data: [] } }));
    });
});

describe('TimerBlock runtime — runAction', () => {
    it('marks the user active and fires run/release/refresh', async () => {
        const block = mk();
        const { ref, calls } = makeRef();
        const out = await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: { owner: 'did:1' } }, actionStatus: null }));
        assert.isTrue(block.state['did:1']);
        const types = calls.triggered.map(t => t.type);
        assert.include(types, 'RunEvent');
        assert.include(types, 'ReleaseEvent');
        assert.include(types, 'RefreshEvent');
        assert.equal(calls.saved, 1);
        assert.equal(calls.backups, 1);
        assert.deepEqual(out, { data: { owner: 'did:1' } });
    });

    it('still saves state and triggers events without a resolvable user id', async () => {
        const block = mk();
        const { ref, calls } = makeRef();
        await withRef(ref, calls, () =>
            rawRunAction.call(block, { user: { id: 'u' }, data: { data: {} }, actionStatus: null }));
        assert.deepEqual(block.state, {});
        assert.equal(calls.saved, 1);
    });
});

describe('TimerBlock runtime — startAction / stopAction', () => {
    it('startAction sets state true and saves', async () => {
        const block = mk();
        const { ref, calls } = makeRef();
        await withRef(ref, calls, () =>
            rawStartAction.call(block, { data: { data: { owner: 'd1' } } }));
        assert.isTrue(block.state.d1);
        assert.equal(calls.saved, 1);
        assert.equal(calls.backups, 1);
    });

    it('stopAction sets state false and saves', async () => {
        const block = mk();
        block.state.d1 = true;
        const { ref, calls } = makeRef();
        await withRef(ref, calls, () =>
            rawStopAction.call(block, { data: { data: { owner: 'd1' } } }));
        assert.isFalse(block.state.d1);
        assert.equal(calls.saved, 1);
    });
});

describe('TimerBlock runtime — tickCron', () => {
    it('fires the timer event with only active users', async () => {
        const block = mk();
        block.state = { a: true, b: false, c: true };
        const { ref, calls } = makeRef();
        await withRef(ref, calls, () => rawTickCron.call(block, ref));
        const timer = calls.triggered.find(t => t.type === 'TimerEvent');
        assert.isOk(timer);
        assert.deepEqual(timer.state.sort(), ['a', 'c']);
        assert.equal(calls.backups, 1);
        assert.lengthOf(calls.externals, 1);
    });

    it('fires the timer event with an empty map when no active users', async () => {
        const block = mk();
        block.state = { a: false };
        const { ref, calls } = makeRef();
        await withRef(ref, calls, () => rawTickCron.call(block, ref));
        const timer = calls.triggered.find(t => t.type === 'TimerEvent');
        assert.deepEqual(timer.state, []);
    });
});
