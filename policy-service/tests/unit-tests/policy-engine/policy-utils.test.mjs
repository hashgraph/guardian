import assert from 'node:assert/strict';
import { Module } from 'node:module';

const originalLoad = Module._load;
Module._load = function (req, parent, ...rest) {
    if (typeof req !== 'string') return originalLoad.call(this, req, parent, ...rest);
    if (req === '@guardian/common') {
        return {
            HederaDidDocument: class {},
            IAuthUser: class {},
            KeyType: { KEY: 'KEY', TOKEN_FREEZE_KEY: 'F', TOKEN_KYC_KEY: 'K', TOKEN_TREASURY_KEY: 'T', TOKEN_ADMIN_KEY: 'A', TOKEN_SUPPLY_KEY: 'S', TOKEN_WIPE_KEY: 'W', RELAYER_ACCOUNT: 'R' },
            NotificationHelper: { info: async () => {} },
            Schema: class {},
            Token: class {},
            Topic: class {},
            TopicConfig: { fromObject: async () => null },
            TopicHelper: class {},
            Users: class {},
            VcDocument: class { getCredentialSubject() { return { getFields: () => ({}) }; } toCredentialHash() { return 'hash-1'; } toJsonTree() { return { document: 'tree' }; } },
            VcDocumentDefinition: class { constructor() {} addCredentialSubject() {} getCredentialSubject() { return { getFields: () => ({}) }; } toCredentialHash() { return 'hash-1'; } toJsonTree() { return { document: 'tree' }; } },
            VcSubject: { create: (s) => s },
            VpDocumentDefinition: class { toCredentialHash() { return 'h'; } toJsonTree() { return {}; } },
            Wallet: class { async getKey() { return 'k'; } async setKey() {} async getUserKey() { return 'k'; } async setUserKey() {} },
            Workers: class { async addNonRetryableTask() { return {}; } async addRetryableTask() { return {}; } },
            EncryptVcHelper: { encrypt: async () => 'enc' },
            SchemaConverterUtils: { versionCompare: (a, b) => a >= b ? 1 : -1 },
            Tag: class {},
        };
    }
    if (req === '@guardian/interfaces') {
        const proxyEnum = () => new Proxy({}, { get: (_, p) => String(p) });
        return {
            DidDocumentStatus: { CREATE: 'CREATE' },
            DocumentSignature: { NEW: 'NEW' },
            DocumentStatus: { NEW: 'NEW' },
            SchemaEntity: proxyEnum(),
            SchemaField: class {},
            SignatureType: { BbsBlsSignature2020: 'BbsBlsSignature2020' },
            TagType: { PolicyBlock: 'PolicyBlock' },
            TopicType: { InstancePolicyTopic: 'InstancePolicyTopic', DynamicTopic: 'DynamicTopic' },
            WorkerTaskType: proxyEnum(),
            NetworkOptions: {},
            TenantContext: { Empty: { tenantId: null }, fromTenantId: (id) => ({ tenantId: id }) },
        };
    }
    if (req === '@hiero-ledger/sdk') {
        return { TokenId: class { constructor(v) { this.v = v; } toString() { return `0.0.${this.v}`; } }, TopicId: class {} };
    }
    if (req === '@mikro-orm/core') return { FilterQuery: class {} };
    return originalLoad.call(this, req, parent, ...rest);
};

let PolicyUtils, QueryType;
try {
    ({ PolicyUtils, QueryType } = await import('../../../dist/policy-engine/helpers/utils.js'));
} catch (e) {
    console.warn('[policy-utils.test] dist import failed:', e.message);
}

after(() => { Module._load = originalLoad; });

