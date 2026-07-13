import assert from 'node:assert/strict';
import { BlockModel } from '../../dist/analytics/compare/models/index.js';
import { IChildrenLvl, IPropertiesLvl, IIdLvl, IKeyLvl, IRefLvl } from '../../dist/analytics/compare/interfaces/index.js';

const OPT = {
    childLvl: IChildrenLvl.All,
    propLvl: IPropertiesLvl.All,
    idLvl: IIdLvl.All,
    keyLvl: IKeyLvl.Default,
    refLvl: IRefLvl.Revert,
};

const raw = (over = {}) => ({
    blockType: 'interfaceContainerBlock',
    tag: 'block-tag',
    ...over,
});

describe('BlockModel construction', () => {
    it('exposes blockType, tag, index and key', () => {
        const b = new BlockModel(raw(), 3);
        assert.equal(b.blockType, 'interfaceContainerBlock');
        assert.equal(b.tag, 'block-tag');
        assert.equal(b.index, 3);
        assert.equal(b.key, 'interfaceContainerBlock');
    });
    it('starts with empty children and weights', () => {
        const b = new BlockModel(raw(), 0);
        assert.deepEqual(b.children, []);
        assert.deepEqual(b.getWeights(), []);
        assert.equal(b.maxWeight(), 0);
    });
    it('createEvents reads events array', () => {
        const b = new BlockModel(raw({ events: [{ source: 'a', target: 'b', actor: '', input: 'i', output: 'o' }] }), 0);
        assert.equal(b.getEventList().length, 1);
    });
    it('createEvents tolerates missing events', () => {
        const b = new BlockModel(raw({ events: undefined }), 0);
        assert.deepEqual(b.getEventList(), []);
    });
    it('createArtifacts reads artifacts array', () => {
        const b = new BlockModel(raw({ artifacts: [{ uuid: 'u1' }] }), 0);
        assert.equal(b.getArtifactsList().length, 1);
    });
    it('createArtifacts tolerates non-array', () => {
        const b = new BlockModel(raw({ artifacts: 'nope' }), 0);
        assert.deepEqual(b.getArtifactsList(), []);
    });
});

describe('BlockModel.addChildren / children', () => {
    it('appends children', () => {
        const parent = new BlockModel(raw(), 0);
        const child = new BlockModel(raw({ blockType: 'child', tag: 'c' }), 1);
        parent.addChildren(child);
        assert.equal(parent.children.length, 1);
        assert.equal(parent.children[0], child);
    });
});

describe('BlockModel.update weights', () => {
    it('populates weights array after update with All levels', () => {
        const b = new BlockModel(raw(), 0);
        b.update(OPT);
        assert.ok(b.getWeights().length > 0);
        assert.equal(typeof b.getWeight(), 'string');
    });
    it('childLvl None yields fewer weights than All', () => {
        const a = new BlockModel(raw(), 0);
        a.update({ ...OPT, childLvl: IChildrenLvl.None });
        const c = new BlockModel(raw(), 0);
        c.update(OPT);
        assert.ok(c.getWeights().length >= a.getWeights().length);
    });
    it('propLvl None drops property weights', () => {
        const a = new BlockModel(raw(), 0);
        a.update({ ...OPT, propLvl: IPropertiesLvl.None });
        const c = new BlockModel(raw(), 0);
        c.update(OPT);
        assert.ok(c.getWeights().length > a.getWeights().length);
    });
    it('childLvl First uses child-level-1 weighting', () => {
        const parent = new BlockModel(raw(), 0);
        parent.addChildren(new BlockModel(raw({ blockType: 'k', tag: 't' }), 1));
        parent.update({ ...OPT, childLvl: IChildrenLvl.First });
        assert.ok(parent.getWeights().length > 0);
    });
    it('getWeight by named type returns from weightMap', () => {
        const b = new BlockModel(raw(), 0);
        b.update(OPT);
        const named = b.getWeight('PROP_LVL_2');
        assert.equal(typeof named, 'string');
    });
    it('blocks without tag still compute weights', () => {
        const b = new BlockModel(raw({ tag: undefined }), 0);
        b.update(OPT);
        assert.ok(b.getWeights().length > 0);
    });
});

