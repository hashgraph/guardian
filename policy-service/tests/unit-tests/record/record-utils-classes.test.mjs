import { assert } from 'chai';
import {
    GenerateUUID,
    GenerateDID,
    RowDocument,
    Utils,
    RecordItemStack
} from '../../../dist/policy-engine/record/utils.js';

describe('record/utils GenerateUUID', () => {
    it('stores oldValue and newValue', () => {
        const g = new GenerateUUID('old', 'new');
        assert.equal(g.oldValue, 'old');
        assert.equal(g.newValue, 'new');
    });

    it('replace maps a bare old value to the new value', () => {
        const g = new GenerateUUID('old', 'new');
        assert.equal(g.replace('old'), 'new');
    });

    it('replace maps a urn:uuid: prefixed value', () => {
        const g = new GenerateUUID('old', 'new');
        assert.equal(g.replace('urn:uuid:old'), 'urn:uuid:new');
    });

    it('replace passes through an unknown string', () => {
        const g = new GenerateUUID('old', 'new');
        assert.equal(g.replace('other'), 'other');
    });

    it('replace passes through non-string values', () => {
        const g = new GenerateUUID('old', 'new');
        assert.equal(g.replace(42), 42);
        assert.deepEqual(g.replace({ a: 1 }), { a: 1 });
        assert.equal(g.replace(null), null);
    });
});

describe('record/utils GenerateDID', () => {
    it('stores oldValue and newValue', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.oldValue, 'did:old');
        assert.equal(g.newValue, 'did:new');
    });

    it('replace returns the new value on an exact match', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace('did:old'), 'did:new');
    });

    it('replace passes through a non-matching string', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace('did:other'), 'did:other');
    });

    it('replace passes through non-string values', () => {
        const g = new GenerateDID('did:old', 'did:new');
        assert.equal(g.replace(7), 7);
        assert.equal(g.replace(undefined), undefined);
    });
});

describe('record/utils RowDocument', () => {
    const baseDoc = (overrides = {}) => ({
        id: 'id1',
        _id: 'oid1',
        document: { id: 'docId' },
        ...overrides
    });

    it('check returns truthy only when id, _id, document and document.id all exist', () => {
        assert.ok(RowDocument.check(baseDoc()));
        assert.notOk(RowDocument.check({ id: 'a', _id: 'b', document: {} }));
        assert.notOk(RowDocument.check({ id: 'a', _id: 'b' }));
        assert.notOk(RowDocument.check({ _id: 'b', document: { id: 'd' } }));
        assert.notOk(RowDocument.check(null));
    });

    it('detects type vc from dryRunClass VcDocumentCollection', () => {
        const r = new RowDocument(baseDoc({ dryRunClass: 'VcDocumentCollection' }), null, null);
        assert.equal(r.type, 'vc');
    });

    it('detects type vp from dryRunClass VpDocumentCollection', () => {
        const r = new RowDocument(baseDoc({ dryRunClass: 'VpDocumentCollection' }), null, null);
        assert.equal(r.type, 'vp');
    });

    it('detects type did from dryRunClass DidDocumentCollection', () => {
        const r = new RowDocument(baseDoc({ dryRunClass: 'DidDocumentCollection' }), null, null);
        assert.equal(r.type, 'did');
    });

    it('detects type did when a did field is present', () => {
        const r = new RowDocument(baseDoc({ did: 'did:x' }), null, null);
        assert.equal(r.type, 'did');
    });

    it('detects type vc when a schema field is present', () => {
        const r = new RowDocument(baseDoc({ schema: 's#1' }), null, null);
        assert.equal(r.type, 'vc');
    });

    it('defaults type to vp when no markers are present', () => {
        const r = new RowDocument(baseDoc(), null, null);
        assert.equal(r.type, 'vp');
    });

    it('builds a document.id filter', () => {
        const r = new RowDocument(baseDoc(), null, null);
        assert.deepEqual(r.filters, { 'document.id': 'docId' });
    });

    it('replace writes the new row into the parent at the key and returns root', () => {
        const parent = { field: { old: true } };
        const root = { parent };
        const r = new RowDocument(baseDoc(), parent, 'field');
        const out = r.replace(root, { fresh: true });
        assert.equal(out, root);
        assert.deepEqual(parent.field, { fresh: true });
    });

    it('replace returns the row directly when there is no parent/key', () => {
        const r = new RowDocument(baseDoc(), null, null);
        const out = r.replace({ root: true }, { fresh: true });
        assert.deepEqual(out, { fresh: true });
    });

    it('replace returns root unchanged when row is falsy', () => {
        const parent = { field: 1 };
        const root = { parent };
        const r = new RowDocument(baseDoc(), parent, 'field');
        assert.equal(r.replace(root, null), root);
        assert.equal(parent.field, 1);
    });

    it('replace carries over assignedToGroup/assignedTo/option props', () => {
        const doc = baseDoc({ assignedToGroup: 'g', assignedTo: 'u', option: { x: 1 } });
        const r = new RowDocument(doc, null, null);
        const out = r.replace({}, { fresh: true });
        assert.equal(out.assignedToGroup, 'g');
        assert.equal(out.assignedTo, 'u');
        assert.deepEqual(out.option, { x: 1 });
    });
});

