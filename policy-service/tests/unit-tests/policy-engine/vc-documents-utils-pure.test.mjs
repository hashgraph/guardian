import { assert } from 'chai';
import { PolicyVcDocumentsUtils } from '../../../dist/policy-engine/policy-vc-documents-utils.js';

const getNestedValue = PolicyVcDocumentsUtils.getNestedValue.bind(PolicyVcDocumentsUtils);
const setNestedValue = PolicyVcDocumentsUtils.setNestedValue.bind(PolicyVcDocumentsUtils);
const mapFilteredFields = PolicyVcDocumentsUtils.mapFilteredFields.bind(PolicyVcDocumentsUtils);

describe('PolicyVcDocumentsUtils.getNestedValue', function () {
    it('returns value for top-level key', function () {
        assert.deepEqual(getNestedValue({ a: 1 }, 'a'), [1]);
    });
    it('returns value for nested path', function () {
        assert.deepEqual(getNestedValue({ a: { b: { c: 'x' } } }, 'a.b.c'), ['x']);
    });
    it('returns undefined for missing key', function () {
        assert.isUndefined(getNestedValue({ a: 1 }, 'b'));
    });
    it('returns undefined for missing nested key', function () {
        assert.isUndefined(getNestedValue({ a: { b: 1 } }, 'a.c.d'));
    });
    it('returns undefined for null object', function () {
        assert.isUndefined(getNestedValue(null, 'a'));
    });
    it('returns undefined for undefined object', function () {
        assert.isUndefined(getNestedValue(undefined, 'a.b'));
    });
    it('collects values across array items', function () {
        const obj = { items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
        assert.deepEqual(getNestedValue(obj, 'items.v'), [1, 2, 3]);
    });
    it('skips array items missing the key', function () {
        const obj = { items: [{ v: 1 }, {}, { v: 3 }] };
        assert.deepEqual(getNestedValue(obj, 'items.v'), [1, 3]);
    });
    it('skips non-object array items', function () {
        const obj = { items: [1, { v: 2 }, 'x'] };
        assert.deepEqual(getNestedValue(obj, 'items.v'), [2]);
    });
    it('traverses nested arrays of objects', function () {
        const obj = { a: [{ b: [{ c: 1 }, { c: 2 }] }, { b: [{ c: 3 }] }] };
        assert.deepEqual(getNestedValue(obj, 'a.b.c'), [1, 2, 3]);
    });
    it('returns undefined when path hits a primitive midway', function () {
        assert.isUndefined(getNestedValue({ a: 5 }, 'a.b'));
    });
    it('returns null values present at the leaf', function () {
        assert.deepEqual(getNestedValue({ a: null }, 'a'), [null]);
    });
    it('returns array value when leaf is an array on a plain object', function () {
        assert.deepEqual(getNestedValue({ a: { b: [1, 2] } }, 'a.b'), [[1, 2]]);
    });
});

describe('PolicyVcDocumentsUtils.setNestedValue', function () {
    it('sets top-level key', function () {
        const obj = { a: 1 };
        setNestedValue(obj, 'a', 2);
        assert.equal(obj.a, 2);
    });
    it('sets nested path', function () {
        const obj = { a: { b: { c: 1 } } };
        setNestedValue(obj, 'a.b.c', 9);
        assert.equal(obj.a.b.c, 9);
    });
    it('creates object for missing keys before the second-last and array at the second-last', function () {
        const obj = {};
        setNestedValue(obj, 'a.b.c', 'x');
        assert.deepEqual(obj, { a: { b: [] } });
    });
    it('creates array container for second-last missing key', function () {
        const obj = {};
        setNestedValue(obj, 'a.b', 'x');
        assert.isArray(obj.a);
    });
    it('replaces null intermediate values', function () {
        const obj = { a: { b: null } };
        setNestedValue(obj, 'a.b.c.d', 1);
        assert.deepEqual(obj.a.b, { c: [] });
    });
    it('sets value on each object item of an array leaf', function () {
        const obj = { items: [{ v: 1 }, { v: 2 }] };
        setNestedValue(obj, 'items.v', 7);
        assert.deepEqual(obj.items, [{ v: 7 }, { v: 7 }]);
    });
    it('distributes array values by index across array items', function () {
        const obj = { items: [{ v: 1 }, { v: 2 }] };
        setNestedValue(obj, 'items.v', [10, 20]);
        assert.deepEqual(obj.items, [{ v: 10 }, { v: 20 }]);
    });
    it('ignores extra items when value array is shorter', function () {
        const obj = { items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
        setNestedValue(obj, 'items.v', [10, 20]);
        assert.deepEqual(obj.items, [{ v: 10 }, { v: 20 }, { v: 3 }]);
    });
    it('skips non-object items in array', function () {
        const obj = { items: [{ v: 1 }, 5] };
        setNestedValue(obj, 'items.v', 9);
        assert.deepEqual(obj.items, [{ v: 9 }, 5]);
    });
    it('traverses arrays for deeper paths', function () {
        const obj = { items: [{ inner: { v: 1 } }, { inner: { v: 2 } }] };
        setNestedValue(obj, 'items.inner.v', 5);
        assert.deepEqual(obj.items, [{ inner: { v: 5 } }, { inner: { v: 5 } }]);
    });
    it('does nothing for null target', function () {
        assert.doesNotThrow(() => setNestedValue(null, 'a.b', 1));
    });
    it('does nothing when current is a primitive', function () {
        const obj = { a: 5 };
        setNestedValue(obj, 'a.b', 1);
        assert.equal(obj.a, 5);
    });
});

describe('PolicyVcDocumentsUtils.mapFilteredFields', function () {
    it('copies plain fields', function () {
        const target = {};
        mapFilteredFields({ tag: 't', owner: 'o' }, target);
        assert.deepEqual(target, { tag: 't', owner: 'o' });
    });
    it('excludes protected keys', function () {
        const target = {};
        mapFilteredFields({
            hash: 'h',
            signature: 1,
            hederaStatus: 's',
            messageHash: 'mh',
            messageId: 'mid',
            encryptedDocument: 'e',
            encryptedDocumentFileId: 'f',
            document: {},
            relationships: [],
            keep: 'yes'
        }, target);
        assert.deepEqual(target, { keep: 'yes' });
    });
    it('excludes underscore-prefixed keys', function () {
        const target = {};
        mapFilteredFields({ _id: 'x', _meta: 1, ok: 2 }, target);
        assert.deepEqual(target, { ok: 2 });
    });
    it('deep clones copied values', function () {
        const source = { option: { status: 'NEW' } };
        const target = {};
        mapFilteredFields(source, target);
        source.option.status = 'CHANGED';
        assert.equal(target.option.status, 'NEW');
    });
    it('overwrites existing target keys', function () {
        const target = { tag: 'old' };
        mapFilteredFields({ tag: 'new' }, target);
        assert.equal(target.tag, 'new');
    });
    it('handles empty source', function () {
        const target = { a: 1 };
        mapFilteredFields({}, target);
        assert.deepEqual(target, { a: 1 });
    });
});