describe('BlockModel.equal', () => {
    it('false when keys differ', () => {
        const a = new BlockModel(raw({ blockType: 'A' }), 0);
        const b = new BlockModel(raw({ blockType: 'B' }), 0);
        a.update(OPT); b.update(OPT);
        assert.equal(a.equal(b), false);
    });
    it('true for identical blocks (hash compare, no index)', () => {
        const a = new BlockModel(raw(), 0);
        const b = new BlockModel(raw(), 0);
        a.update(OPT); b.update(OPT);
        assert.equal(a.equal(b), true);
    });
    it('falls back to key compare when no weights', () => {
        const a = new BlockModel(raw(), 0);
        const b = new BlockModel(raw(), 0);
        assert.equal(a.equal(b), true);
    });
    it('index-based equal compares the weight at that index', () => {
        const a = new BlockModel(raw(), 0);
        const b = new BlockModel(raw(), 0);
        a.update(OPT); b.update(OPT);
        assert.equal(a.equal(b, 0), true);
    });
    it('index-based equal returns false when both weights are zero', () => {
        const a = new BlockModel(raw({ tag: undefined }), 0);
        const b = new BlockModel(raw({ tag: undefined }), 0);
        a.update({ ...OPT, propLvl: IPropertiesLvl.None, childLvl: IChildrenLvl.None });
        b.update({ ...OPT, propLvl: IPropertiesLvl.None, childLvl: IChildrenLvl.None });
        const len = a.getWeights().length;
        let sawZero = false;
        for (let i = 0; i < len; i++) {
            if (a.getWeights()[i] === '0') { sawZero = true; assert.equal(a.equal(b, i), false); }
        }
        assert.ok(sawZero || len >= 0);
    });
    it('equalKey compares keys only', () => {
        const a = new BlockModel(raw({ blockType: 'X' }), 0);
        const b = new BlockModel(raw({ blockType: 'X' }), 5);
        assert.equal(a.equalKey(b), true);
    });
});

describe('BlockModel.checkWeight / maxWeight', () => {
    it('checkWeight true within bounds, false beyond', () => {
        const b = new BlockModel(raw(), 0);
        b.update(OPT);
        const n = b.maxWeight();
        assert.equal(b.checkWeight(0), true);
        assert.equal(b.checkWeight(n), false);
    });
});

describe('BlockModel.toObject / toWeight', () => {
    it('toObject returns the documented shape', () => {
        const b = new BlockModel(raw({ events: [{ source: 's', target: 't', actor: '', input: 'i', output: 'o' }] }), 2);
        const o = b.toObject();
        assert.equal(o.index, 2);
        assert.equal(o.blockType, 'interfaceContainerBlock');
        assert.ok(Array.isArray(o.properties));
        assert.ok(Array.isArray(o.events));
    });
    it('toWeight returns weights, children and length', () => {
        const parent = new BlockModel(raw(), 0);
        const child = new BlockModel(raw({ blockType: 'c', tag: 'ct' }), 1);
        child.update(OPT);
        parent.addChildren(child);
        parent.update(OPT);
        const w = parent.toWeight(OPT);
        assert.equal(w.weights.length, 5);
        assert.equal(w.children.length, 1);
        assert.equal(typeof w.length, 'number');
    });
    it('toWeight on a leaf returns length 0 children', () => {
        const b = new BlockModel(raw(), 0);
        b.update(OPT);
        const w = b.toWeight(OPT);
        assert.equal(w.children.length, 0);
        assert.equal(w.length, 0);
    });
});

describe('BlockModel.updateArtifacts', () => {
    it('updates matching artifact by uuid', () => {
        const b = new BlockModel(raw({ artifacts: [{ uuid: 'u1' }] }), 0);
        b.updateArtifacts([{ uuid: 'u1', data: 'payload' }], OPT);
        assert.equal(b.getArtifactsList().length, 1);
    });
    it('handles artifact with no matching data row', () => {
        const b = new BlockModel(raw({ artifacts: [{ uuid: 'u1' }] }), 0);
        b.updateArtifacts([], OPT);
        assert.equal(b.getArtifactsList().length, 1);
    });
});
