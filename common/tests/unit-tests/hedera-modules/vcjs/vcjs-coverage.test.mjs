import { assert } from 'chai';

import { DefaultDocumentLoader } from '../../../../dist/hedera-modules/document-loader/document-loader-default.js';
import { LocalDidLoader } from '../../../../dist/document-loader/local-did-loader.js';
import { VCJS } from '../../../../dist/hedera-modules/vcjs/vcjs.js';
import { SignatureType } from '@guardian/interfaces';

void DefaultDocumentLoader;
void LocalDidLoader;

describe('VCJS coverage (offline paths)', function () {
    function makeVcjs() {
        return new VCJS('tenant-1');
    }

    describe('addContext', function () {
        it('pushes a context onto schemaContext', function () {
            const vcjs = makeVcjs();
            vcjs.addContext('ctx-a');
            vcjs.addContext('ctx-b');
            assert.deepEqual(vcjs.schemaContext, ['ctx-a', 'ctx-b']);
        });
    });

    describe('generateUUID', function () {
        it('returns the supplied uuid when present', function () {
            const vcjs = makeVcjs();
            assert.equal(vcjs.generateUUID({ uuid: 'fixed' }), 'fixed');
        });

        it('generates a urn:uuid prefix otherwise', function () {
            const vcjs = makeVcjs();
            assert.match(vcjs.generateUUID(), /^urn:uuid:/);
            assert.match(vcjs.generateUUID({}), /^urn:uuid:/);
        });
    });

    describe('addContextInSubject', function () {
        it('creates an array context when none exists', function () {
            const vcjs = makeVcjs();
            const s = vcjs.addContextInSubject({}, 'c1');
            assert.deepEqual(s['@context'], ['c1']);
        });

        it('pushes onto an existing array context', function () {
            const vcjs = makeVcjs();
            const s = vcjs.addContextInSubject({ '@context': ['c0'] }, 'c1');
            assert.deepEqual(s['@context'], ['c0', 'c1']);
        });

        it('wraps a scalar context into an array', function () {
            const vcjs = makeVcjs();
            const s = vcjs.addContextInSubject({ '@context': 'c0' }, 'c1');
            assert.deepEqual(s['@context'], ['c0', 'c1']);
        });
    });

    describe('addDryRunContext', function () {
        it('returns non-object inputs untouched', function () {
            const vcjs = makeVcjs();
            assert.equal(vcjs.addDryRunContext('str'), 'str');
            assert.equal(vcjs.addDryRunContext(null), null);
        });

        it('recurses over arrays', function () {
            const vcjs = makeVcjs();
            const arr = [{ type: 'A' }, { type: 'B' }];
            vcjs.addDryRunContext(arr);
            assert.deepEqual(arr[0]['@context'], ['schema:A']);
            assert.deepEqual(arr[1]['@context'], ['schema:B']);
        });

        it('returns object without type unchanged', function () {
            const vcjs = makeVcjs();
            const o = { foo: 1 };
            assert.strictEqual(vcjs.addDryRunContext(o), o);
            assert.isUndefined(o['@context']);
        });

        it('sets a default schema context and propagates to nested typed children', function () {
            const vcjs = makeVcjs();
            const o = { type: 'Root', child: { type: 'Child', v: 1 } };
            vcjs.addDryRunContext(o);
            assert.deepEqual(o['@context'], ['schema:Root']);
            assert.deepEqual(o.child['@context'], ['schema:Root']);
        });

        it('honours an explicit context override', function () {
            const vcjs = makeVcjs();
            const o = { type: 'Root' };
            vcjs.addDryRunContext(o, ['custom:ctx']);
            assert.deepEqual(o['@context'], ['custom:ctx']);
        });
    });

    describe('prepareSchema', function () {
        it('returns early when there are no $defs', function () {
            const vcjs = makeVcjs();
            const schema = { type: 'object' };
            assert.doesNotThrow(() => vcjs.prepareSchema(schema));
        });

        it('drops readOnly fields from a nested required list', function () {
            const vcjs = makeVcjs();
            const schema = {
                $defs: {
                    Foo: {
                        required: ['a', 'b'],
                        properties: { a: { readOnly: true }, b: { readOnly: false } }
                    },
                    Bar: { required: [], properties: {} }
                }
            };
            vcjs.prepareSchema(schema);
            assert.deepEqual(schema.$defs.Foo.required, ['b']);
            assert.deepEqual(schema.$defs.Bar.required, []);
        });
    });

    describe('verifySubject', function () {
        it('throws when no schema loader is configured', async function () {
            const vcjs = makeVcjs();
            await assertRejects(() => vcjs.verifySubject({ type: 'X' }), /Schema Loader not found/);
        });

        it('throws when the loader resolves no schema', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => null;
            await assertRejects(() => vcjs.verifySubject({ type: 'X' }), /Schema not found/);
        });

        it('validates a subject against a resolved schema (valid)', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name']
            });
            const result = await vcjs.verifySubject({ '@context': [], type: 'X', name: 'alice' });
            assert.isTrue(result.ok);
        });

        it('returns a failing CheckResult for an invalid subject', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name']
            });
            const result = await vcjs.verifySubject({ '@context': [], type: 'X' });
            assert.isFalse(result.ok);
        });
    });

    describe('verifySchema', function () {
        it('throws when credentialSubject is missing', async function () {
            const vcjs = makeVcjs();
            await assertRejects(() => vcjs.verifySchema({}), /credentialSubject/);
        });

        it('reads from toJsonTree when available', async function () {
            const vcjs = makeVcjs();
            const vcLike = { toJsonTree: () => ({ credentialSubject: null }) };
            await assertRejects(() => vcjs.verifySchema(vcLike), /credentialSubject/);
        });

        it('throws when no schema loader is configured', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.verifySchema({ credentialSubject: { '@context': [], type: 'X' } }),
                /Schema Loader not found/
            );
        });

        it('throws when the loader resolves no schema', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => null;
            await assertRejects(
                () => vcjs.verifySchema({ credentialSubject: { '@context': [], type: 'X' } }),
                /Schema not found/
            );
        });

        it('compiles the resolved schema and returns a CheckResult', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
                $defs: {}
            });
            const result = await vcjs.verifySchema({
                credentialSubject: { '@context': [], type: 'X', name: 'alice' }
            });
            assert.property(result, 'ok');
        });

        it('uses the first subject when credentialSubject is an array', async function () {
            const vcjs = makeVcjs();
            vcjs.schemaLoader = async () => ({
                type: 'object',
                properties: { name: { type: 'string' } },
                $defs: {}
            });
            const result = await vcjs.verifySchema({
                credentialSubject: [{ '@context': [], type: 'X', name: 'alice' }]
            });
            assert.property(result, 'ok');
        });
    });

    describe('verifyVC', function () {
        it('delegates to the configured loader when none supplied', async function () {
            const vcjs = makeVcjs();
            let usedLoader;
            vcjs.loader = 'configured-loader';
            vcjs.verify = async (json, loader) => { usedLoader = loader; return true; };
            const res = await vcjs.verifyVC({ proof: {} });
            assert.isTrue(res);
            assert.equal(usedLoader, 'configured-loader');
        });

        it('uses an explicit loader and reads toJsonTree', async function () {
            const vcjs = makeVcjs();
            let usedLoader; let usedJson;
            vcjs.verify = async (json, loader) => { usedLoader = loader; usedJson = json; return true; };
            const res = await vcjs.verifyVC({ toJsonTree: () => ({ proof: {}, tree: 1 }) }, 'explicit');
            assert.isTrue(res);
            assert.equal(usedLoader, 'explicit');
            assert.deepEqual(usedJson, { proof: {}, tree: 1 });
        });
    });

    describe('createSuiteByMethod error branches', function () {
        function fakeDid(methodsByType) {
            return {
                getMethodByType(type) { return methodsByType[type] || null; },
                getDid() { return 'did:example:1'; }
            };
        }

        it('throws when no Ed25519 method exists (default branch)', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.createSuiteByMethod(fakeDid({}), SignatureType.Ed25519Signature2018),
                /Verification method not found/
            );
        });

        it('throws when Ed25519 method has no private key', async function () {
            const vcjs = makeVcjs();
            const did = fakeDid({ Ed25519VerificationKey2018: { hasPrivateKey: () => false } });
            await assertRejects(
                () => vcjs.createSuiteByMethod(did, SignatureType.Ed25519Signature2018),
                /Private key not found/
            );
        });

        it('throws when no BBS method exists', async function () {
            const vcjs = makeVcjs();
            await assertRejects(
                () => vcjs.createSuiteByMethod(fakeDid({}), SignatureType.BbsBlsSignature2020),
                /Verification method not found/
            );
        });

        it('throws when BBS method has no private key', async function () {
            const vcjs = makeVcjs();
            const did = fakeDid({ Bls12381G2Key2020: { hasPrivateKey: () => false } });
            await assertRejects(
                () => vcjs.createSuiteByMethod(did, SignatureType.BbsBlsSignature2020),
                /Private key not found/
            );
        });
    });
});

async function assertRejects(fn, regex) {
    let threw = false;
    try {
        await fn();
    } catch (e) {
        threw = true;
        assert.match(e.message, regex);
    }
    assert.isTrue(threw, 'expected promise to reject');
}
