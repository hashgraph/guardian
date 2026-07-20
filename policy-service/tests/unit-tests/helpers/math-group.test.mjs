import { assert } from 'chai';
import { MathGroup } from '../../../dist/policy-engine/helpers/math-model/math-group.js';
import { MathItemType } from '../../../dist/policy-engine/helpers/math-model/math-item.type.js';

const makeItem = (name, empty = false, valid = true) => ({
    name,
    empty,
    valid,
    validated: false,
    validate() {
        this.validated = true;
    },
    toJson() {
        return { name: this.name };
    }
});

describe('MathGroup', () => {
    it('defaults to the GROUP type', () => {
        assert.equal(new MathGroup().type, MathItemType.GROUP);
    });

    it('assigns a string id', () => {
        assert.isString(new MathGroup().id);
    });

    it('uses the provided name', () => {
        assert.equal(new MathGroup('payments').name, 'payments');
    });

    it('defaults name to an empty string', () => {
        assert.equal(new MathGroup().name, '');
    });

    it('starts with an empty items list', () => {
        assert.deepEqual(new MathGroup().items, []);
    });

    it('starts valid', () => {
        assert.isTrue(new MathGroup().valid);
    });

    it('adds items', () => {
        const g = new MathGroup();
        g.add(makeItem('a'));
        g.add(makeItem('b'));
        assert.equal(g.items.length, 2);
    });

    it('deletes a specific item by reference', () => {
        const g = new MathGroup();
        const a = makeItem('a');
        const b = makeItem('b');
        g.add(a);
        g.add(b);
        g.delete(a);
        assert.deepEqual(g.items, [b]);
    });

    it('delete is a no-op when the item is not present', () => {
        const g = new MathGroup();
        const a = makeItem('a');
        g.add(a);
        g.delete(makeItem('other'));
        assert.deepEqual(g.items, [a]);
    });

    it('validate calls validate on non-empty items only', () => {
        const g = new MathGroup();
        const a = makeItem('a', false);
        const b = makeItem('b', true);
        g.add(a);
        g.add(b);
        g.validate();
        assert.isTrue(a.validated);
        assert.isFalse(b.validated);
    });

    it('validate is true when all non-empty items are valid', () => {
        const g = new MathGroup();
        g.add(makeItem('a', false, true));
        g.add(makeItem('b', false, true));
        g.validate();
        assert.isTrue(g.valid);
    });

    it('validate is false when any non-empty item is invalid', () => {
        const g = new MathGroup();
        g.add(makeItem('a', false, true));
        g.add(makeItem('b', false, false));
        g.validate();
        assert.isFalse(g.valid);
    });

    it('validate ignores invalidity of empty items', () => {
        const g = new MathGroup();
        g.add(makeItem('a', false, true));
        g.add(makeItem('b', true, false));
        g.validate();
        assert.isTrue(g.valid);
    });

    it('validate populates validatedItems excluding empties', () => {
        const g = new MathGroup();
        g.add(makeItem('a', false));
        g.add(makeItem('b', true));
        g.add(makeItem('c', false));
        g.validate();
        assert.equal(g.validatedItems.length, 2);
    });

    it('reorder returns undefined', () => {
        assert.equal(new MathGroup().reorder(0, 1), undefined);
    });

    it('toJson reports the group type and name', () => {
        const g = new MathGroup('grp');
        const json = g.toJson();
        assert.equal(json.type, MathItemType.GROUP);
        assert.equal(json.name, 'grp');
    });

    it('toJson defaults a missing name to empty string', () => {
        const g = new MathGroup();
        g.name = undefined;
        assert.equal(g.toJson().name, '');
    });

    it('toJson excludes empty items', () => {
        const g = new MathGroup();
        g.add(makeItem('a', false));
        g.add(makeItem('b', true));
        assert.deepEqual(g.toJson().items, [{ name: 'a' }]);
    });

    it('instance from rebuilds items via the create callback', () => {
        const g = new MathGroup();
        const result = g.from({ name: 'x', items: [{ name: 'i1' }, { name: 'i2' }] }, (cfg) => makeItem(cfg.name));
        assert.equal(result, g);
        assert.equal(g.name, 'x');
        assert.equal(g.items.length, 2);
    });

    it('instance from skips items the create callback rejects', () => {
        const g = new MathGroup();
        g.from({ name: 'x', items: [{ name: 'keep' }, { name: 'drop' }] }, (cfg) => (cfg.name === 'keep' ? makeItem(cfg.name) : null));
        assert.equal(g.items.length, 1);
        assert.equal(g.items[0].name, 'keep');
    });

    it('instance from returns null for non-object input', () => {
        assert.isNull(new MathGroup().from(null, () => null));
        assert.isNull(new MathGroup().from('str', () => null));
    });

    it('instance from defaults a missing name to empty string', () => {
        const g = new MathGroup('old');
        g.from({ items: [] }, () => null);
        assert.equal(g.name, '');
    });

    it('instance from tolerates a non-array items field', () => {
        const g = new MathGroup();
        g.from({ name: 'x', items: 'not-an-array' }, () => makeItem('z'));
        assert.deepEqual(g.items, []);
    });

    it('static from builds a populated MathGroup', () => {
        const g = MathGroup.from({ type: MathItemType.GROUP, name: 'y', items: [{ name: 'a' }] }, (cfg) => makeItem(cfg.name));
        assert.instanceOf(g, MathGroup);
        assert.equal(g.name, 'y');
        assert.equal(g.items.length, 1);
    });

    it('static from returns null for non-object input', () => {
        assert.isNull(MathGroup.from(null, () => null));
        assert.isNull(MathGroup.from(42, () => null));
    });
});
