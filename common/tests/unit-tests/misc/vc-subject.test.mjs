import { assert } from 'chai';
import { VcSubject } from '../../../dist/hedera-modules/vcjs/vc-subject.js';

describe('VcSubject.create', () => {
    it('throws on null/undefined input', () => {
        assert.throws(() => VcSubject.create(null), /Subject is empty/);
        assert.throws(() => VcSubject.create(undefined), /Subject is empty/);
    });

    it('extracts id, type, @context onto the instance and removes them from document', () => {
        const subject = VcSubject.create({
            id: 'urn:uuid:abc',
            type: 'PolicyClaim',
            '@context': 'https://example.org/ctx',
            field1: 'v1',
            field2: 42,
        });
        assert.equal(subject.getId(), 'urn:uuid:abc');
        assert.equal(subject.getType(), 'PolicyClaim');
        assert.deepEqual(subject.getContext(), ['https://example.org/ctx']);
        assert.deepEqual(subject.getFields(), { field1: 'v1', field2: 42 });
    });

    it('coerces a bare uuid id to urn:uuid: form', () => {
        const subject = VcSubject.create({ id: 'abc' });
        assert.equal(subject.getId(), 'urn:uuid:abc');
    });

    it('keeps an id that already has a colon (e.g. did:hedera:...) untouched', () => {
        const subject = VcSubject.create({ id: 'did:hedera:testnet:xyz' });
        assert.equal(subject.getId(), 'did:hedera:testnet:xyz');
    });

    it('accepts an array @context and dedups via addContext', () => {
        const subject = VcSubject.create({
            '@context': ['https://a.example/ctx', 'https://a.example/ctx', 'https://b.example/ctx'],
        });
        assert.deepEqual(subject.getContext(), ['https://a.example/ctx', 'https://b.example/ctx']);
    });

    it('handles missing @context gracefully (empty array)', () => {
        const subject = VcSubject.create({ field: 'x' });
        assert.deepEqual(subject.getContext(), []);
    });
});

describe('VcSubject mutation methods', () => {
    it('setField writes into the document', () => {
        const subject = VcSubject.create({ id: 'urn:uuid:1' });
        subject.setField('newField', 'value');
        assert.equal(subject.getFields().newField, 'value');
    });

    it('removeField deletes from the document', () => {
        const subject = VcSubject.create({ field: 'v' });
        subject.removeField('field');
        assert.notProperty(subject.getFields(), 'field');
    });

    it('frameField replaces the value with an empty object', () => {
        const subject = VcSubject.create({ nested: 'old' });
        subject.frameField('nested');
        assert.deepEqual(subject.getFields().nested, {});
    });

    it('setId coerces bare uuid via convertUUID', () => {
        const subject = VcSubject.create({});
        subject.setId('plain');
        assert.equal(subject.getId(), 'urn:uuid:plain');
    });

    it('addContext deduplicates repeated entries', () => {
        const subject = VcSubject.create({});
        subject.addContext('https://a.example');
        subject.addContext('https://a.example');
        subject.addContext('https://b.example');
        assert.deepEqual(subject.getContext(), ['https://a.example', 'https://b.example']);
    });

    it('addContext is a no-op for null/undefined/false', () => {
        const subject = VcSubject.create({});
        subject.addContext(null);
        subject.addContext(undefined);
        subject.addContext(false);
        assert.deepEqual(subject.getContext(), []);
    });
});

describe('VcSubject.getField', () => {
    it('reads a top-level field', () => {
        const subject = VcSubject.create({ name: 'alice' });
        assert.equal(subject.getField('name'), 'alice');
    });

    it('walks a dotted path', () => {
        const subject = VcSubject.create({ a: { b: { c: 7 } } });
        assert.equal(subject.getField('a.b.c'), 7);
    });

    it('"L" returns the last array element', () => {
        const subject = VcSubject.create({ items: [{ v: 1 }, { v: 2 }, { v: 3 }] });
        assert.equal(subject.getField('items.L.v'), 3);
    });

    it('returns null for any error during traversal', () => {
        const subject = VcSubject.create({ a: 1 });
        assert.isNull(subject.getField('a.b.c'));
    });
});

describe('VcSubject.toJsonTree / fromJson round-trip', () => {
    it('round-trips id, type, @context, and document fields', () => {
        const original = VcSubject.create({
            id: 'urn:uuid:42',
            type: 'PolicyClaim',
            '@context': 'https://example.org/ctx',
            field: 'value',
            count: 7,
        });
        const json = original.toJson();
        const back = VcSubject.fromJson(json);
        assert.equal(back.getId(), original.getId());
        assert.equal(back.getType(), original.getType());
        assert.deepEqual(back.getContext(), original.getContext());
        assert.deepEqual(back.getFields(), original.getFields());
    });

    it('throws on malformed JSON', () => {
        assert.throws(() => VcSubject.fromJson('not-json{'), /not a valid VcSubject/);
    });
});

describe('VcSubject.toStaticObject', () => {
    it('returns a deep clone with system keys stripped at the top level (flat document)', () => {
        const subject = VcSubject.create({
            id: 'urn:uuid:1',
            type: 'X',
            '@context': 'ctx',
            field: 'value',
        });
        const obj = subject.toStaticObject();
        assert.equal(obj.field, 'value');
        assert.notProperty(obj, 'id');
        assert.notProperty(obj, 'type');
        assert.notProperty(obj, '@context');
    });

    it('returns a deep clone of the document (mutating the clone does not affect the source)', () => {
        const subject = VcSubject.create({ field: 'value' });
        const obj = subject.toStaticObject();
        obj.field = 'changed';
        assert.equal(subject.getField('field'), 'value');
    });
});

describe('VcSubject constants', () => {
    it('exposes CREDENTIAL_ID, CREDENTIAL_TYPE, CONTEXT key names', () => {
        assert.equal(VcSubject.CREDENTIAL_ID, 'id');
        assert.equal(VcSubject.CREDENTIAL_TYPE, 'type');
        assert.equal(VcSubject.CONTEXT, '@context');
    });
});
