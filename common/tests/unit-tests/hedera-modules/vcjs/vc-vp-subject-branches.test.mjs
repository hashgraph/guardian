import { assert } from 'chai';

import { VcDocument } from '../../../../dist/hedera-modules/vcjs/vc-document.js';
import { VcSubject } from '../../../../dist/hedera-modules/vcjs/vc-subject.js';
import { VpDocument } from '../../../../dist/hedera-modules/vcjs/vp-document.js';

function makeVcTree(extra = {}) {
    return {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: 'did:hedera:testnet:issuer_0.0.1',
        issuanceDate: '2020-01-01T00:00:00.000Z',
        credentialSubject: [{ id: 'subj', type: 'TestType', a: { b: [1, 2, 3] }, name: 'n' }],
        ...extra,
    };
}

describe('VcDocument.getField traversal', function () {
    it('resolves a nested dotted path', function () {
        const vc = VcDocument.fromJsonTree(makeVcTree());
        assert.deepEqual(vc.getField('a.b'), [1, 2, 3]);
    });

    it('resolves the last array element with the L selector', function () {
        const vc = VcDocument.fromJsonTree(makeVcTree());
        assert.equal(vc.getField('a.b.L'), 3);
    });

    it('returns null for a missing nested path', function () {
        const vc = VcDocument.fromJsonTree(makeVcTree());
        assert.isNull(vc.getField('does.not.exist'));
    });

    it('reads a field from a specific subject index', function () {
        const tree = makeVcTree({
            credentialSubject: [
                { id: 's0', type: 'T', value: 'first' },
                { id: 's1', type: 'T', value: 'second' },
            ],
        });
        const vc = VcDocument.fromJsonTree(tree);
        assert.equal(vc.getField('value', 1), 'second');
    });

    it('getSubjectType returns the first subject type', function () {
        const vc = VcDocument.fromJsonTree(makeVcTree());
        assert.equal(vc.getSubjectType(), 'TestType');
    });
});

describe('VcDocument context mutators', function () {
    it('addContexts handles a single string argument', function () {
        const vc = new VcDocument();
        vc.addContexts('http://single');
        assert.include(vc.getContext(), 'http://single');
    });

    it('addContexts handles an array argument and dedupes', function () {
        const vc = new VcDocument();
        vc.addContexts(['http://a', 'http://a', 'http://b']);
        const ctx = vc.getContext();
        assert.equal(ctx.filter((c) => c === 'http://a').length, 1);
        assert.include(ctx, 'http://b');
    });

    it('addContext ignores falsy values', function () {
        const vc = new VcDocument();
        const before = vc.getContext().length;
        vc.addContext(null);
        vc.addContext('');
        assert.equal(vc.getContext().length, before);
    });

    it('addType dedupes', function () {
        const vc = new VcDocument();
        vc.addType('Custom');
        vc.addType('Custom');
        assert.equal(vc.getType().filter((t) => t === 'Custom').length, 1);
    });
});

describe('VcDocument initId and tags', function () {
    it('getInitId returns null then the set value', function () {
        const vc = new VcDocument();
        assert.isNull(vc.getInitId());
        vc.setInitId('init-123');
        assert.equal(vc.getInitId(), 'init-123');
    });

    it('setTags / getTags round-trip', function () {
        const vc = new VcDocument();
        const tags = [{ messageId: 'm1', inheritTags: true }];
        vc.setTags(tags);
        assert.deepEqual(vc.getTags(), tags);
    });

    it('addTags only keeps inheritTags entries and dedupes by messageId', function () {
        const vc = new VcDocument();
        vc.addTags([
            { messageId: 'm1', inheritTags: true },
            { messageId: 'm1', inheritTags: true },
            { messageId: 'm2', inheritTags: false },
        ]);
        assert.lengthOf(vc.getTags(), 1);
        assert.equal(vc.getTags()[0].messageId, 'm1');
    });

    it('addTags is a no-op for empty input', function () {
        const vc = new VcDocument();
        vc.addTags([]);
        assert.isUndefined(vc.getTags());
    });
});