describe('@unit PolicyUtils — pure helpers', () => {
    if (!PolicyUtils) { it.skip('dist not available', () => {}); return; }

    describe('variables', () => {
        it('extracts symbol-node names from a formula', () => {
            const vars = PolicyUtils.variables('a + b * c');
            assert.deepEqual(vars.sort(), ['a', 'b', 'c']);
        });

        it('returns [] on a constant', () => {
            assert.deepEqual(PolicyUtils.variables('42'), []);
        });

        it('returns [] on a malformed formula (mathjs throws → caught)', () => {
            assert.deepEqual(PolicyUtils.variables('1 + + +'), []);
        });

        it('does not extract built-in function names', () => {
            const vars = PolicyUtils.variables('sin(x)');
            assert.deepEqual(vars, ['x']);
        });
    });

    describe('evaluateFormula', () => {
        it('evaluates simple arithmetic', () => {
            assert.equal(PolicyUtils.evaluateFormula('2 + 3', {}), 5);
        });

        it('substitutes scope variables', () => {
            assert.equal(PolicyUtils.evaluateFormula('a * b', { a: 4, b: 5 }), 20);
        });

        it('returns "Incorrect formula" on parse error', () => {
            assert.equal(PolicyUtils.evaluateFormula('++--', {}), 'Incorrect formula');
        });

        it('returns "Incorrect formula" on missing variable', () => {
            assert.equal(PolicyUtils.evaluateFormula('a + b', { a: 1 }), 'Incorrect formula');
        });
    });

    describe('evaluateCustomFormula', () => {
        it('evaluates with custom equality operators', () => {
            assert.equal(PolicyUtils.evaluateCustomFormula('1 + 1', {}), 2);
        });

        it('returns "Incorrect formula" on error', () => {
            assert.equal(PolicyUtils.evaluateCustomFormula('@@@', {}), 'Incorrect formula');
        });
    });

    describe('aggregateSerialRange', () => {
        it('emits a contiguous array from start to end inclusive', () => {
            assert.deepEqual(PolicyUtils.aggregateSerialRange(5, 8), [5, 6, 7, 8]);
        });

        it('handles reversed args (auto-swaps)', () => {
            assert.deepEqual(PolicyUtils.aggregateSerialRange(10, 7), [7, 8, 9, 10]);
        });

        it('single-element range when start === end', () => {
            assert.deepEqual(PolicyUtils.aggregateSerialRange(42, 42), [42]);
        });

        it('handles 0', () => {
            assert.deepEqual(PolicyUtils.aggregateSerialRange(0, 2), [0, 1, 2]);
        });
    });

    describe('tokenAmount', () => {
        it('multiplies by 10^decimals and returns [int, formatted]', () => {
            const [val, str] = PolicyUtils.tokenAmount({ decimals: '2' }, 1.5);
            assert.equal(val, 150);
            assert.equal(str, '1.50');
        });

        it('handles 0 decimals (whole tokens)', () => {
            const [val, str] = PolicyUtils.tokenAmount({ decimals: '0' }, 10);
            assert.equal(val, 10);
            assert.equal(str, '10');
        });

        it('handles missing decimals (defaults to 0)', () => {
            const [val, str] = PolicyUtils.tokenAmount({}, 7);
            assert.equal(val, 7);
            assert.equal(str, '7');
        });

        it('handles fractional amounts with rounding', () => {
            const [val] = PolicyUtils.tokenAmount({ decimals: '4' }, 1.234567);
            // 1.234567 * 10000 = 12345.67 → rounded to 12346
            assert.equal(val, 12346);
        });
    });

    describe('splitChunk', () => {
        it('splits into chunks of size N', () => {
            assert.deepEqual(PolicyUtils.splitChunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
        });

        it('returns single chunk when chunk >= length', () => {
            assert.deepEqual(PolicyUtils.splitChunk([1, 2], 99), [[1, 2]]);
        });

        it('returns [] on empty input', () => {
            assert.deepEqual(PolicyUtils.splitChunk([], 5), []);
        });
    });

    describe('getObjectValue / setObjectValue', () => {
        it('gets a nested value via dot path', () => {
            const obj = { a: { b: { c: 42 } } };
            assert.equal(PolicyUtils.getObjectValue(obj, 'a.b.c'), 42);
        });

        it('returns null for missing path', () => {
            const obj = { a: { b: null } };
            assert.equal(PolicyUtils.getObjectValue(obj, 'a.b.c'), null);
        });

        it('returns null when field is empty', () => {
            assert.equal(PolicyUtils.getObjectValue({}, ''), null);
        });

        it('"L" key descends into the LAST element of an array', () => {
            const obj = { items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
            assert.equal(PolicyUtils.getObjectValue(obj, 'items.L.v'), 3);
        });

        it('setObjectValue writes to a nested path', () => {
            const obj = { a: { b: {} } };
            PolicyUtils.setObjectValue(obj, 'a.b.c', 99);
            assert.equal(obj.a.b.c, 99);
        });

        it('setObjectValue with empty field is a no-op', () => {
            const obj = { x: 1 };
            PolicyUtils.setObjectValue(obj, '', 2);
            assert.deepEqual(obj, { x: 1 });
        });
    });

    describe('getArray', () => {
        it('wraps a non-array in an array', () => {
            assert.deepEqual(PolicyUtils.getArray('foo'), ['foo']);
        });

        it('returns arrays unchanged', () => {
            const arr = [1, 2, 3];
            assert.strictEqual(PolicyUtils.getArray(arr), arr);
        });
    });

    describe('getSubjectId / getCredentialSubject', () => {
        it('getSubjectId reads single-object credentialSubject.id', () => {
            const doc = { document: { credentialSubject: { id: 'urn:x' } } };
            assert.equal(PolicyUtils.getSubjectId(doc), 'urn:x');
        });

        it('getSubjectId reads array credentialSubject[0].id', () => {
            const doc = { document: { credentialSubject: [{ id: 'urn:y' }] } };
            assert.equal(PolicyUtils.getSubjectId(doc), 'urn:y');
        });

        it('getSubjectId returns null for missing document', () => {
            assert.equal(PolicyUtils.getSubjectId({}), null);
            assert.equal(PolicyUtils.getSubjectId(null), null);
        });

        it('getCredentialSubject returns the subject (array or object form)', () => {
            assert.deepEqual(
                PolicyUtils.getCredentialSubject({ document: { credentialSubject: { foo: 1 } } }),
                { foo: 1 },
            );
            assert.deepEqual(
                PolicyUtils.getCredentialSubject({ document: { credentialSubject: [{ foo: 2 }] } }),
                { foo: 2 },
            );
        });

        it('getCredentialSubjectByDocument works on raw document (no .document wrapper)', () => {
            assert.deepEqual(
                PolicyUtils.getCredentialSubjectByDocument({ credentialSubject: { x: 1 } }),
                { x: 1 },
            );
        });
    });

    describe('getDocumentType', () => {
        it('detects VP via document.verifiableCredential', () => {
            const doc = { document: { verifiableCredential: [{}] } };
            assert.equal(PolicyUtils.getDocumentType(doc), 'VerifiablePresentation');
        });

        it('detects VC via document.credentialSubject', () => {
            const doc = { document: { credentialSubject: {} } };
            assert.equal(PolicyUtils.getDocumentType(doc), 'VerifiableCredential');
        });

        it('detects DID via document.verificationMethod', () => {
            const doc = { document: { verificationMethod: [] } };
            assert.equal(PolicyUtils.getDocumentType(doc), 'DID');
        });

        it('returns null when no discriminator present', () => {
            assert.equal(PolicyUtils.getDocumentType({ document: {} }), null);
            assert.equal(PolicyUtils.getDocumentType({}), null);
        });
    });

    describe('checkDocumentField', () => {
        it('"equal" matches when filter.value === document path value', () => {
            const doc = { a: { b: 'foo' } };
            assert.equal(PolicyUtils.checkDocumentField(doc, { field: 'a.b', type: 'equal', value: 'foo' }), true);
        });

        it('"equal" returns false on mismatch', () => {
            assert.equal(PolicyUtils.checkDocumentField({ a: { b: 'foo' } }, { field: 'a.b', type: 'equal', value: 'bar' }), false);
        });

        it('"not_equal" inverts equal', () => {
            assert.equal(PolicyUtils.checkDocumentField({ a: 'x' }, { field: 'a', type: 'not_equal', value: 'y' }), true);
        });

        it('"in" returns true when array contains filter.value', () => {
            assert.equal(PolicyUtils.checkDocumentField({ tags: ['a', 'b'] }, { field: 'tags', type: 'in', value: 'a' }), true);
        });

        it('"in" returns false on non-array', () => {
            assert.equal(PolicyUtils.checkDocumentField({ tags: 'a' }, { field: 'tags', type: 'in', value: 'a' }), false);
        });

        it('"not_in" inverts "in"', () => {
            assert.equal(PolicyUtils.checkDocumentField({ tags: ['a'] }, { field: 'tags', type: 'not_in', value: 'b' }), true);
        });

        it('unknown filter type returns false', () => {
            assert.equal(PolicyUtils.checkDocumentField({ a: 1 }, { field: 'a', type: 'invented', value: 1 }), false);
        });

        it('null document returns false', () => {
            assert.equal(PolicyUtils.checkDocumentField(null, { field: 'a', type: 'equal', value: 1 }), false);
        });
    });

    describe('getDocumentRef', () => {
        it('reads ref off credentialSubject (object form)', () => {
            const doc = { document: { credentialSubject: { ref: 'urn:r' } } };
            assert.equal(PolicyUtils.getDocumentRef(doc), 'urn:r');
        });

        it('reads ref off credentialSubject[0] (array form)', () => {
            const doc = { document: { credentialSubject: [{ ref: 'urn:s' }] } };
            assert.equal(PolicyUtils.getDocumentRef(doc), 'urn:s');
        });

        it('handles VP nested verifiableCredential.credentialSubject', () => {
            const doc = { document: { verifiableCredential: [{ credentialSubject: { ref: 'urn:nested' } }] } };
            assert.equal(PolicyUtils.getDocumentRef(doc), 'urn:nested');
        });

        it('returns null when no document', () => {
            assert.equal(PolicyUtils.getDocumentRef({}), null);
        });
    });

    describe('getScopeId', () => {
        it('returns group:owner when group is set', () => {
            assert.equal(PolicyUtils.getScopeId({ group: 'g1', owner: 'did:o' }), 'g1:did:o');
        });

        it('returns just owner when group is missing', () => {
            assert.equal(PolicyUtils.getScopeId({ owner: 'did:o' }), 'did:o');
        });
    });

    describe('createHederaCredentials', () => {
        it('packs id + accountId + key into a record', () => {
            const c = PolicyUtils.createHederaCredentials('0.0.1', 'priv', 'u-1');
            assert.deepEqual(c, { hederaAccountId: '0.0.1', hederaAccountKey: 'priv', id: 'u-1' });
        });

        it('defaults key and id to null', () => {
            const c = PolicyUtils.createHederaCredentials('0.0.1');
            assert.equal(c.hederaAccountKey, null);
            assert.equal(c.id, null);
        });
    });

    describe('getErrorMessage', () => {
        it('returns strings verbatim', () => {
            assert.equal(PolicyUtils.getErrorMessage('boom'), 'boom');
        });

        it('reads .message from Error', () => {
            assert.equal(PolicyUtils.getErrorMessage(new Error('e1')), 'e1');
        });

        it('reads .error when .message is missing', () => {
            assert.equal(PolicyUtils.getErrorMessage({ error: 'e2' }), 'e2');
        });

        it('reads .name when .message and .error are missing', () => {
            assert.equal(PolicyUtils.getErrorMessage({ name: 'NameOnly' }), 'NameOnly');
        });

        it('returns "Unidentified error" for plain objects', () => {
            // console.error is called; that's fine in test
            const original = console.error;
            console.error = () => {};
            try {
                assert.equal(PolicyUtils.getErrorMessage({}), 'Unidentified error');
            } finally {
                console.error = original;
            }
        });
    });

    describe('getDocumentIssuer', () => {
        it('returns issuer when it is a string', () => {
            assert.equal(PolicyUtils.getDocumentIssuer({ issuer: 'did:x' }), 'did:x');
        });

        it('returns issuer.id when it is an object', () => {
            assert.equal(PolicyUtils.getDocumentIssuer({ issuer: { id: 'did:y' } }), 'did:y');
        });

        it('returns null when issuer is missing', () => {
            assert.equal(PolicyUtils.getDocumentIssuer({}), null);
            assert.equal(PolicyUtils.getDocumentIssuer(null), null);
        });

        it('returns null when issuer.id is missing on the object form', () => {
            assert.equal(PolicyUtils.getDocumentIssuer({ issuer: {} }), null);
        });
    });

    describe('parseFilterValue', () => {
        it('parses "eq:value" prefix', () => {
            assert.deepEqual(PolicyUtils.parseFilterValue('eq:foo'), [QueryType.eq, 'foo']);
        });

        it('parses "ne:value"', () => {
            assert.deepEqual(PolicyUtils.parseFilterValue('ne:foo'), [QueryType.ne, 'foo']);
        });

        it('parses "in:value"', () => {
            assert.deepEqual(PolicyUtils.parseFilterValue('in:foo'), [QueryType.in, 'foo']);
        });

        it('parses "gt:", "gte:", "lt:", "lte:", "nin:", "regex:" prefixes', () => {
            assert.deepEqual(PolicyUtils.parseFilterValue('gt:5'), [QueryType.gt, '5']);
            assert.deepEqual(PolicyUtils.parseFilterValue('gte:5'), [QueryType.gte, '5']);
            assert.deepEqual(PolicyUtils.parseFilterValue('lt:5'), [QueryType.lt, '5']);
            assert.deepEqual(PolicyUtils.parseFilterValue('lte:5'), [QueryType.lte, '5']);
            assert.deepEqual(PolicyUtils.parseFilterValue('nin:5'), [QueryType.nin, '5']);
            assert.deepEqual(PolicyUtils.parseFilterValue('regex:abc'), [QueryType.regex, 'abc']);
        });

        it('returns [null, value] when no prefix matches', () => {
            assert.deepEqual(PolicyUtils.parseFilterValue('plainvalue'), [null, 'plainvalue']);
        });

        it('returns [null, value] for non-string input', () => {
            assert.deepEqual(PolicyUtils.parseFilterValue(42), [null, 42]);
        });
    });

    describe('getQueryValue', () => {
        it('coerces numbers to strings', () => {
            assert.equal(PolicyUtils.getQueryValue(QueryType.eq, 42), '42');
        });

        it('"in" splits comma-separated string into array', () => {
            assert.deepEqual(PolicyUtils.getQueryValue(QueryType.in, 'a,b,c'), ['a', 'b', 'c']);
        });

        it('"nin" splits comma-separated string into array', () => {
            assert.deepEqual(PolicyUtils.getQueryValue(QueryType.nin, 'x,y'), ['x', 'y']);
        });

        it('"regex" wraps value in .* on both sides', () => {
            assert.equal(PolicyUtils.getQueryValue(QueryType.regex, 'foo'), '.*foo.*');
        });

        it('returns null for non-string non-number values', () => {
            assert.equal(PolicyUtils.getQueryValue(QueryType.eq, {}), null);
            assert.equal(PolicyUtils.getQueryValue(QueryType.eq, null), null);
        });
    });

    describe('getQueryExpression', () => {
        it('wraps each query type in the appropriate Mongo operator', () => {
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.eq, 'x'), { $eq: 'x' });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.ne, 'x'), { $ne: 'x' });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.in, ['a']), { $in: ['a'] });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.nin, ['a']), { $nin: ['a'] });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.gt, 5), { $gt: 5 });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.gte, 5), { $gte: 5 });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.lt, 5), { $lt: 5 });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.lte, 5), { $lte: 5 });
            assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.regex, '.*x.*'), { $regex: '.*x.*' });
        });

        it('returns null for null/undefined value', () => {
            assert.equal(PolicyUtils.getQueryExpression(QueryType.eq, null), null);
            assert.equal(PolicyUtils.getQueryExpression(QueryType.eq, undefined), null);
        });

        it('returns null for unknown query type', () => {
            assert.equal(PolicyUtils.getQueryExpression('invented', 'x'), null);
        });
    });

    describe('parseQueryNumberValue', () => {
        it('returns [stringValues, numberValues] for arrays of numerics', () => {
            const out = PolicyUtils.parseQueryNumberValue([1, 2, 3]);
            assert.deepEqual(out, [['1', '2', '3'], [1, 2, 3]]);
        });

        it('returns null for arrays containing non-numerics', () => {
            assert.equal(PolicyUtils.parseQueryNumberValue([1, 'abc']), null);
        });

        it('returns null for empty array', () => {
            assert.equal(PolicyUtils.parseQueryNumberValue([]), null);
        });

        it('handles single numeric value', () => {
            assert.deepEqual(PolicyUtils.parseQueryNumberValue('42'), ['42', 42]);
        });

        it('returns null for non-numeric single value', () => {
            assert.equal(PolicyUtils.parseQueryNumberValue('abc'), null);
        });
    });

    describe('parseQuery', () => {
        it('parses explicit type+value', () => {
            const q = PolicyUtils.parseQuery('equal', 'foo');
            assert.equal(q.type, QueryType.eq);
            assert.equal(q.value, 'foo');
            assert.deepEqual(q.expression, { $eq: 'foo' });
        });

        it('parses user_defined value with eq: prefix', () => {
            const q = PolicyUtils.parseQuery('user_defined', 'eq:bar');
            assert.equal(q.type, QueryType.eq);
            assert.equal(q.value, 'bar');
        });

        it('user_defined without a prefix yields type=null and null expression', () => {
            const q = PolicyUtils.parseQuery('user_defined', 'bare');
            assert.equal(q.type, null);
            assert.equal(q.expression, null);
        });
    });

    describe('cloneVC', () => {
        it('shallow-copies + deep-clones document property', () => {
            const ref = { policyId: 'p2' };
            const original = { policyId: 'p1', document: { inner: { v: 1 } }, other: 'x' };
            const clone = PolicyUtils.cloneVC(ref, original);
            assert.equal(clone.policyId, 'p2');
            assert.equal(clone.other, 'x');
            assert.notStrictEqual(clone.document, original.document);
            assert.deepEqual(clone.document, original.document);
            // Mutating clone.document.inner does not affect original
            clone.document.inner.v = 99;
            assert.equal(original.document.inner.v, 1);
        });

        it('handles a document with no inner .document property', () => {
            const clone = PolicyUtils.cloneVC({ policyId: 'p1' }, { policyId: 'old', meta: 'y' });
            assert.equal(clone.policyId, 'p1');
            assert.equal(clone.meta, 'y');
        });
    });

    describe('setDocumentRef', () => {
        it('clears relationships when ref omitted', () => {
            const doc = {};
            PolicyUtils.setDocumentRef(doc, null);
            assert.equal(doc.relationships, null);
        });

        it('sets relationships to [ref.messageId] when ref provided', () => {
            const doc = {};
            PolicyUtils.setDocumentRef(doc, { messageId: 'm-1' });
            assert.deepEqual(doc.relationships, ['m-1']);
        });

        it('merges accounts and tokens from ref into doc', () => {
            const doc = { accounts: { keep: 'me' } };
            PolicyUtils.setDocumentRef(doc, {
                messageId: 'm-2',
                accounts: { extra: 'them' },
                tokens: { t1: 'x' },
            });
            assert.deepEqual(doc.accounts, { extra: 'them', keep: 'me' });
            assert.deepEqual(doc.tokens, { t1: 'x' });
        });

        it('clears empty relationships array to null', () => {
            const doc = { relationships: [] };
            PolicyUtils.setDocumentRef(doc, null);
            assert.equal(doc.relationships, null);
        });
    });

    describe('createPolicyDocument / createDID / createVP / createVC / createUnsignedVC', () => {
        const ref = { policyId: 'p-1', tag: 'tag-1' };
        const owner = { did: 'did:o', group: 'g-1' };

        it('createPolicyDocument packs policyId/tag/owner/group', () => {
            const out = PolicyUtils.createPolicyDocument(ref, owner, { foo: 1 });
            assert.equal(out.policyId, 'p-1');
            assert.equal(out.tag, 'tag-1');
            assert.equal(out.owner, 'did:o');
            assert.equal(out.group, 'g-1');
            assert.deepEqual(out.document, { foo: 1 });
        });

        it('createDID includes did + status=CREATE', () => {
            const fakeDoc = { getDid: () => 'did:abc', getDocument: () => ({ d: 1 }) };
            const out = PolicyUtils.createDID(ref, owner, fakeDoc);
            assert.equal(out.did, 'did:abc');
            assert.equal(out.status, 'CREATE');
            assert.deepEqual(out.document, { d: 1 });
        });

        it('createVP includes hash + signature=NEW + status=NEW', () => {
            const vp = { toCredentialHash: () => 'h-1', toJsonTree: () => ({ tree: 1 }) };
            const out = PolicyUtils.createVP(ref, owner, vp, 'rec-1');
            assert.equal(out.hash, 'h-1');
            assert.equal(out.status, 'NEW');
            assert.equal(out.signature, 0);
            assert.equal(out.recordActionId, 'rec-1');
        });

        it('createUnsignedVC omits owner/hash (used for pre-sign forms)', () => {
            const vc = { toJsonTree: () => ({ tree: 'u' }) };
            const out = PolicyUtils.createUnsignedVC(ref, vc);
            assert.equal(out.policyId, 'p-1');
            assert.equal(out.owner, undefined);
            assert.equal(out.hash, undefined);
        });

        it('createVC sets hederaStatus and signature to NEW', () => {
            const vc = { toCredentialHash: () => 'h2', toJsonTree: () => ({ t: 2 }) };
            const out = PolicyUtils.createVC(ref, owner, vc);
            assert.equal(out.hederaStatus, 'NEW');
            assert.equal(out.signature, 0);
        });
    });

    describe('needEncryptVC', () => {
        it('returns true for BbsBlsSignature2020 proof', () => {
            const doc = { document: { proof: { type: 'BbsBlsSignature2020' } } };
            assert.equal(PolicyUtils.needEncryptVC(doc), true);
        });

        it('returns false for other proof types', () => {
            assert.equal(PolicyUtils.needEncryptVC({ document: { proof: { type: 'Ed25519' } } }), false);
        });

        it('returns false when no proof', () => {
            assert.equal(PolicyUtils.needEncryptVC({ document: {} }), false);
            assert.equal(PolicyUtils.needEncryptVC({}), false);
            assert.equal(PolicyUtils.needEncryptVC(null), false);
        });
    });

    describe('aggregate', () => {
        it('sums evaluated formula across documents', () => {
            const mkVc = (val) => ({ getCredentialSubject: () => ({ getFields: () => ({ x: val }) }) });
            const total = PolicyUtils.aggregate('x', [mkVc(1), mkVc(2), mkVc(3)]);
            assert.equal(total, 6);
        });

        it('returns 0 for empty VC list', () => {
            assert.equal(PolicyUtils.aggregate('x', []), 0);
        });

        it('NaN-coerces non-numeric formula results', () => {
            const mkVc = () => ({ getCredentialSubject: () => ({ getFields: () => ({}) }) });
            const result = PolicyUtils.aggregate('y', [mkVc()]);
            assert.equal(Number.isNaN(result), true);
        });
    });

    describe('createVcFromSubject', () => {
        it('returns a VcDocument with the subject attached', () => {
            const out = PolicyUtils.createVcFromSubject({ id: 'x' });
            assert.ok(out);
        });
    });

    describe('getHederaAccounts', () => {
        it('returns a map keyed by field.path with default fallback', () => {
            const schema = {
                searchFields: (pred) => [
                    { path: 'beneficiary', customType: 'hederaAccount' },
                    { path: 'project.owner', customType: 'hederaAccount' },
                ].filter(pred),
            };
            const vc = {
                getField: (path) => path === 'beneficiary' ? '0.0.10' : '0.0.20',
            };
            const out = PolicyUtils.getHederaAccounts(vc, '0.0.default', schema);
            assert.equal(out.beneficiary, '0.0.10');
            assert.equal(out['project.owner'], '0.0.20');
            assert.equal(out.default, '0.0.default');
        });

        it('returns only {default} when schema is missing', () => {
            const out = PolicyUtils.getHederaAccounts({}, '0.0.x', null);
            assert.deepEqual(out, { default: '0.0.x' });
        });
    });
});
