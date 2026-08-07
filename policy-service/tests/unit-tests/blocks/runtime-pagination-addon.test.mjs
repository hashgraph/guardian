import { assert } from 'chai';
import { PaginationAddon } from '../../../dist/policy-engine/blocks/pagination-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;
const origUpdate = PolicyComponentsUtils.BlockUpdateFn;

const mk = () => {
    const b = Object.create(PaginationAddon.prototype);
    b.state = {};
    b.prevState = {};
    return b;
};

function makeRef(totalCount = 100, overrides = {}) {
    const calls = { sources: [], backups: 0, externals: [], updates: [] };
    const ref = {
        uuid: 'pag-uuid',
        blockType: 'paginationAddon',
        actionType: 'local',
        parent: {
            async getGlobalSources(user, data, count) {
                calls.sources.push({ user, data, count });
                return totalCount;
            },
        },
        backup() { calls.backups++; },
        ...overrides,
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

describe('PaginationAddon runtime — getState', () => {
    it('initialises default state for a new user', async () => {
        const block = mk();
        const { ref } = makeRef(100);
        const state = await withRef(ref, {}, () => block.getState({ id: 'u1', location: 'local' }));
        assert.equal(state.itemsPerPage, 10);
        assert.equal(state.page, 0);
        assert.equal(state.id, 'pag-uuid');
        assert.equal(state.blockType, 'paginationAddon');
    });

    it('overwrites size with the live total count', async () => {
        const block = mk();
        const { ref } = makeRef(57);
        const state = await withRef(ref, {}, () => block.getState({ id: 'u1', location: 'local' }));
        assert.equal(state.size, 57);
    });

    it('keeps existing page/itemsPerPage across calls', async () => {
        const block = mk();
        block.state.u1 = { size: 5, itemsPerPage: 25, page: 3 };
        const { ref } = makeRef(99);
        const state = await withRef(ref, {}, () => block.getState({ id: 'u1', location: 'local' }));
        assert.equal(state.itemsPerPage, 25);
        assert.equal(state.page, 3);
        assert.equal(state.size, 99);
    });

    it('marks readonly when REMOTE block and REMOTE user', async () => {
        const block = mk();
        const { ref } = makeRef(10, { actionType: 'remote' });
        const state = await withRef(ref, {}, () => block.getState({ id: 'u1', location: 'remote' }));
        assert.isTrue(state.readonly);
    });

    it('is not readonly when user is local', async () => {
        const block = mk();
        const { ref } = makeRef(10, { actionType: 'remote' });
        const state = await withRef(ref, {}, () => block.getState({ id: 'u1', location: 'local' }));
        assert.isFalse(state.readonly);
    });
});

describe('PaginationAddon runtime — setState', () => {
    it('stores prevState and applies new values', async () => {
        const block = mk();
        block.state.u1 = { size: 10, itemsPerPage: 10, page: 0 };
        const { ref } = makeRef(10);
        await withRef(ref, {}, () =>
            block.setState({ id: 'u1', location: 'local' }, { size: 1, itemsPerPage: 50, page: 2 }));
        assert.equal(block.state.u1.itemsPerPage, 50);
        assert.equal(block.state.u1.page, 2);
        assert.deepEqual(block.prevState.u1, { size: 10, itemsPerPage: 10, page: 0 });
    });

    it('corrects size to live total count', async () => {
        const block = mk();
        const { ref } = makeRef(33);
        await withRef(ref, {}, () =>
            block.setState({ id: 'u1', location: 'local' }, { size: 99, itemsPerPage: 10, page: 0 }));
        assert.equal(block.state.u1.size, 33);
    });
});

describe('PaginationAddon runtime — resetPagination', () => {
    it('restores prevState and clears it', async () => {
        const block = mk();
        block.prevState.u1 = { size: 1, itemsPerPage: 10, page: 9 };
        block.state.u1 = { size: 2, itemsPerPage: 20, page: 1 };
        await block.resetPagination({ id: 'u1' });
        assert.deepEqual(block.state.u1, { size: 1, itemsPerPage: 10, page: 9 });
        assert.isUndefined(block.prevState.u1);
    });

    it('is a no-op when there is no prevState', async () => {
        const block = mk();
        block.state.u1 = { size: 2, itemsPerPage: 20, page: 1 };
        await block.resetPagination({ id: 'u1' });
        assert.deepEqual(block.state.u1, { size: 2, itemsPerPage: 20, page: 1 });
    });
});

describe('PaginationAddon runtime — getData', () => {
    it('delegates to getState', async () => {
        const block = mk();
        const { ref } = makeRef(12);
        const data = await withRef(ref, {}, () => block.getData({ id: 'u1', location: 'local' }));
        assert.equal(data.size, 12);
        assert.equal(data.itemsPerPage, 10);
    });
});

describe('PaginationAddon runtime — setData', () => {
    it('stores raw data, fires update/external, backs up', async () => {
        const block = mk();
        const calls = { externals: [], updates: [] };
        const { ref } = makeRef(10);
        await withRef(ref, calls, () =>
            block.setData({ id: 'u1' }, { itemsPerPage: 5, page: 7 }));
        assert.deepEqual(block.state.u1, { itemsPerPage: 5, page: 7 });
        assert.lengthOf(calls.updates, 1);
        assert.lengthOf(calls.externals, 1);
    });
});
