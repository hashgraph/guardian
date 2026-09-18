import { assert } from 'chai';
import { DynamicRole } from '../../../dist/entity/dynamic-role.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('DynamicRole entity', () => {
    it('extends BaseEntity (createDate present)', () => {
        const r = new DynamicRole();
        assert.instanceOf(r.createDate, Date);
    });

    it('all fields are optional and undefined by default', () => {
        const r = new DynamicRole();
        assert.equal(r.uuid, undefined);
        assert.equal(r.name, undefined);
        assert.equal(r.description, undefined);
        assert.equal(r.owner, undefined);
        assert.equal(r.permissions, undefined);
    });

    it('setDefaults assigns a v4 UUID when none is set', () => {
        const r = new DynamicRole();
        r.setDefaults();
        assert.match(r.uuid, UUID_V4);
    });

    it('setDefaults preserves an existing uuid', () => {
        const r = new DynamicRole();
        r.uuid = 'preset-uuid';
        r.setDefaults();
        assert.equal(r.uuid, 'preset-uuid');
    });

    it('setDefaults produces a fresh uuid each time when starting empty', () => {
        const r1 = new DynamicRole();
        const r2 = new DynamicRole();
        r1.setDefaults();
        r2.setDefaults();
        assert.notEqual(r1.uuid, r2.uuid);
    });

    it('exposes assignable label/description/owner/permissions fields', () => {
        const r = new DynamicRole();
        r.name = 'ADMIN';
        r.description = 'admin role';
        r.owner = 'org-1';
        r.permissions = ['p1', 'p2'];
        assert.equal(r.name, 'ADMIN');
        assert.equal(r.description, 'admin role');
        assert.equal(r.owner, 'org-1');
        assert.deepEqual(r.permissions, ['p1', 'p2']);
    });
});
