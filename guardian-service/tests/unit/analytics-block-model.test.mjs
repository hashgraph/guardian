import assert from 'node:assert/strict';
import { BlockModel } from '../../dist/analytics/compare/models/index.js';

const raw = (overrides = {}) => ({
    blockType: 'policyRolesBlock',
    tag: 'roles',
    events: [],
    artifacts: [],
    ...overrides
});

describe('BlockModel', () => {
    it('captures blockType, tag and index', () => {
        const b = new BlockModel(raw(), 3);
        assert.equal(b.blockType, 'policyRolesBlock');
        assert.equal(b.tag, 'roles');
        assert.equal(b.index, 3);
    });

    it('key getter returns the block type', () => {
        assert.equal(new BlockModel(raw(), 0).key, 'policyRolesBlock');
    });

    it('equalKey compares by block type', () => {
        const a = new BlockModel(raw(), 0);
        const same = new BlockModel(raw(), 1);
        const other = new BlockModel(raw({ blockType: 'interfaceActionBlock' }), 2);
        assert.equal(a.equalKey(same), true);
        assert.equal(a.equalKey(other), false);
    });

    it('starts with no children and appends via addChildren', () => {
        const b = new BlockModel(raw(), 0);
        assert.deepEqual(b.children, []);
        const child = new BlockModel(raw({ tag: 'child' }), 1);
        b.addChildren(child);
        assert.equal(b.children.length, 1);
        assert.equal(b.children[0], child);
    });

    it('builds an event list from json.events', () => {
        const b = new BlockModel(raw({ events: [{ source: 'a' }, { source: 'b' }] }), 0);
        assert.equal(b.getEventList().length, 2);
    });

    it('returns an empty event list when events is absent', () => {
        const b = new BlockModel(raw({ events: undefined }), 0);
        assert.deepEqual(b.getEventList(), []);
    });

    it('builds an artifact list from json.artifacts', () => {
        const b = new BlockModel(raw({ artifacts: [{ uuid: 'a1' }] }), 0);
        assert.equal(b.getArtifactsList().length, 1);
    });

    it('returns an empty artifact list when artifacts is absent', () => {
        const b = new BlockModel(raw({ artifacts: undefined }), 0);
        assert.deepEqual(b.getArtifactsList(), []);
    });

    it('getPropList and getPermissionsList return arrays', () => {
        const b = new BlockModel(raw(), 0);
        assert.ok(Array.isArray(b.getPropList()));
        assert.ok(Array.isArray(b.getPermissionsList()));
    });

    it('starts with empty weights and a zero max weight', () => {
        const b = new BlockModel(raw(), 0);
        assert.deepEqual(b.getWeights(), []);
        assert.equal(b.maxWeight(), 0);
        assert.equal(b.getWeight(), undefined);
    });

    it('toObject exposes index/blockType/tag plus properties and events', () => {
        const b = new BlockModel(raw({ events: [{ source: 'a' }] }), 5);
        const obj = b.toObject();
        assert.equal(obj.index, 5);
        assert.equal(obj.blockType, 'policyRolesBlock');
        assert.equal(obj.tag, 'roles');
        assert.ok('properties' in obj);
        assert.equal(obj.events.length, 1);
    });
});
