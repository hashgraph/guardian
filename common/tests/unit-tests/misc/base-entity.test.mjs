import { assert } from 'chai';
import { BaseEntity } from '../../../dist/models/base-entity.js';

class TestEntity extends BaseEntity {}

describe('BaseEntity field defaults', () => {
    it('createDate is initialised to a Date close to now', () => {
        const before = Date.now();
        const e = new TestEntity();
        const after = Date.now();
        assert.instanceOf(e.createDate, Date);
        const t = e.createDate.getTime();
        assert.isAtLeast(t, before - 5);
        assert.isAtMost(t, after + 5);
    });

    it('updateDate is initialised to a Date close to now', () => {
        const e = new TestEntity();
        assert.instanceOf(e.updateDate, Date);
    });

    it('tenantId, guardianId, _guardianId are unset until assigned', () => {
        const e = new TestEntity();
        assert.equal(e.tenantId, undefined);
        assert.equal(e.guardianId, undefined);
        assert.equal(e._guardianId, undefined);
    });
});

describe('BaseEntity.toJSON', () => {
    it('returns a shallow copy that includes the id field', () => {
        const e = new TestEntity();
        e.id = 'string-id';
        e.tenantId = 't1';
        e.guardianId = 'g1';
        const json = e.toJSON();
        assert.equal(json.id, 'string-id');
        assert.equal(json.tenantId, 't1');
        assert.equal(json.guardianId, 'g1');
        assert.notStrictEqual(json, e, 'should be a fresh object, not the entity itself');
    });

    it('includes own-enumerable properties added on the instance', () => {
        const e = new TestEntity();
        e.customField = 'extra';
        const json = e.toJSON();
        assert.equal(json.customField, 'extra');
    });
});

describe('BaseEntity __onBaseCreate / __onBaseUpdate hooks', () => {
    it('__onBaseCreate sets createDate and updateDate to the same Date', () => {
        const e = new TestEntity();
        e.__onBaseCreate();
        assert.instanceOf(e.createDate, Date);
        assert.instanceOf(e.updateDate, Date);
        // After __onBaseCreate they should be the exact same reference
        assert.strictEqual(e.createDate, e.updateDate);
    });

    it('__onBaseUpdate moves updateDate forward without touching createDate', async () => {
        const e = new TestEntity();
        e.__onBaseCreate();
        const original = e.createDate;
        // Wait one tick so the new Date() is strictly later
        await new Promise((r) => setTimeout(r, 10));
        e.__onBaseUpdate();
        assert.strictEqual(e.createDate, original, 'createDate should not move');
        assert.isAbove(e.updateDate.getTime(), original.getTime(), 'updateDate should advance');
    });
});

describe('BaseEntity._createFieldCache (protected)', () => {
    class CacheTester extends BaseEntity {
        cache(document, fields) {
            return this._createFieldCache(document, fields);
        }
    }

    it('returns null when fields list is null/undefined', () => {
        const t = new CacheTester();
        assert.isNull(t.cache({ x: 1 }, null));
        assert.isNull(t.cache({ x: 1 }, undefined));
    });

    it('copies numeric fields into the cache via dotted paths', () => {
        const t = new CacheTester();
        const doc = { a: 1, nested: { b: 2 } };
        const out = t.cache(doc, ['a', 'nested.b']);
        assert.deepEqual(out, { a: 1, nested: { b: 2 } });
    });

    it('copies short string fields (under 100 chars by default)', () => {
        const t = new CacheTester();
        const doc = { name: 'short' };
        const out = t.cache(doc, ['name']);
        assert.equal(out.name, 'short');
    });

    it('skips long string fields (over the default 100-char limit)', () => {
        const t = new CacheTester();
        const doc = { big: 'x'.repeat(200) };
        const out = t.cache(doc, ['big']);
        assert.notProperty(out, 'big');
    });

    it('skips fields that are objects, arrays, booleans, null', () => {
        const t = new CacheTester();
        const doc = { obj: { a: 1 }, arr: [1, 2], flag: true, nada: null };
        const out = t.cache(doc, ['obj', 'arr', 'flag', 'nada']);
        assert.deepEqual(out, {});
    });

    it('skips missing fields', () => {
        const t = new CacheTester();
        const out = t.cache({ a: 1 }, ['missing']);
        assert.deepEqual(out, {});
    });
});
