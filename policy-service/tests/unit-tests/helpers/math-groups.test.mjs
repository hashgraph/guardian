import assert from 'node:assert/strict';
import { MathGroups } from '../../../dist/policy-engine/helpers/math-model/math-groups.js';
import { MathGroup } from '../../../dist/policy-engine/helpers/math-model/math-group.js';
import { FieldLink } from '../../../dist/policy-engine/helpers/math-model/field-link.js';
import { MathItemType } from '../../../dist/policy-engine/helpers/math-model/math-item.type.js';

const link = (name, field) => {
    const l = new FieldLink(name, field);
    l.update();
    return l;
};

describe('MathGroup', () => {
    it('has GROUP type, a generated id and the given name', () => {
        const g = new MathGroup('Page A');
        assert.equal(g.type, MathItemType.GROUP);
        assert.equal(typeof g.id, 'string');
        assert.ok(g.id.length > 0);
        assert.equal(g.name, 'Page A');
    });

    it('add and delete manage items', () => {
        const g = new MathGroup('P');
        const a = link('a', 'doc.a');
        const b = link('b', 'doc.b');
        g.add(a);
        g.add(b);
        assert.equal(g.items.length, 2);
        g.delete(a);
        assert.deepEqual(g.items, [b]);
    });

    it('validate excludes empty items and aggregates validity', () => {
        const g = new MathGroup('P');
        g.add(link('a', 'doc.a'));
        g.add(new FieldLink());
        g.validate();
        assert.equal(g.validatedItems.length, 1);
        assert.equal(g.valid, true);
    });

    it('validate is false when a non-empty item is invalid', () => {
        const g = new MathGroup('P');
        g.add(link('1bad', 'doc.a'));
        g.validate();
        assert.equal(g.valid, false);
    });

    it('reorder is a no-op', () => {
        const g = new MathGroup('P');
        const a = link('a', 'doc.a');
        const b = link('b', 'doc.b');
        g.add(a);
        g.add(b);
        assert.equal(g.reorder(0, 1), undefined);
        assert.deepEqual(g.items, [a, b]);
    });

    it('toJson serializes non-empty items only', () => {
        const g = new MathGroup('P');
        g.add(link('a', 'doc.a'));
        g.add(new FieldLink());
        const json = g.toJson();
        assert.equal(json.type, MathItemType.GROUP);
        assert.equal(json.name, 'P');
        assert.equal(json.items.length, 1);
        assert.equal(json.items[0].name, 'a');
    });

    it('static from(null) and from(non-object) return null', () => {
        assert.equal(MathGroup.from(null), null);
        assert.equal(MathGroup.from(42), null);
    });

    it('static from builds a group through the create function', () => {
        const json = {
            type: MathItemType.GROUP,
            name: 'P',
            items: [{ type: MathItemType.LINK, name: 'x', field: 'doc.a', schema: 's-1' }],
        };
        const g = MathGroup.from(json, FieldLink.from);
        assert.equal(g.name, 'P');
        assert.equal(g.items.length, 1);
        assert.equal(g.items[0].path, 'doc.a');
    });
});

describe('MathGroups', () => {
    it('initializes with a single default page that is selected', () => {
        const g = new MathGroups();
        assert.equal(g.pages.length, 1);
        assert.equal(g.current, g.pages[0]);
        assert.equal(g.valid, true);
    });

    it('create appends a new sequentially named page', () => {
        const g = new MathGroups();
        g.create();
        assert.equal(g.pages.length, 2);
        assert.equal(g.pages[0].name, 'Tab1');
        assert.equal(g.pages[1].name, 'Tab2');
    });

    it('add and delete manage pages', () => {
        const g = new MathGroups();
        const page = new MathGroup('Extra');
        g.add(page);
        assert.equal(g.pages.length, 2);
        g.delete(page);
        assert.equal(g.pages.length, 1);
    });

    it('select and selectById change the current page', () => {
        const g = new MathGroups();
        g.create();
        const [p1, p2] = g.pages;
        g.select(p2);
        assert.equal(g.current, p2);
        g.selectById(p1.id);
        assert.equal(g.current, p1);
        g.selectById('does-not-exist');
        assert.equal(g.current, p1);
    });

    it('addItem targets the current page and view reflects it', () => {
        const g = new MathGroups();
        const a = link('a', 'doc.a');
        g.addItem(a);
        assert.ok(g.view.includes(a));
        assert.ok(g.current.items.includes(a));
    });

    it('deleteItem removes from the current page', () => {
        const g = new MathGroups();
        const a = link('a', 'doc.a');
        g.addItem(a);
        g.deleteItem(a);
        assert.equal(g.current.items.length, 0);
    });

    it('getItems returns non-empty items across every page', () => {
        const g = new MathGroups();
        g.addItem(link('a', 'doc.a'));
        g.addItem(new FieldLink());
        g.create();
        g.select(g.pages[1]);
        g.addItem(link('b', 'doc.b'));
        assert.equal(g.getItems().length, 2);
    });

    it('validate aggregates validity across pages', () => {
        const valid = new MathGroups();
        valid.addItem(link('a', 'doc.a'));
        valid.validate();
        assert.equal(valid.valid, true);

        const invalid = new MathGroups();
        invalid.addItem(link('1bad', 'doc.a'));
        invalid.validate();
        assert.equal(invalid.valid, false);
    });

    it('toJson returns one entry per page', () => {
        const g = new MathGroups();
        g.create();
        const json = g.toJson();
        assert.equal(json.length, 2);
        assert.equal(json[0].type, MathItemType.GROUP);
    });

    it('getComponents emits a LINK component for each valid link', () => {
        const g = new MathGroups();
        g.addItem(link('x', 'doc.a'));
        const components = g.getComponents();
        assert.equal(components.length, 1);
        const sub = components[0].components;
        assert.equal(sub.length, 1);
        assert.equal(sub[0].type, MathItemType.LINK);
        assert.equal(sub[0].name, 'x');
        assert.equal(sub[0].value, "variables['x']");
    });

    it('static from rebuilds pages from GROUP configs', () => {
        const json = [{
            type: MathItemType.GROUP,
            name: 'P1',
            items: [{ type: MathItemType.LINK, name: 'x', field: 'doc.a', schema: 's-1' }],
        }];
        const g = MathGroups.from(json, FieldLink.from);
        assert.equal(g.pages.length, 1);
        assert.equal(g.getItems().length, 1);
    });

    it('from wraps flat (non-group) configs into a default page', () => {
        const json = [{ type: MathItemType.LINK, name: 'x', field: 'doc.a', schema: '' }];
        const g = new MathGroups().from(json, FieldLink.from);
        assert.ok(g.pages.length >= 1);
        assert.equal(g.getItems().length, 1);
    });
});
