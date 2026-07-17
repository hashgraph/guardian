import assert from 'node:assert/strict';
import { DocumentFieldsModel } from '../../dist/analytics/compare/models/document-fields.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

describe('DocumentFieldsModel.createSchemasList', () => {
    it('returns [] for falsy input', () => {
        assert.deepEqual(DocumentFieldsModel.createSchemasList(null), []);
        assert.deepEqual(DocumentFieldsModel.createSchemasList(undefined), []);
    });

    it('collects @context strings deduplicated', () => {
        const out = DocumentFieldsModel.createSchemasList({
            '@context': ['https://schema.org/A', 'https://schema.org/A', 'https://schema.org/B'],
        });
        assert.equal(out.length, 2);
        assert.ok(out.includes('https://schema.org/A'));
        assert.ok(out.includes('https://schema.org/B'));
    });

    it('drops the well-known credentials/v1 context', () => {
        const out = DocumentFieldsModel.createSchemasList({
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'https://schema.org/X',
            ],
        });
        assert.deepEqual(out, ['https://schema.org/X']);
    });

    it('accepts a plain string @context', () => {
        const out = DocumentFieldsModel.createSchemasList({
            '@context': 'https://schema.org/Y',
        });
        assert.deepEqual(out, ['https://schema.org/Y']);
    });

    it('walks a verifiableCredential array and merges every @context', () => {
        const out = DocumentFieldsModel.createSchemasList({
            verifiableCredential: [
                { '@context': ['https://a'] },
                { '@context': 'https://b' },
            ],
        });
        out.sort();
        assert.deepEqual(out, ['https://a', 'https://b']);
    });

    it('handles a single verifiableCredential object', () => {
        const out = DocumentFieldsModel.createSchemasList({
            verifiableCredential: { '@context': 'https://x' },
        });
        assert.deepEqual(out, ['https://x']);
    });
});

describe('DocumentFieldsModel.createTypesList', () => {
    it('returns [] for falsy input', () => {
        assert.deepEqual(DocumentFieldsModel.createTypesList(null), []);
    });

    it('collects credentialSubject.type from a single VC', () => {
        const out = DocumentFieldsModel.createTypesList({
            credentialSubject: { type: 'PolicyDoc' },
        });
        assert.deepEqual(out, ['PolicyDoc']);
    });

    it('walks each entry of credentialSubject when it is an array', () => {
        const out = DocumentFieldsModel.createTypesList({
            credentialSubject: [{ type: 'A' }, { type: 'B' }],
        });
        out.sort();
        assert.deepEqual(out, ['A', 'B']);
    });

    it('walks each VC of a verifiablePresentation', () => {
        const out = DocumentFieldsModel.createTypesList({
            verifiableCredential: [
                { credentialSubject: { type: 'X' } },
                { credentialSubject: [{ type: 'Y' }, { type: 'Z' }] },
            ],
        });
        out.sort();
        assert.deepEqual(out, ['X', 'Y', 'Z']);
    });

    it('handles a single verifiableCredential object', () => {
        const out = DocumentFieldsModel.createTypesList({
            verifiableCredential: { credentialSubject: { type: 'Solo' } },
        });
        assert.deepEqual(out, ['Solo']);
    });
});

describe('DocumentFieldsModel.createFieldsList', () => {
    it('classifies scalar leaves as DocumentPropertyModel (type=property)', () => {
        const list = DocumentFieldsModel.createFieldsList({ amount: 5, owner: 'did:1' });
        assert.equal(list.length, 2);
        assert.equal(list[0].type, 'property');
        assert.equal(list[0].path, 'amount');
        assert.equal(list[1].path, 'owner');
    });

    it('expands arrays into ArrayPropertyModel + numeric-keyed children', () => {
        const list = DocumentFieldsModel.createFieldsList({ list: [10, 20] });
        const arr = list.find((p) => p.path === 'list');
        assert.equal(arr.type, 'array');
        assert.equal(arr.value, 2);
        const child0 = list.find((p) => p.path === 'list.0');
        const child1 = list.find((p) => p.path === 'list.1');
        assert.equal(child0.value, 10);
        assert.equal(child1.value, 20);
    });

    it('expands plain objects into ObjectPropertyModel + recursive children', () => {
        const list = DocumentFieldsModel.createFieldsList({ payload: { a: 1, b: 2 } });
        const obj = list.find((p) => p.path === 'payload');
        assert.equal(obj.type, 'object');
        assert.equal(obj.value, true);
        assert.ok(list.find((p) => p.path === 'payload.a'));
        assert.ok(list.find((p) => p.path === 'payload.b'));
    });

    it('skips undefined values', () => {
        const list = DocumentFieldsModel.createFieldsList({ a: undefined, b: 1 });
        assert.equal(list.length, 1);
        assert.equal(list[0].path, 'b');
    });
});

describe('DocumentFieldsModel construction', () => {
    it('captures string type as-is and builds fields/schemas/types', () => {
        const m = new DocumentFieldsModel({
            type: 'VerifiableCredential',
            '@context': 'https://x',
            credentialSubject: { type: 'Foo', amount: 1 },
        });
        assert.deepEqual(m.schemas, ['https://x']);
        assert.deepEqual(m.types, ['Foo']);
        assert.ok(m.getFieldsList().length > 0);
    });

    it('classifies a "type" array containing VerifiablePresentation as VP', () => {
        const m = new DocumentFieldsModel({
            type: ['VerifiableCredential', 'VerifiablePresentation'],
            '@context': 'https://x',
            verifiableCredential: { credentialSubject: { type: 'Inner' } },
        });
        assert.deepEqual(m.types, ['Inner']);
    });

    it('falls back to type[0] for an unrecognised type array', () => {
        const m = new DocumentFieldsModel({
            type: ['UnknownTypeA', 'UnknownTypeB'],
            credentialSubject: { type: 'Sub' },
        });
        // type stays as 'UnknownTypeA' internally; types list is from credentialSubject.
        assert.deepEqual(m.types, ['Sub']);
    });
});

describe('DocumentFieldsModel instance methods', () => {
    it('hash() joins each field hash with a comma', () => {
        const m = new DocumentFieldsModel({
            type: 'VerifiableCredential',
            credentialSubject: { foo: 'bar' },
        });
        m.update(opts);
        const h = m.hash(opts);
        assert.ok(h.includes(','));
        assert.ok(h.length > 0);
    });

    it('getFieldsList() returns a defensive copy', () => {
        const m = new DocumentFieldsModel({
            type: 'VerifiableCredential',
            credentialSubject: { foo: 'bar' },
        });
        const list1 = m.getFieldsList();
        const original = list1.length;
        list1.push({});
        assert.equal(m.getFieldsList().length, original);
    });

    it('merge() concatenates another model\'s fields into this one', () => {
        const a = new DocumentFieldsModel({
            type: 'VerifiableCredential',
            credentialSubject: { foo: 'bar' },
        });
        const b = new DocumentFieldsModel({
            type: 'VerifiableCredential',
            credentialSubject: { baz: 'qux' },
        });
        const before = a.getFieldsList().length;
        a.merge(b);
        assert.equal(a.getFieldsList().length, before + b.getFieldsList().length);
    });
});
