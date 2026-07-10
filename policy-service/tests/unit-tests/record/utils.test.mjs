import { assert } from 'chai';
import {
    GenerateUUID,
    GenerateDID,
    RowDocument,
    Utils,
    RecordItemStack,
} from '../../../dist/policy-engine/record/utils.js';

describe('@unit record/GenerateUUID', () => {
    it('exposes old and new values', () => {
        const g = new GenerateUUID('old', 'new');
        assert.equal(g.oldValue, 'old');
        assert.equal(g.newValue, 'new');
    });

    it('replaces a bare uuid match', () => {
        const g = new GenerateUUID('aaa', 'bbb');
        assert.equal(g.replace('aaa'), 'bbb');
    });

    it('replaces the urn:uuid-prefixed form', () => {
        const g = new GenerateUUID('aaa', 'bbb');
        assert.equal(g.replace('urn:uuid:aaa'), 'urn:uuid:bbb');
    });

    it('returns the value unchanged when no match', () => {
        const g = new GenerateUUID('aaa', 'bbb');
        assert.equal(g.replace('ccc'), 'ccc');
    });

    it('returns non-string values unchanged', () => {
        const g = new GenerateUUID('aaa', 'bbb');
        const obj = { aaa: 1 };
        assert.strictEqual(g.replace(obj), obj);
        assert.equal(g.replace(42), 42);
    });
});

describe('@unit record/GenerateDID', () => {
    it('exposes old and new values', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.oldValue, 'did:old');
        assert.equal(g.newValue, 'did:new');
    });

    it('replaces an exact match', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace('did:old'), 'did:new');
    });

    it('does not replace a urn-prefixed form (exact match only)', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace('urn:uuid:did:old'), 'urn:uuid:did:old');
    });

    it('returns the value unchanged when no match', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace('did:other'), 'did:other');
    });

    it('returns non-string values unchanged', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace(7), 7);
    });
});

describe('@unit record/RowDocument', () => {
    const baseDoc = (extra = {}) => ({
        id: 'id-1',
        _id: 'oid-1',
        document: { id: 'doc-1' },
        assignedToGroup: 'g',
        assignedTo: 'u',
        option: { o: 1 },
        ...extra,
    });

    it('check is truthy only when id, _id and document.id present', () => {
        assert.ok(RowDocument.check(baseDoc()));
        assert.notOk(RowDocument.check({ id: 'x', _id: 'y', document: {} }));
        assert.notOk(RowDocument.check(null));
        assert.notOk(RowDocument.check({ id: 'x' }));
    });

    it('detects vc type via dryRunClass', () => {
        const r = new RowDocument(baseDoc({ dryRunClass: 'VcDocumentCollection' }), null, null);
        assert.equal(r.type, 'vc');
    });

    it('detects vp type via dryRunClass', () => {
        const r = new RowDocument(baseDoc({ dryRunClass: 'VpDocumentCollection' }), null, null);
        assert.equal(r.type, 'vp');
    });

    it('detects did type via dryRunClass', () => {
        const r = new RowDocument(baseDoc({ dryRunClass: 'DidDocumentCollection' }), null, null);
        assert.equal(r.type, 'did');
    });

    it('detects did type via did property', () => {
        const r = new RowDocument(baseDoc({ did: 'did:abc' }), null, null);
        assert.equal(r.type, 'did');
    });

    it('detects vc type via schema property', () => {
        const r = new RowDocument(baseDoc({ schema: 'iri' }), null, null);
        assert.equal(r.type, 'vc');
    });

    it('defaults to vp type', () => {
        const r = new RowDocument(baseDoc(), null, null);
        assert.equal(r.type, 'vp');
    });

    it('builds filters from document.id', () => {
        const r = new RowDocument(baseDoc(), null, null);
        assert.deepEqual(r.filters, { 'document.id': 'doc-1' });
    });

    it('replace returns root unchanged when row is falsy', () => {
        const r = new RowDocument(baseDoc(), {}, 'k');
        const root = { foo: 'bar' };
        assert.strictEqual(r.replace(root, null), root);
    });

    it('replace assigns into parent[key] and restores props', () => {
        const parent = {};
        const r = new RowDocument(baseDoc(), parent, 'k');
        const root = { parent };
        const out = r.replace(root, { document: { id: 'doc-1' } });
        assert.strictEqual(out, root);
        assert.equal(parent.k.assignedToGroup, 'g');
        assert.equal(parent.k.assignedTo, 'u');
        assert.deepEqual(parent.k.option, { o: 1 });
    });

    it('replace returns the new row when no parent/key', () => {
        const r = new RowDocument(baseDoc(), null, null);
        const row = { document: { id: 'doc-1' } };
        const out = r.replace({ root: true }, row);
        assert.strictEqual(out, row);
        assert.equal(row.assignedToGroup, 'g');
    });
});