describe('record/utils Utils.replaceAllValues', () => {
    it('returns falsy input unchanged', () => {
        const g = new GenerateUUID('a', 'b');
        assert.equal(Utils.replaceAllValues(null, g), null);
        assert.equal(Utils.replaceAllValues(0, g), 0);
    });

    it('replaces a matching scalar string', () => {
        const g = new GenerateUUID('a', 'b');
        assert.equal(Utils.replaceAllValues('a', g), 'b');
    });

    it('replaces matching strings throughout a nested object', () => {
        const g = new GenerateUUID('a', 'b');
        const obj = { x: 'a', y: { z: 'a', keep: 'c' } };
        const out = Utils.replaceAllValues(obj, g);
        assert.deepEqual(out, { x: 'b', y: { z: 'b', keep: 'c' } });
    });

    it('replaces matching strings inside arrays', () => {
        const g = new GenerateUUID('a', 'b');
        const out = Utils.replaceAllValues(['a', 'c', 'a'], g);
        assert.deepEqual(out, ['b', 'c', 'b']);
    });

    it('mutates and returns the same object reference', () => {
        const g = new GenerateUUID('a', 'b');
        const obj = { x: 'a' };
        assert.equal(Utils.replaceAllValues(obj, g), obj);
    });

    it('leaves objects with no matching strings untouched', () => {
        const g = new GenerateDID('did:a', 'did:b');
        const obj = { x: 'plain', n: 5 };
        assert.deepEqual(Utils.replaceAllValues(obj, g), { x: 'plain', n: 5 });
    });
});

describe('record/utils Utils.findAllDocuments', () => {
    const doc = (id) => ({ id, _id: '_' + id, document: { id: 'd' + id }, schema: 's' });

    it('returns [] for non-object input', () => {
        assert.deepEqual(Utils.findAllDocuments(null), []);
        assert.deepEqual(Utils.findAllDocuments('x'), []);
    });

    it('finds a single top-level document', () => {
        const results = Utils.findAllDocuments({ a: doc('1') });
        assert.equal(results.length, 1);
        assert.instanceOf(results[0], RowDocument);
    });

    it('finds documents nested inside arrays', () => {
        const results = Utils.findAllDocuments({ list: [doc('1'), doc('2')] });
        assert.equal(results.length, 2);
    });

    it('records the parent and key for a found document', () => {
        const tree = { wrap: doc('1') };
        const results = Utils.findAllDocuments(tree);
        assert.equal(results[0].parent, tree);
        assert.equal(results[0].key, 'wrap');
    });

    it('does not recurse into a matched document', () => {
        const nested = doc('outer');
        nested.document.inner = doc('inner');
        const results = Utils.findAllDocuments({ root: nested });
        assert.equal(results.length, 1);
    });
});

describe('record/utils RecordItemStack', () => {
    const items = () => [{ name: 'a' }, { name: 'b' }, { name: 'c' }];

    it('starts empty with index 0', () => {
        const s = new RecordItemStack();
        assert.equal(s.count, 0);
        assert.equal(s.index, 0);
        assert.equal(s.current, undefined);
    });

    it('setItems loads a copy and resets the index', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        assert.equal(s.count, 3);
        assert.equal(s.index, 0);
        assert.deepEqual(s.current, { name: 'a' });
    });

    it('setItems deep-copies so source mutations do not leak in', () => {
        const src = items();
        const s = new RecordItemStack();
        s.setItems(src);
        src[0].name = 'mutated';
        assert.equal(s.current.name, 'a');
    });

    it('setItems with a non-array yields an empty stack', () => {
        const s = new RecordItemStack();
        s.setItems(null);
        assert.equal(s.count, 0);
    });

    it('next advances the index and returns the next item', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        assert.deepEqual(s.next(), { name: 'b' });
        assert.equal(s.index, 1);
        assert.deepEqual(s.next(), { name: 'c' });
    });

    it('next past the end returns undefined', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        s.next();
        s.next();
        assert.equal(s.next(), undefined);
        assert.equal(s.index, 3);
    });

    it('prev steps the index back', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        s.next();
        s.next();
        assert.deepEqual(s.prev(), { name: 'b' });
        assert.equal(s.index, 1);
    });

    it('nextIndex advances index without returning', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        s.nextIndex();
        assert.equal(s.index, 1);
        assert.deepEqual(s.current, { name: 'b' });
    });

    it('clearIndex resets the index but keeps items', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        s.next();
        s.clearIndex();
        assert.equal(s.index, 0);
        assert.equal(s.count, 3);
    });

    it('clear re-copies the source and resets the index', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        s.next();
        s.items[0].name = 'dirty';
        s.clear();
        assert.equal(s.index, 0);
        assert.equal(s.current.name, 'a');
    });

    it('items getter exposes the working copy', () => {
        const s = new RecordItemStack();
        s.setItems(items());
        assert.equal(s.items.length, 3);
    });
});
