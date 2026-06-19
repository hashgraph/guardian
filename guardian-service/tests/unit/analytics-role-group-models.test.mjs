import assert from 'node:assert/strict';
import { RoleModel } from '../../dist/analytics/compare/models/role.model.js';
import { GroupModel } from '../../dist/analytics/compare/models/group.model.js';

const opts = (overrides = {}) => ({
    propLvl: 'All',
    keyLvl: 'Default',
    idLvl: 'All',
    ...overrides,
});

describe('RoleModel', () => {
    it('exposes the constructor argument as both name and key', () => {
        const r = new RoleModel('OWNER');
        assert.equal(r.name, 'OWNER');
        assert.equal(r.key, 'OWNER');
    });

    it('starts with empty weights and getWeight()=undefined', () => {
        const r = new RoleModel('OWNER');
        assert.deepEqual(r.getWeights(), []);
        assert.equal(r.maxWeight(), 0);
        assert.equal(r.getWeight(), undefined);
    });

    it('update() populates one weight (ROLE_LVL_0)', () => {
        const r = new RoleModel('OWNER');
        r.update(opts());
        assert.equal(r.getWeights().length, 1);
        assert.equal(r.maxWeight(), 1);
    });

    it('checkWeight(0) is true after update; checkWeight(1) is false', () => {
        const r = new RoleModel('OWNER');
        r.update(opts());
        assert.equal(r.checkWeight(0), true);
        assert.equal(r.checkWeight(1), false);
    });

    it('equal() falls back to name comparison when not yet updated', () => {
        const a = new RoleModel('A');
        const b = new RoleModel('A');
        const c = new RoleModel('B');
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() compares the strongest weight after update()', () => {
        const a = new RoleModel('OWNER');
        const b = new RoleModel('OWNER');
        const c = new RoleModel('VIEWER');
        a.update(opts()); b.update(opts()); c.update(opts());
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equalKey() compares names', () => {
        const a = new RoleModel('OWNER');
        const b = new RoleModel('OWNER');
        const c = new RoleModel('VIEWER');
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });

    it('toObject returns {name, properties:[name-prop]}', () => {
        const r = new RoleModel('OWNER');
        const out = r.toObject();
        assert.equal(out.name, 'OWNER');
        assert.equal(out.properties.length, 1);
        assert.equal(out.properties[0].name, 'name');
    });

    it('toWeight returns name when not yet updated', () => {
        const r = new RoleModel('OWNER');
        assert.equal(r.toWeight(opts()).weight, 'OWNER');
    });

    it('toWeight returns the strongest weight after update()', () => {
        const r = new RoleModel('OWNER');
        r.update(opts());
        const expected = r.getWeights()[0];
        assert.equal(r.toWeight(opts()).weight, expected);
    });

    it('getPropList returns the lone name AnyPropertyModel', () => {
        const r = new RoleModel('OWNER');
        const list = r.getPropList();
        assert.equal(list.length, 1);
        assert.equal(list[0].name, 'name');
        assert.equal(list[0].value, 'OWNER');
    });
});

describe('GroupModel', () => {
    it('captures name and exposes it as the key', () => {
        const g = new GroupModel({ name: 'Owners', creator: 'X' });
        assert.equal(g.name, 'Owners');
        assert.equal(g.key, 'Owners');
    });

    it('starts with empty weights', () => {
        const g = new GroupModel({ name: 'Owners' });
        assert.deepEqual(g.getWeights(), []);
        assert.equal(g.maxWeight(), 0);
    });

    it('update() populates two weights (GROUP_LVL_0 and GROUP_LVL_1)', () => {
        const g = new GroupModel({ name: 'Owners', creator: 'X' });
        g.update(opts());
        assert.equal(g.getWeights().length, 2);
        assert.equal(g.maxWeight(), 2);
    });

    it('falls back to name comparison when un-updated', () => {
        const a = new GroupModel({ name: 'A' });
        const b = new GroupModel({ name: 'A' });
        const c = new GroupModel({ name: 'B' });
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() at default index compares the strongest weight', () => {
        const a = new GroupModel({ name: 'g', creator: 'X' });
        const b = new GroupModel({ name: 'g', creator: 'X' });
        const c = new GroupModel({ name: 'g', creator: 'Y' });
        a.update(opts()); b.update(opts()); c.update(opts());
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() at the looser weight matches groups that share only name', () => {
        const a = new GroupModel({ name: 'g', creator: 'X' });
        const b = new GroupModel({ name: 'g', creator: 'Y' });
        a.update(opts()); b.update(opts());
        // Index 1 = the looser GROUP_LVL_0 weight (only name) after reverse().
        assert.equal(a.equal(b, 1), true);
    });

    it('equalKey compares names', () => {
        const a = new GroupModel({ name: 'g' });
        const b = new GroupModel({ name: 'g' });
        const c = new GroupModel({ name: 'h' });
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });

    it('toObject returns {name, properties: [...PropertyModel]}', () => {
        const g = new GroupModel({ name: 'g', extra: 1 });
        const out = g.toObject();
        assert.equal(out.name, 'g');
        assert.ok(Array.isArray(out.properties));
    });

    it('toWeight returns name when un-updated, hash when updated', () => {
        const g = new GroupModel({ name: 'g' });
        assert.equal(g.toWeight(opts()).weight, 'g');
        g.update(opts());
        assert.equal(g.toWeight(opts()).weight, g.getWeights()[0]);
    });
});
