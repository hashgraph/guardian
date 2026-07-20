import { assert } from 'chai';
import { DropdownBlockAddon } from '../../../dist/policy-engine/blocks/dropdown-block-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;

const basePrototype = Object.getPrototypeOf(DropdownBlockAddon.prototype);
const rawGetData = basePrototype.getData;
const rawSetData = basePrototype.setData;

const mk = () => Object.create(DropdownBlockAddon.prototype);

function makeRef(options, sources, overrides = {}) {
    const calls = { backups: 0, addon: [] };
    const ref = {
        uuid: 'dd-uuid',
        blockType: 'dropdownBlockAddon',
        actionType: 'local',
        tag: 'dd-tag',
        async getOptions() { return options; },
        async getSources() { return sources; },
        backup() { calls.backups++; },
        parent: { id: 'parent' },
        ...overrides,
    };
    return { ref, calls };
}

function withRef(ref, parentRef, fn) {
    PolicyComponentsUtils.GetBlockRef = (target) => {
        if (parentRef && target === ref.parent) {
            return parentRef;
        }
        return ref;
    };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
});

describe('DropdownBlockAddon runtime — getData', () => {
    const options = { optionName: 'name', optionValue: 'id', field: 'choice' };

    it('maps each source document to {name, optionValue, value}', async () => {
        const block = mk();
        const sources = [
            { id: 'a', name: 'Alpha' },
            { id: 'b', name: 'Beta' },
        ];
        const { ref } = makeRef(options, sources);
        const data = await withRef(ref, null, () => rawGetData.call(block, { id: 'u1', location: 'local' }));
        assert.deepEqual(data.documents, [
            { name: 'Alpha', optionValue: 'a', value: 'a' },
            { name: 'Beta', optionValue: 'b', value: 'b' },
        ]);
    });

    it('spreads block options onto the result', async () => {
        const block = mk();
        const { ref } = makeRef(options, []);
        const data = await withRef(ref, null, () => rawGetData.call(block, { id: 'u1', location: 'local' }));
        assert.equal(data.field, 'choice');
        assert.equal(data.optionName, 'name');
        assert.deepEqual(data.documents, []);
    });

    it('readonly true for REMOTE block + REMOTE user', async () => {
        const block = mk();
        const { ref } = makeRef(options, [], { actionType: 'remote' });
        const data = await withRef(ref, null, () => rawGetData.call(block, { id: 'u1', location: 'remote' }));
        assert.isTrue(data.readonly);
    });
});

describe('DropdownBlockAddon runtime — setData', () => {
    const options = { optionName: 'name', optionValue: 'id', field: 'choice' };

    it('throws when the chosen document is not in the sources', async () => {
        const block = mk();
        const { ref } = makeRef(options, [{ id: 'a' }]);
        let threw = null;
        await withRef(ref, {}, async () => {
            try {
                await rawSetData.call(block, { id: 'u1' }, { dropdownDocumentId: 'missing', documentId: 'd1' });
            } catch (e) { threw = e; }
        });
        assert.isNotNull(threw);
        assert.match(threw.message, /doesn't exist in dropdown options/);
    });

    it('invokes parent.onAddonEvent and applies the selected value, then backs up', async () => {
        const block = mk();
        const sources = [{ id: 'a', id2: 'val-a' }];
        const opts = { optionName: 'name', optionValue: 'id2', field: 'choice' };
        const { ref, calls } = makeRef(opts, sources);
        const parentCalls = [];
        const parentRef = {
            async onAddonEvent(user, tag, documentId, handler) {
                const result = handler({ existing: true });
                parentCalls.push({ user, tag, documentId, result });
            },
        };
        await withRef(ref, parentRef, () =>
            rawSetData.call(block, { id: 'u1' }, { dropdownDocumentId: 'a', documentId: 'd1' }));
        assert.lengthOf(parentCalls, 1);
        assert.equal(parentCalls[0].tag, 'dd-tag');
        assert.equal(parentCalls[0].documentId, 'd1');
        assert.equal(parentCalls[0].result.data.choice, 'val-a');
        assert.equal(calls.backups, 1);
    });
});
