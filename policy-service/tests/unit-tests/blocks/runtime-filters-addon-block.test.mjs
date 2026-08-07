import { assert } from 'chai';
import { FiltersAddonBlock } from '../../../dist/policy-engine/blocks/filters-addon-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;

const rawSetData = Object.getPrototypeOf(FiltersAddonBlock.prototype).setData;

function mk() {
    const b = Object.create(FiltersAddonBlock.prototype);
    b.previousState = {};
    b.previousFilters = {};
    b.state = { lastData: null, lastValue: null };
    return b;
}

function makeRef(options, sources = [], overrides = {}) {
    const calls = { setFilters: [], externals: [] };
    const ref = {
        uuid: 'flt-uuid',
        blockType: 'filtersAddon',
        actionType: 'local',
        filters: {},
        async getOptions() { return options; },
        async getSources() { return sources; },
        setFilters(f, user) { calls.setFilters.push({ f, user }); ref.filters[user.id] = f; },
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

describe('FiltersAddonBlock runtime — addQuery', () => {
    it('writes an $eq expression for the configured field', async () => {
        const block = mk();
        const { ref } = makeRef({ field: 'colour', queryType: 'equal' });
        const filter = {};
        await withRef(ref, {}, () => block.addQuery(filter, 'red', { id: 'u' }));
        assert.deepEqual(filter.colour, { $eq: 'red' });
    });

    it('writes an $in expression for an in query', async () => {
        const block = mk();
        const { ref } = makeRef({ field: 'tag', queryType: 'in' });
        const filter = {};
        await withRef(ref, {}, () => block.addQuery(filter, 'a,b', { id: 'u' }));
        assert.deepEqual(filter.tag, { $in: ['a', 'b'] });
    });
});

describe('FiltersAddonBlock runtime — checkValues', () => {
    const block = mk();
    const { ref } = makeRef({ queryType: 'equal' });

    it('returns false when lastData is not an array', async () => {
        const out = await withRef(ref, {}, () =>
            block.checkValues({ lastData: null }, 'x', { id: 'u' }));
        assert.isFalse(out);
    });

    it('returns true when a scalar value is present in lastData', async () => {
        const out = await withRef(ref, {}, () =>
            block.checkValues({ lastData: [{ value: 'a' }, { value: 'b' }] }, 'b', { id: 'u' }));
        assert.isTrue(out);
    });

    it('returns false when the scalar value is absent', async () => {
        const out = await withRef(ref, {}, () =>
            block.checkValues({ lastData: [{ value: 'a' }] }, 'z', { id: 'u' }));
        assert.isFalse(out);
    });
});

describe('FiltersAddonBlock runtime — getData', () => {
    it('builds dropdown data and dedupes by value', async () => {
        const block = mk();
        const options = { type: 'dropdown', optionName: 'name', optionValue: 'id', canBeEmpty: true };
        const sources = [
            { id: '1', name: 'One' },
            { id: '1', name: 'One dup' },
            { id: '2', name: 'Two' },
        ];
        const { ref } = makeRef(options, sources);
        const data = await withRef(ref, {}, () => block.getData({ id: 'u' }));
        assert.equal(data.type, 'dropdown');
        assert.lengthOf(data.data, 2);
        assert.deepEqual(data.data.map(d => d.value), ['1', '2']);
    });

    it('returns the stored filterValue for input type', async () => {
        const block = mk();
        block.state.u = { lastValue: 'typed' };
        const options = { type: 'input', canBeEmpty: true };
        const { ref } = makeRef(options, []);
        const data = await withRef(ref, {}, () => block.getData({ id: 'u' }));
        assert.equal(data.type, 'input');
        assert.equal(data.filterValue, 'typed');
    });

    it('marks readonly for REMOTE block + REMOTE user', async () => {
        const block = mk();
        const { ref } = makeRef({ type: 'input', canBeEmpty: true }, [], { actionType: 'remote' });
        const data = await withRef(ref, {}, () => block.getData({ id: 'u', location: 'remote' }));
        assert.isTrue(data.readonly);
    });
});

describe('FiltersAddonBlock runtime — resetFilters', () => {
    it('restores previousState and previousFilters and clears them', async () => {
        const block = mk();
        block.previousState.u = { lastValue: 'old' };
        block.previousFilters.u = { f: 1 };
        const { ref } = makeRef({});
        await withRef(ref, {}, () => block.resetFilters({ id: 'u' }));
        assert.deepEqual(block.state.u, { lastValue: 'old' });
        assert.deepEqual(ref.filters.u, { f: 1 });
        assert.isUndefined(block.previousState.u);
        assert.isUndefined(block.previousFilters.u);
    });

    it('is a no-op when there is nothing to restore', async () => {
        const block = mk();
        const { ref } = makeRef({});
        await withRef(ref, {}, () => block.resetFilters({ id: 'u' }));
        assert.isUndefined(block.state.u);
    });
});

describe('FiltersAddonBlock runtime — setFiltersStrict', () => {
    it('throws when data is missing', async () => {
        const block = mk();
        const { ref } = makeRef({ type: 'input' });
        let threw = null;
        await withRef(ref, {}, async () => {
            try { await block.setFiltersStrict({ id: 'u' }, null); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /filter value is unknown/);
    });

    it('throws when value empty and canBeEmpty is false (input)', async () => {
        const block = mk();
        const { ref } = makeRef({ type: 'input', canBeEmpty: false });
        let threw = null;
        await withRef(ref, {}, async () => {
            try { await block.setFiltersStrict({ id: 'u' }, { filterValue: '' }); }
            catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
    });

    it('applies the filter for a non-empty input value', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ type: 'input', field: 'q', queryType: 'equal', canBeEmpty: false });
        await withRef(ref, calls, () => block.setFiltersStrict({ id: 'u' }, { filterValue: 'hello' }));
        assert.lengthOf(calls.setFilters, 1);
        assert.deepEqual(calls.setFilters[0].f.q, { $eq: 'hello' });
        assert.equal(block.state.u.lastValue, 'hello');
    });
});

describe('FiltersAddonBlock runtime — setData', () => {
    it('delegates to setFilterState and emits an external Set event', async () => {
        const block = mk();
        const { ref, calls } = makeRef({ type: 'input', field: 'q', queryType: 'equal', canBeEmpty: false });
        await withRef(ref, calls, () => rawSetData.call(block, { id: 'u' }, { filterValue: 'v' }));
        assert.lengthOf(calls.setFilters, 1);
        assert.lengthOf(calls.externals, 1);
    });
});