describe('VcSubject _clear over nested structures', function () {
    it('strips id/type/context from nested array elements', function () {
        const sub = VcSubject.create({
            id: 'outer', type: 'T',
            arr: [
                { id: 'i1', type: 'X', v: 1 },
                { id: 'i2', type: 'X', v: 2 },
            ],
        });
        const out = sub.toStaticObject();
        assert.lengthOf(out.arr, 2);
        assert.equal(out.arr[0].v, 1);
        assert.equal(out.arr[1].v, 2);
        assert.notProperty(out.arr[0], 'id');
        assert.notProperty(out.arr[0], 'type');
    });

    it('applies a clear function to each object', function () {
        const sub = VcSubject.create({ id: 'o', type: 'T', value: 1 });
        const out = sub.toStaticObject((m) => ({ ...m, marked: true }));
        assert.equal(out.marked, true);
    });

    it('frameField replaces a field with an empty object', function () {
        const sub = VcSubject.create({ id: 'o', type: 'T', value: 1 });
        sub.frameField('framed');
        assert.deepEqual(sub.getFields().framed, {});
    });

    it('removeField deletes a field', function () {
        const sub = VcSubject.create({ id: 'o', type: 'T', value: 1, drop: 2 });
        sub.removeField('drop');
        assert.notProperty(sub.getFields(), 'drop');
    });

    it('setField writes a field value', function () {
        const sub = VcSubject.create({ id: 'o', type: 'T' });
        sub.setField('added', 42);
        assert.equal(sub.getFields().added, 42);
    });

    it('getFields returns a copy, not the internal document', function () {
        const sub = VcSubject.create({ id: 'o', type: 'T', value: 1 });
        const copy = sub.getFields();
        copy.value = 999;
        assert.equal(sub.getFields().value, 1);
    });
});

describe('VpDocument credential accessors', function () {
    function makeVpTree() {
        return {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            verifiableCredential: [makeVcTree(), makeVcTree({ issuer: 'did:hedera:testnet:issuer2_0.0.2' })],
        };
    }

    it('getVerifiableCredential defaults to index 0', function () {
        const vp = VpDocument.fromJsonTree(makeVpTree());
        const vc = vp.getVerifiableCredential();
        assert.instanceOf(vc, VcDocument);
        assert.equal(vc.getIssuerDid(), 'did:hedera:testnet:issuer_0.0.1');
    });

    it('getVerifiableCredential reads a specific index', function () {
        const vp = VpDocument.fromJsonTree(makeVpTree());
        assert.equal(vp.getVerifiableCredential(1).getIssuerDid(), 'did:hedera:testnet:issuer2_0.0.2');
    });

    it('length reflects credential count', function () {
        const vp = VpDocument.fromJsonTree(makeVpTree());
        assert.equal(vp.length, 2);
    });

    it('getVerifiableCredentials returns all credentials', function () {
        const vp = VpDocument.fromJsonTree(makeVpTree());
        assert.lengthOf(vp.getVerifiableCredentials(), 2);
    });

    it('addVerifiableCredential ignores falsy', function () {
        const vp = new VpDocument();
        vp.addVerifiableCredential(null);
        assert.equal(vp.length, 0);
    });

    it('addVerifiableCredentials adds all from an array', function () {
        const vp = new VpDocument();
        const vc1 = VcDocument.fromJsonTree(makeVcTree());
        const vc2 = VcDocument.fromJsonTree(makeVcTree());
        vp.addVerifiableCredentials([vc1, vc2]);
        assert.equal(vp.length, 2);
    });

    it('toCredentialHash is a deterministic base58 string', function () {
        const a = VpDocument.fromJsonTree(makeVpTree()).toCredentialHash();
        const b = VpDocument.fromJsonTree(makeVpTree()).toCredentialHash();
        assert.isString(a);
        assert.equal(a, b);
        assert.match(a, /^[1-9A-HJ-NP-Za-km-z]+$/);
    });

    it('getDocument equals toJsonTree', function () {
        const vp = VpDocument.fromJsonTree(makeVpTree());
        assert.deepEqual(vp.getDocument(), vp.toJsonTree());
    });
});