describe('@unit record/Utils.replaceAllValues', () => {
    it('returns falsy obj unchanged', () => {
        const value = new GenerateUUID('a', 'b');
        assert.equal(Utils.replaceAllValues(null, value), null);
        assert.equal(Utils.replaceAllValues(undefined, value), undefined);
    });

    it('replaces matching primitives recursively in arrays', () => {
        const value = new GenerateUUID('a', 'b');
        const out = Utils.replaceAllValues(['a', 'c', 'a'], value);
        assert.deepEqual(out, ['b', 'c', 'b']);
    });

    it('replaces matching values inside nested objects', () => {
        const value = new GenerateUUID('a', 'b');
        const out = Utils.replaceAllValues({ x: 'a', y: { z: 'a', w: 'keep' } }, value);
        assert.deepEqual(out, { x: 'b', y: { z: 'b', w: 'keep' } });
    });

    it('mutates the input object in place', () => {
        const value = new GenerateUUID('a', 'b');
        const input = { x: 'a' };
        Utils.replaceAllValues(input, value);
        assert.equal(input.x, 'b');
    });
});

describe('@unit record/Utils.findAllDocuments', () => {
    const doc = (id) => ({ id, _id: '_' + id, document: { id: 'd' + id } });

    it('returns empty array for non-object input', () => {
        assert.deepEqual(Utils.findAllDocuments(null), []);
        assert.deepEqual(Utils.findAllDocuments('string'), []);
    });

    it('finds a top-level document', () => {
        const results = Utils.findAllDocuments(doc('1'));
        assert.equal(results.length, 1);
        assert.instanceOf(results[0], RowDocument);
    });

    it('finds documents nested in arrays', () => {
        const results = Utils.findAllDocuments([doc('1'), doc('2')]);
        assert.equal(results.length, 2);
    });

    it('finds documents nested in object properties', () => {
        const results = Utils.findAllDocuments({ a: doc('1'), b: { c: doc('2') } });
        assert.equal(results.length, 2);
    });

    it('does not recurse into a matched document', () => {
        const nested = doc('1');
        nested.child = doc('2');
        const results = Utils.findAllDocuments(nested);
        assert.equal(results.length, 1);
    });
});

describe('@unit record/RecordItemStack', () => {
    const item = (n) => ({ n });

    it('starts empty', () => {
        const s = new RecordItemStack();
        assert.equal(s.count, 0);
        assert.equal(s.index, 0);
        assert.equal(s.current, undefined);
    });

    it('setItems deep-copies items (not shared references)', () => {
        const s = new RecordItemStack();
        const src = [item(1), item(2)];
        s.setItems(src);
        assert.equal(s.count, 2);
        assert.notStrictEqual(s.items[0], src[0]);
        assert.deepEqual(s.items[0], src[0]);
    });

    it('setItems with a non-array resets to empty', () => {
        const s = new RecordItemStack();
        s.setItems([item(1)]);
        s.setItems(null);
        assert.equal(s.count, 0);
    });

    it('current points at index 0 after setItems', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2)]);
        assert.deepEqual(s.current, item(1));
    });

    it('next advances the index and returns the next item', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2), item(3)]);
        assert.deepEqual(s.next(), item(2));
        assert.equal(s.index, 1);
    });

    it('prev decrements the index', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2)]);
        s.next();
        assert.deepEqual(s.prev(), item(1));
        assert.equal(s.index, 0);
    });

    it('nextIndex advances without returning', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2)]);
        s.nextIndex();
        assert.equal(s.index, 1);
    });

    it('clearIndex resets index to 0', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2)]);
        s.next();
        s.clearIndex();
        assert.equal(s.index, 0);
    });

    it('clear restores items from source and resets index', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2)]);
        s.next();
        s.clear();
        assert.equal(s.index, 0);
        assert.equal(s.count, 2);
    });

    it('count reflects the number of items', () => {
        const s = new RecordItemStack();
        s.setItems([item(1), item(2), item(3)]);
        assert.equal(s.count, 3);
    });
});
