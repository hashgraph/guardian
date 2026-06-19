import { assert } from 'chai';

import { VcSubject } from '../../../../dist/hedera-modules/vcjs/vc-subject.js';

import { vc_document } from '../../dump/vc_document.mjs';

describe('VcSubject extra branches', function () {
    it('constructor starts with empty context', function () {
        const s = new VcSubject();
        assert.deepEqual(s.getContext(), []);
    });

    it('create throws for empty input', function () {
        assert.throws(() => VcSubject.create(null), /Subject is empty/);
    });

    it('fromJson throws for invalid JSON', function () {
        assert.throws(() => VcSubject.fromJson('{nope'), /not a valid VcSubject/);
    });

    it('create extracts id, type and context out of the document', function () {
        const s = VcSubject.create({
            '@context': ['c1'],
            id: 'sub-1',
            type: 'MyType',
            field: 'value'
        });
        assert.equal(s.getId(), 'urn:uuid:sub-1');
        assert.equal(s.getType(), 'MyType');
        assert.deepEqual(s.getContext(), ['c1']);
        assert.deepEqual(s.getFields(), { field: 'value' });
    });

    it('create keeps already-prefixed id', function () {
        const s = VcSubject.create({ id: 'did:hedera:1', type: 'T' });
        assert.equal(s.getId(), 'did:hedera:1');
    });

    it('addContext deduplicates string entries', function () {
        const s = new VcSubject();
        s.addContext('a');
        s.addContext('a');
        s.addContext('b');
        assert.deepEqual(s.getContext(), ['a', 'b']);
    });

    it('addContext accepts an array', function () {
        const s = new VcSubject();
        s.addContext(['a', 'b', 'a']);
        assert.deepEqual(s.getContext(), ['a', 'b']);
    });

    it('addContext ignores falsy input', function () {
        const s = new VcSubject();
        s.addContext(null);
        s.addContext(undefined);
        s.addContext('');
        assert.deepEqual(s.getContext(), []);
    });

    it('setField / removeField / frameField mutate the document', function () {
        const s = VcSubject.create({ type: 'T', a: 1 });
        s.setField('b', 2);
        assert.equal(s.getField('b'), 2);
        s.removeField('a');
        assert.isUndefined(s.getField('a'));
        s.frameField('c');
        assert.deepEqual(s.getField('c'), {});
    });

    it('getField traverses nested dotted paths', function () {
        const s = VcSubject.create({ type: 'T', a: { b: { c: 7 } } });
        assert.equal(s.getField('a.b.c'), 7);
    });

    it('getField with L selects the last array element', function () {
        const s = VcSubject.create({ type: 'T', items: [{ v: 1 }, { v: 2 }, { v: 3 }] });
        assert.equal(s.getField('items.L.v'), 3);
    });

    it('getField returns null for a missing path', function () {
        const s = VcSubject.create({ type: 'T' });
        assert.isNull(s.getField('x.y.z'));
    });

    it('toJsonTree includes @context, id and type when present', function () {
        const s = VcSubject.create({ '@context': ['c'], id: 'i', type: 'T', f: 1 });
        const tree = s.toJsonTree();
        assert.deepEqual(tree['@context'], ['c']);
        assert.equal(tree.id, 'urn:uuid:i');
        assert.equal(tree.type, 'T');
        assert.equal(tree.f, 1);
    });

    it('toJsonTree omits @context when empty', function () {
        const s = VcSubject.create({ type: 'T', f: 1 });
        assert.notProperty(s.toJsonTree(), '@context');
    });

    it('toJson serializes the json tree', function () {
        const s = VcSubject.create({ type: 'T', f: 1 });
        assert.deepEqual(JSON.parse(s.toJson()), s.toJsonTree());
    });

    it('getFields returns a copy, not the internal document', function () {
        const s = VcSubject.create({ type: 'T', f: 1 });
        const fields = s.getFields();
        fields.f = 999;
        assert.equal(s.getField('f'), 1);
    });

    it('toStaticObject strips id/type/context recursively', function () {
        const s = VcSubject.create({
            type: 'T',
            nested: { id: 'x', type: 'Y', '@context': ['c'], keep: 5 }
        });
        const obj = s.toStaticObject();
        assert.equal(obj.nested.keep, 5);
        assert.notProperty(obj.nested, 'id');
        assert.notProperty(obj.nested, 'type');
        assert.notProperty(obj.nested, '@context');
    });

    it('toStaticObject applies the clear function to objects', function () {
        const s = VcSubject.create({ type: 'T', a: { keep: 1 } });
        const obj = s.toStaticObject((m) => {
            m.tagged = true;
            return m;
        });
        assert.isTrue(obj.tagged);
    });

    for (let i = 0; i < vc_document.length; i++) {
        const cs = vc_document[i].document.credentialSubject[0];

        it(`fixture ${i}: round-trips first credentialSubject`, function () {
            const clone = JSON.parse(JSON.stringify(cs));
            const expected = JSON.parse(JSON.stringify(cs));
            if (expected.id) {
                expected.id = VcSubject.convertUUID(expected.id);
            }
            const s = VcSubject.fromJsonTree(clone);
            assert.deepEqual(s.toJsonTree(), expected);
        });

        it(`fixture ${i}: getType matches`, function () {
            const s = VcSubject.fromJsonTree(JSON.parse(JSON.stringify(cs)));
            assert.equal(s.getType(), cs.type);
        });

        it(`fixture ${i}: fromJson string equals fromJsonTree`, function () {
            const a = VcSubject.fromJson(JSON.stringify(cs));
            const b = VcSubject.fromJsonTree(JSON.parse(JSON.stringify(cs)));
            assert.deepEqual(a.toJsonTree(), b.toJsonTree());
        });
    }
});
